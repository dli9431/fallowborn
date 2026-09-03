'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'css/style.css',
  'data/actions.js',
  'js/actions.js',
  'js/events.js',
  'js/main.js',
  'js/mapview.js',
  'js/market.js',
  'js/model.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'js/ui_panels.js',
  'js/world.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('a new founder tree includes generated kin with bound-status flavor',
  async function ({ page }) {
    const family = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      FB.setPlayerTier(s, 0, { tenureFormationReason:'rank_change' });
      const parents = FB.parentsOf(s, me).map(function (c) { return c.id; });
      const siblings = FB.siblingsOf(s, me).map(function (c) { return c.id; });
      parents.concat(siblings).forEach(function (id) {
        s.chars[id].station = 0;
        s.chars[id].unfree = true;
      });
      const outsider = FB.makeCharacter(s, {
        name:'Free Lowborn', sex:'m', born:s.date.year - 30,
        culture:me.culture, religion:me.religion, station:0, traitsN:0
      });
      const flavored = [
        FB.makeCharacter(s, {
          name:'Pagan Bound', sex:'m', born:s.date.year - 30,
          culture:'norse', religion:'norse_pagan', station:0,
          unfree:true, traitsN:0
        }),
        FB.makeCharacter(s, {
          name:'Muslim Bound', sex:'m', born:s.date.year - 30,
          culture:'arabic', religion:'sunni', station:0,
          unfree:true, traitsN:0
        }),
        FB.makeCharacter(s, {
          name:'Muslim Bound Woman', sex:'f', born:s.date.year - 30,
          culture:'arabic', religion:'sunni', station:0,
          unfree:true, traitsN:0
        }),
        FB.makeCharacter(s, {
          name:'Zoroastrian Bound Woman', sex:'f', born:s.date.year - 30,
          culture:'persian', religion:'zoroastrian', station:0,
          unfree:true, traitsN:0
        })
      ];
      const statuses = parents.concat(siblings).map(function (id) {
        return FB.characterStationName(s, s.chars[id]);
      });
      FB.ui.showFamilyTree();
      return {
        me:me.id, parents:parents, siblings:siblings, statuses:statuses,
        outsiderStatus:FB.characterStationName(s, outsider),
        flavored:flavored.map(function (c) {
          return {
            name:FB.characterStationName(s, c),
            tree:FB.ui.familyTreeStatusHtml(s, c)
          };
        })
      };
    });

    expect(family.parents.length).toBeGreaterThan(0);
    expect(family.siblings.length).toBeGreaterThan(0);
    expect(family.statuses.every(function (status) {
      return status === 'Serf';
    })).toBe(true);
    expect(family.outsiderStatus).toBe('Lowborn');
    expect(family.flavored.map(function (entry) { return entry.name; }))
      .toEqual(['Thrall', 'Fellah', 'Fellaha', 'Bondwoman']);
    family.flavored.forEach(function (entry) {
      expect(entry.tree).toContain(entry.name);
    });
    const primary = page.locator('.family-tree-primary');
    await expect(primary.locator(
      '.ftchip[data-cid="' + family.me + '"]')).toHaveCount(1);
    for (const id of family.parents.concat(family.siblings)) {
      await expect(primary.locator(
        '.ftchip[data-cid="' + id + '"]')).toHaveCount(1);
    }
  });

test('family tree retains the founder\'s starting family after succession',
  async function ({ page }) {
    const family = await page.evaluate(function () {
      const s = FB.state;
      const founder = s.chars[s.player.charId];
      const parentIds = FB.parentsOf(s, founder).map(function (c) {
        return c.id;
      });
      const siblingIds = FB.siblingsOf(s, founder).map(function (c) {
        return c.id;
      });
      const childOptions = {
        name:'Second Head', sex:'f', born:s.date.year - 20,
        culture:founder.culture, religion:founder.religion,
        dyn:founder.dyn, traitsN:0
      };
      childOptions[founder.sex === 'f' ? 'motherId' : 'fatherId'] = founder.id;
      const child = FB.makeCharacter(s, childOptions);
      founder.childrenIds.push(child.id);
      FB.touchFamily();
      const succeeded = FB.game.succeedTo(child.id, { livingAbdication:true });
      FB.ui.showFamilyTree();
      return {
        succeeded:succeeded, childId:child.id,
        parentIds:parentIds, siblingIds:siblingIds
      };
    });

    expect(family.succeeded).toBe(true);
    expect(family.parentIds.length).toBeGreaterThan(0);
    expect(family.siblingIds.length).toBeGreaterThan(0);
    const primary = page.locator('.family-tree-primary');
    await expect(primary.locator(
      '.ftchip[data-cid="' + family.childId + '"]')).toHaveCount(1);
    for (const id of family.parentIds.concat(family.siblingIds)) {
      await expect(primary.locator(
        '.ftchip[data-cid="' + id + '"]')).toHaveCount(1);
    }
  });

test('family tree joins both parental families beneath one root',
  async function ({ page }) {
    const family = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const father = s.chars[me.fatherId];
      const mother = s.chars[me.motherId];

      function addGrandparents(parent, stem) {
        const grandfather = FB.makeCharacter(s, {
          name:stem + ' Grandfather', sex:'m', born:parent.born - 27,
          culture:parent.culture, religion:parent.religion,
          dyn:parent.dyn, traitsN:0
        });
        const grandmother = FB.makeCharacter(s, {
          name:stem + ' Grandmother', sex:'f', born:parent.born - 25,
          culture:parent.culture, religion:parent.religion,
          dyn:parent.dyn, traitsN:0
        });
        grandfather.spouseId = grandmother.id;
        grandmother.spouseId = grandfather.id;
        parent.fatherId = grandfather.id;
        parent.motherId = grandmother.id;
        grandfather.childrenIds.push(parent.id);
        grandmother.childrenIds.push(parent.id);
        const collateral = FB.makeCharacter(s, {
          name:stem + ' Collateral', sex:'f', born:parent.born + 2,
          culture:parent.culture, religion:parent.religion,
          dyn:parent.dyn, fatherId:grandfather.id,
          motherId:grandmother.id, traitsN:0
        });
        grandfather.childrenIds.push(collateral.id);
        grandmother.childrenIds.push(collateral.id);
        return {
          grandfatherId:grandfather.id,
          grandmotherId:grandmother.id,
          collateralId:collateral.id
        };
      }

      const paternal = addGrandparents(father, 'Paternal');
      const maternal = addGrandparents(mother, 'Maternal');
      FB.touchFamily();
      FB.ui.showFamilyTree();
      return {
        meId:me.id,
        fatherId:father.id,
        motherId:mother.id,
        paternal:paternal,
        maternal:maternal
      };
    });

    const canvas = page.locator('.family-tree-primary');
    await expect(page.locator('#gm-body .ftwrap')).toHaveCount(1);
    await expect(page.locator('#gm-body .fttree')).toHaveCount(1);
    await expect(canvas.locator(
      ':scope > .fttree > [data-family-tree-root]')).toHaveCount(1);
    await expect(canvas.locator(
      ':scope > .fttree > .ftnode:not([data-family-tree-root])')).toHaveCount(0);
    await expect(canvas.locator(
      '[data-family-tree-root] > .family-tree-branches > .ftnode')).toHaveCount(2);
    await expect(page.locator('#gm-body')).not.toContainText('Your mother’s kin');
    const ids = [family.meId, family.fatherId, family.motherId,
      family.paternal.grandfatherId, family.paternal.grandmotherId,
      family.paternal.collateralId, family.maternal.grandfatherId,
      family.maternal.grandmotherId, family.maternal.collateralId];
    for (const id of ids) {
      await expect(canvas.locator('.ftchip[data-cid="' + id + '"]'))
        .toHaveCount(id === family.motherId ? 2 : 1);
    }
  });

test('semantic shortcuts reject conflicts, explain blocks, persist, and follow promotion',
  async function ({ page }) {
    await page.evaluate(function () { FB.ui.showShortcutSettings(); });
    const rows = page.locator('[data-shortcut-row]');
    await expect(rows).toHaveCount(1);
    await expect(rows.first().locator('[data-shortcut-key]')).toHaveValue('q');
    await expect(rows.first().locator('[data-shortcut-target]'))
      .toHaveValue('action:livelihoods');
    await expect(page.locator('#shortcut-reset')).toBeVisible();
    await expect(page.locator('#gm-body')).toContainText(
      'Panel navigation reserves T, G, B, Y, N, and U');
    const offeredKeys = await rows.first().locator(
      '[data-shortcut-key] option').evaluateAll(function (options) {
        return options.map(function (option) { return option.value; });
      });
    expect(offeredKeys).toEqual(
      ['', 'a', 'i', 'j', 'o', 'p', 'q', 'w', 'x', 'z']);

    await page.locator('#shortcut-add').click();
    await rows.nth(1).locator('[data-shortcut-key]').selectOption('q');
    await rows.nth(1).locator('[data-shortcut-target]')
      .selectOption('focus-family:farmer-work');
    await expect(page.locator('#shortcut-conflict')).toContainText(
      'Q is assigned more than once');
    await expect(page.locator('#shortcut-save')).toBeDisabled();

    await rows.nth(1).locator('[data-shortcut-key]').selectOption('w');
    await expect(page.locator('#shortcut-conflict')).toBeHidden();
    await page.locator('#shortcut-add').click();
    await rows.nth(2).locator('[data-shortcut-key]').selectOption('a');
    await rows.nth(2).locator('[data-shortcut-target]')
      .selectOption('action:declare_war');
    await expect(rows.nth(2).locator('[data-shortcut-status]')).toContainText(
      'Reserved but unavailable');
    await page.locator('#shortcut-save').click();
    await expect(page.getByRole('heading', { name:'Settings', exact:true }))
      .toBeVisible();

    await page.evaluate(function () {
      FB.ui.closeModal();
      FB.state.player.tier = 0;
      FB.state.player.focus = 'rest';
      FB.ui.showTab('prov');
    });
    /* Semantic bindings are global outside Deeds; that tab deliberately owns
       W as its second positional item. Close Settings and exercise the
       binding from Land, where the semantic shortcut contract applies. */
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await page.keyboard.press('w');
    expect(await page.evaluate(function () { return FB.state.player.focus; }))
      .toBe('toil');
    await page.evaluate(function () {
      FB.state.player.tier = 1;
      FB.state.player.profession = 'farmer';
      FB.state.player.focus = 'rest';
    });
    await page.keyboard.press('w');
    expect(await page.evaluate(function () { return FB.state.player.focus; }))
      .toBe('work_land');
    await page.keyboard.press('a');
    await expect(page.locator('#toasts .toast').last()).toContainText(
      'not available in your current role or situation');

    await page.reload({ waitUntil:'domcontentloaded' });
    await expect.poll(function () {
      return page.evaluate(function () {
        return window.FB && FB.game && FB.game.uiPrefs &&
          FB.game.uiPrefs.actionBindings.w;
      });
    }).toBe('focus-family:farmer-work');
  });

test('family tree highlights and connects founders, opens on you, pans, previews, and returns',
  async function ({ page }) {
    const family = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const oldParentIds = [me.fatherId, me.motherId];
      for (const parentId of oldParentIds) {
        const parent = parentId && s.chars[parentId];
        if (parent && parent.childrenIds) {
          parent.childrenIds = parent.childrenIds.filter(function (id) {
            return id !== me.id;
          });
        }
      }
      const sharedRoot = FB.makeCharacter(s, {
        name:'Alfhild Root', sex:'f', born:s.date.year - 185,
        culture:me.culture, religion:me.religion, dyn:me.dyn
      });
      const founder = FB.makeCharacter(s, {
        name:'Gyda Founder', sex:'f', born:s.date.year - 160,
        culture:me.culture, religion:me.religion, dyn:me.dyn,
        motherId:sharedRoot.id
      });
      const currentBranch = FB.makeCharacter(s, {
        name:'Collateral Root', sex:'f', born:s.date.year - 160,
        culture:me.culture, religion:me.religion, dyn:me.dyn,
        motherId:sharedRoot.id
      });
      sharedRoot.childrenIds.push(founder.id, currentBranch.id);
      let previous = currentBranch;
      const ancestorIds = [];
      for (let i = 0; i < 5; i++) {
        const generationOptions = {
          name:'Founder Line ' + (i + 1), sex:i === 2 ? 'm' : 'f',
          born:s.date.year - 135 + i * 25,
          culture:me.culture, religion:me.religion, dyn:me.dyn
        };
        generationOptions[previous.sex === 'm' ? 'fatherId' : 'motherId'] = previous.id;
        const generation = FB.makeCharacter(s, generationOptions);
        previous.childrenIds.push(generation.id);
        ancestorIds.push(generation.id);
        previous = generation;
      }
      const greatGrandparent = s.chars[ancestorIds[2]];
      const greatUncle = FB.makeCharacter(s, {
        name:'Osric Greatbough', sex:'m', born:s.date.year - 60,
        culture:me.culture, religion:me.religion, dyn:me.dyn,
        fatherId:greatGrandparent.id
      });
      const removedCousin = FB.makeCharacter(s, {
        name:'Aldith Onceaway', sex:'f', born:s.date.year - 35,
        culture:me.culture, religion:me.religion, dyn:me.dyn,
        fatherId:greatUncle.id
      });
      const secondCousin = FB.makeCharacter(s, {
        name:'Wulfric Twicedrawn', sex:'m', born:s.date.year - 10,
        culture:me.culture, religion:me.religion, dyn:me.dyn,
        motherId:removedCousin.id
      });
      greatGrandparent.childrenIds.push(greatUncle.id);
      greatUncle.childrenIds.push(removedCousin.id);
      removedCousin.childrenIds.push(secondCousin.id);
      me.fatherId = null;
      me.motherId = previous.id;
      previous.childrenIds.push(me.id);
      const sibling = FB.makeCharacter(s, {
        name:'Eadric Siblingbough', sex:'m', born:s.date.year - 24,
        culture:me.culture, religion:me.religion, dyn:me.dyn,
        motherId:previous.id
      });
      const niece = FB.makeCharacter(s, {
        name:'Godgifu Niecebough', sex:'f', born:s.date.year - 16,
        culture:me.culture, religion:me.religion, dyn:me.dyn,
        fatherId:sibling.id
      });
      const greatNiece = FB.makeCharacter(s, {
        name:'Leofrun Farbranch', sex:'f', born:s.date.year - 2,
        culture:me.culture, religion:me.religion, dyn:me.dyn,
        motherId:niece.id
      });
      previous.childrenIds.push(sibling.id);
      sibling.childrenIds.push(niece.id);
      niece.childrenIds.push(greatNiece.id);
      s.player.houseFounderId = founder.id;
      const spouse = FB.makeCharacter(s, {
        name:'Edwin Treeward', sex:'m', born:s.date.year - 26,
        culture:me.culture, religion:me.religion, dyn:'Treeward'
      });
      const child = FB.makeCharacter(s, {
        name:'Beatrice Branch', sex:'f', born:s.date.year - 18,
        culture:me.culture, religion:me.religion, dyn:me.dyn,
        fatherId:spouse.id, motherId:me.id
      });
      const partner = FB.makeCharacter(s, {
        name:'Hugh Bough', sex:'m', born:s.date.year - 20,
        culture:me.culture, religion:me.religion, dyn:'Bough'
      });
      const grandchild = FB.makeCharacter(s, {
        name:'Clara Searchleaf', sex:'f', born:s.date.year - 2,
        culture:me.culture, religion:me.religion, dyn:me.dyn,
        fatherId:partner.id, motherId:child.id
      });
      const greatGrandchild = FB.makeCharacter(s, {
        name:'Matilda Longbranch', sex:'f', born:s.date.year,
        culture:me.culture, religion:me.religion, dyn:me.dyn,
        motherId:grandchild.id
      });
      me.spouseId = spouse.id;
      spouse.spouseId = me.id;
      me.childrenIds.push(child.id);
      spouse.childrenIds.push(child.id);
      child.spouseId = partner.id;
      partner.spouseId = child.id;
      child.childrenIds.push(grandchild.id);
      partner.childrenIds.push(grandchild.id);
      grandchild.childrenIds.push(greatGrandchild.id);
      for (let i = 0; i < 14; i++) {
        const extra = FB.makeCharacter(s, {
          name:'Pan Child ' + (i + 1), sex:i % 2 ? 'm' : 'f',
          born:s.date.year - 10 + (i % 3),
          culture:me.culture, religion:me.religion, dyn:me.dyn,
          fatherId:spouse.id, motherId:me.id
        });
        me.childrenIds.push(extra.id);
        spouse.childrenIds.push(extra.id);
      }
      FB.touchFamily();
      const successor = FB.heirsOf(s)[0];
      const before = JSON.stringify({
        child:[child.fatherId, child.motherId],
        grandchild:[grandchild.fatherId, grandchild.motherId]
      });
      FB.ui.showFamilyTree();
      return {
        meId:me.id, founderId:founder.id, rootId:sharedRoot.id,
        greatGrandfatherId:ancestorIds[2],
        twiceGreatGrandmotherId:ancestorIds[1],
        greatUncleId:greatUncle.id,
        removedCousinId:removedCousin.id,
        secondCousinId:secondCousin.id,
        greatNieceId:greatNiece.id,
        greatGrandchildId:greatGrandchild.id,
        successorId:successor.id,
        spouseId:spouse.id, childId:child.id,
        grandchildId:grandchild.id, before:before
      };
    });

    const desktopGeometry = await page.evaluate(function () {
      const card = document.querySelector('#genmodal .modalcard');
      const chip = document.querySelector('.ftchip[data-cid]');
      const wrap = document.querySelector('.family-tree-primary');
      const cardRect = card.getBoundingClientRect();
      return {
        modalClass:document.getElementById('genmodal').className,
        cardWidth:cardRect.width,
        cardHeight:cardRect.height,
        viewportWidth:window.innerWidth,
        viewportHeight:window.innerHeight,
        nameSize:parseFloat(getComputedStyle(chip.querySelector('.fname')).fontSize),
        relationSize:parseFloat(getComputedStyle(chip.querySelector('.frel')).fontSize),
        treeClientWidth:wrap.clientWidth,
        treeScrollWidth:wrap.scrollWidth
      };
    });
    expect(desktopGeometry.modalClass).toContain('family-tree-modal');
    await expect(page.locator('#family-tree-search')).toHaveCount(0);
    expect(desktopGeometry.cardWidth).toBeGreaterThanOrEqual(
      desktopGeometry.viewportWidth - 18);
    expect(desktopGeometry.cardHeight).toBeGreaterThanOrEqual(
      desktopGeometry.viewportHeight - 18);
    expect(desktopGeometry.nameSize).toBeGreaterThanOrEqual(15);
    expect(desktopGeometry.relationSize).toBeGreaterThanOrEqual(13);
    expect(desktopGeometry.treeScrollWidth).toBeGreaterThan(
      desktopGeometry.treeClientWidth);
    const treeInfo = page.locator(
      '#genmodal .gm-heading > .family-tree-info');
    const treeInfoTip = page.locator('#family-tree-info-tooltip');
    await expect(treeInfo).toBeVisible();
    await expect(page.locator('#gm-body')).not.toContainText(
      'Blood lines run downward');
    await treeInfo.hover();
    await expect(treeInfoTip).toBeVisible();
    await expect(treeInfoTip).toContainText(
      'Click a face to open their sheet; hover it for details.');
    expect(await treeInfoTip.evaluate(function (tip) {
      const style = getComputedStyle(tip);
      return {
        fontSize:style.fontSize,
        usesGeorgia:style.fontFamily.indexOf('Georgia') >= 0
      };
    })).toEqual({ fontSize:'14px', usesGeorgia:true });
    const primaryTree = page.locator('.family-tree-primary');
    const currentChip = primaryTree.locator(
      '.ftchip[data-cid="' + family.meId + '"]').first();
    await expect(currentChip).toBeFocused();
    await expect(currentChip).toBeInViewport();
    expect(await currentChip.evaluate(function (chip) {
      const wrap = chip.closest('.family-tree-primary').getBoundingClientRect();
      const rect = chip.getBoundingClientRect();
      return rect.left >= wrap.left && rect.right <= wrap.right &&
        rect.top >= wrap.top && rect.bottom <= wrap.bottom;
    })).toBe(true);
    const wholeTreeRoot = primaryTree.locator(
      ':scope > .fttree > [data-family-tree-root]');
    await expect(wholeTreeRoot).toHaveCount(1);
    const founderTreeRoot = wholeTreeRoot.locator(
      ':scope > .family-tree-branches > .ftnode').first();
    const founderChip = founderTreeRoot.locator(
      '.ftchip[data-cid="' + family.founderId + '"]');
    await expect(founderChip).toHaveCount(1);
    await expect(founderChip).toHaveClass(/founder/);
    expect(await founderChip.evaluate(function (chip) {
      return getComputedStyle(chip).borderTopColor;
    })).toBe('rgb(184, 115, 51)');
    await expect(founderTreeRoot.locator(
      '.ftchip[data-cid="' + family.meId + '"]')).toHaveCount(1);
    await expect(founderTreeRoot.locator(
      ':scope > .ftcouple .ftchip[data-cid="' + family.rootId + '"]'))
      .toHaveCount(1);
    await expect(primaryTree.locator(
      '.ftchip[data-cid="' + family.greatGrandfatherId + '"] .frel'))
      .toContainText('Great-grandfather');
    await expect(primaryTree.locator(
      '.ftchip[data-cid="' + family.twiceGreatGrandmotherId + '"] .frel'))
      .toContainText('2× great-grandmother');
    await expect(primaryTree.locator(
      '.ftchip[data-cid="' + family.greatUncleId + '"] .frel'))
      .toContainText('Great-uncle');
    await expect(primaryTree.locator(
      '.ftchip[data-cid="' + family.removedCousinId + '"] .frel'))
      .toContainText('First cousin once removed');
    await expect(primaryTree.locator(
      '.ftchip[data-cid="' + family.secondCousinId + '"] .frel'))
      .toContainText('Second cousin');
    await expect(primaryTree.locator(
      '.ftchip[data-cid="' + family.greatNieceId + '"] .frel'))
      .toContainText('Great-niece');
    await expect(primaryTree.locator(
      '.ftchip[data-cid="' + family.greatGrandchildId + '"] .frel'))
      .toContainText('Great-granddaughter');
    await expect(primaryTree.locator(
      '.ftchip[data-cid="' + family.founderId + '"] .frel'))
      .toContainText('House founder · 5× great-aunt');
    await expect(page.locator('#gm-body > .panelh').filter({
      hasText:'House founder'
    })).toHaveCount(0);

    const panning = await page.evaluate(function () {
      const wrap = document.querySelector('.family-tree-primary');
      wrap.scrollLeft = 100;
      const before = wrap.scrollLeft;
      wrap.dispatchEvent(new MouseEvent('mousedown', {
        bubbles:true, button:0, clientX:600, clientY:400
      }));
      document.dispatchEvent(new MouseEvent('mousemove', {
        bubbles:true, clientX:450, clientY:400
      }));
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles:true }));
      return { before:before, after:wrap.scrollLeft };
    });
    expect(panning.after).toBeGreaterThan(panning.before + 100);

    const branch = page.locator('[data-ft-toggle="' + family.meId + '"]');
    await branch.click();
    await expect(branch).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.ftchip[data-cid="' + family.grandchildId + '"]')
      .first()).toBeHidden();

    await branch.click();
    await expect(branch).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.ftchip[data-cid="' + family.grandchildId + '"]')
      .first()).toBeVisible();

    await page.getByRole('button', { name:'Successor', exact:true }).click();
    await expect(page.locator('.ftchip[data-cid="' + family.successorId + '"]:focus'))
      .toHaveCount(1);
    await page.getByRole('button', { name:'Spouse', exact:true }).click();
    const spouseChip = page.locator(
      '.ftchip[data-cid="' + family.spouseId + '"]').first();
    await expect(spouseChip).toBeFocused();
    await page.getByRole('button', { name:'You', exact:true }).focus();
    await expect(page.locator('#tooltip')).toBeHidden();
    await spouseChip.locator('.pface').hover();
    await expect(page.locator('#tooltip')).toBeVisible();
    await expect(page.locator('#tooltip')).toContainText('Edwin Treeward');

    await spouseChip.focus();
    await spouseChip.click();
    await expect(page.locator('#gm-title')).toContainText('Edwin Treeward');
    await page.getByRole('button', { name:'Back', exact:true }).click();
    await expect(page.locator('#gm-title')).toHaveText('The Family Tree');
    await expect(page.locator('#genmodal')).toHaveClass(/family-tree-modal/);
    await expect(branch).toHaveAttribute('aria-expanded', 'true');
    await expect(spouseChip).toBeFocused();
    await page.getByRole('button', { name:'House founder', exact:true }).click();
    await expect(page.locator('.ftchip[data-cid="' + family.founderId + '"]')
      .first()).toBeFocused();

    expect(await page.evaluate(function (ids) {
      const s = FB.state;
      const child = s.chars[ids.childId];
      const grandchild = s.chars[ids.grandchildId];
      return JSON.stringify({
        child:[child.fatherId, child.motherId],
        grandchild:[grandchild.fatherId, grandchild.motherId]
      });
    }, family)).toBe(family.before);
  });

test('family tree tooltips show current family status and preserve the highest ruling title',
  async function ({ page }) {
    const family = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const child = FB.makeCharacter(s, {
        name:'Status Child', sex:'m', born:s.date.year - 1,
        culture:me.culture, religion:me.religion, dyn:me.dyn,
        fatherId:me.sex === 'm' ? me.id : null,
        motherId:me.sex === 'f' ? me.id : null,
        traits:[]
      });
      me.childrenIds.push(child.id);
      FB.setPlayerTier(s, 3, { attachLiege:false, stationFarewell:false });
      const rulingTitle = FB.renderTitleSnapshot(me.highestTitleData);
      FB.setPlayerTier(s, 2, { attachLiege:false, stationFarewell:false });
      const currentStatus = FB.renderTitleSnapshot(
        FB.characterRankTitleSnapshot(s, me, 2, ''));
      const childStatus = FB.characterStationName(s, child);
      FB.ui.showFamilyTree();
      return {
        meId:me.id,
        childId:child.id,
        currentStatus:currentStatus,
        childStatus:childStatus,
        rulingTitle:rulingTitle,
        province:FB.world.byId[s.player.provinceId].name
      };
    });

    const playerChip = page.locator('.family-tree-primary .ftchip[data-cid="' +
      family.meId + '"]').first();
    await playerChip.locator('.pface').hover();
    await expect(page.locator('#tooltip [data-family-tree-status]'))
      .toContainText('Status: ' + family.currentStatus);
    await expect(page.locator('#tooltip [data-family-tree-highest-title]'))
      .toContainText('Highest title achieved: ' + family.rulingTitle);
    expect(family.rulingTitle).toContain(family.province);

    await page.getByRole('button', { name:'You', exact:true }).focus();
    await expect(page.locator('#tooltip')).toBeHidden();
    const childChip = page.locator('.family-tree-primary .ftchip[data-cid="' +
      family.childId + '"]').first();
    await childChip.locator('.pface').hover();
    await expect(page.locator('#tooltip [data-family-tree-status]'))
      .toContainText('Status: ' + family.childStatus);
    await expect(page.locator('#tooltip [data-family-tree-highest-title]'))
      .toHaveCount(0);
  });

test.describe('mobile-sized family tree', function () {
  test.use({ viewport:{ width:390, height:740 }, hasTouch:false });

  test('opens on the current player', async function ({ page }) {
    const family = await page.evaluate(function () {
      const s = FB.state;
      const id = s.player.charId;
      const me = s.chars[id];
      for (const parentId of [me.fatherId, me.motherId]) {
        const parent = parentId && s.chars[parentId];
        if (parent && parent.childrenIds) {
          parent.childrenIds = parent.childrenIds.filter(function (childId) {
            return childId !== me.id;
          });
        }
      }
      let previous = FB.makeCharacter(s, {
        name:'Mobile Founder', sex:'f', born:s.date.year - 160,
        culture:me.culture, religion:me.religion, dyn:me.dyn
      });
      s.player.houseFounderId = previous.id;
      for (let i = 0; i < 5; i++) {
        const generation = FB.makeCharacter(s, {
          name:'Mobile Generation ' + (i + 1), sex:'f',
          born:s.date.year - 135 + i * 25,
          culture:me.culture, religion:me.religion, dyn:me.dyn,
          motherId:previous.id
        });
        previous.childrenIds.push(generation.id);
        previous = generation;
      }
      for (let i = 0; i < 10; i++) {
        const sibling = FB.makeCharacter(s, {
          name:'Mobile Branch ' + (i + 1), sex:i % 2 ? 'm' : 'f',
          born:me.born - 20 + i,
          culture:me.culture, religion:me.religion, dyn:me.dyn,
          motherId:previous.id
        });
        previous.childrenIds.push(sibling.id);
      }
      me.fatherId = null;
      me.motherId = previous.id;
      previous.childrenIds.push(me.id);
      FB.touchFamily();
      return { meId:id, founderId:s.player.houseFounderId };
    });
    await page.locator('#tb-portrait').click();
    await page.locator('#lefttabs .tab[data-tab="family"]').click();
    await page.locator('#btn-ftree').click();
    const meChip = page.locator('.family-tree-primary .ftchip[data-cid="' +
      family.meId + '"]').first();
    await expect(meChip).toBeFocused();
    await expect(meChip).toBeInViewport();
    await expect(page.locator('.family-tree-primary .ftchip[data-cid="' +
      family.founderId + '"] .frel').first()).toContainText(
      'House founder · 4× great-grandmother');
    const founderChip = page.locator('.family-tree-primary .ftchip[data-cid="' +
      family.founderId + '"]').first();
    await expect(founderChip).toHaveClass(/founder/);
    expect(await founderChip.evaluate(function (chip) {
      return getComputedStyle(chip).borderTopColor;
    })).toBe('rgb(184, 115, 51)');
    const opening = await meChip.evaluate(function (chip) {
      const wrapNode = chip.closest('.family-tree-primary');
      const wrap = wrapNode.getBoundingClientRect();
      const rect = chip.getBoundingClientRect();
      return {
        fullyVisible:rect.left >= wrap.left && rect.right <= wrap.right &&
          rect.top >= wrap.top && rect.bottom <= wrap.bottom,
        movedFromOrigin:wrapNode.scrollLeft > 0 || wrapNode.scrollTop > 0 ||
          document.getElementById('gm-body').scrollTop > 0
      };
    });
    expect(opening.fullyVisible).toBe(true);
    expect(opening.movedFromOrigin).toBe(true);
    const treeInfo = page.locator(
      '#genmodal .gm-heading > .family-tree-info');
    const treeInfoTip = page.locator('#family-tree-info-tooltip');
    await expect(treeInfo).toBeVisible();
    await expect(page.locator('#gm-body')).not.toContainText(
      'Blood lines run downward');
    await treeInfo.click();
    await expect(treeInfoTip).toBeVisible();
    await expect(treeInfoTip).toContainText(
      'Tap a face to open their sheet.');
  });
});

test('war catalogue searches and filters semantic available and blocked causes',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      let home = null, neighbors = [];
      for (const province of FB.world.provs) {
        if (province.wasteland) continue;
        const candidates = Object.keys(FB.world.adj[province.id] || {}).filter(
          function (id) {
            return FB.world.byId[id] && !FB.world.byId[id].wasteland;
          });
        if (candidates.length >= 2) {
          home = province;
          neighbors = candidates.slice(0, 2);
          break;
        }
      }
      function makeRealm(id, name, rank, capital, rulerName) {
        s.realms[id] = {
          id:id, name:name, color:'#784336', capital:capital,
          aggression:0, rank:rank, liege:null, alive:true, favor:0,
          religion:me.religion,
          ruler:{
            name:rulerName, sex:'m', culture:me.culture, age:42,
            mar:7, trait:'ambitious', generation:1
          }
        };
        s.owner[capital] = id;
        s.holder[capital] = id;
        s.dev[capital] = 7;
      }
      p.tier = 4;
      p.liege = null;
      p.provinceId = home.id;
      p.provs = [home.id];
      p.war = null;
      p.greatHolyWar = null;
      s.greatHolyWar = null;
      s.owner[home.id] = 'player';
      s.holder[home.id] = 'player';
      FB.foundPlayerRealm(s);
      s.realms.player.rank = 1;
      s.realms.player.capital = home.id;
      makeRealm('catalogue_claim', 'Amber March', 1, neighbors[0],
        'Osric Amberlord');
      makeRealm('catalogue_blocked', 'Zinc Crown', 2, neighbors[1],
        'Wulfric Zincward');
      p.fabricatedClaim = { pid:neighbors[0], madeTurn:s.turn };
      s.pacts = {};
      s.pacts.catalogue_blocked = s.turn + 180;
      s.alliances = [];
      FB.invalidateRealmCache();
      FB.ui.showWarTargets();
      return {
        claimTarget:neighbors[0], blockedTarget:neighbors[1]
      };
    });

    const claim = page.locator('[data-war-cause-target="' +
      setup.claimTarget + '"]');
    const blocked = page.locator('[data-war-cause-target="' +
      setup.blockedTarget + '"]');
    await expect(claim).not.toContainText('Osric Amberlord');
    await claim.hover();
    await expect(page.locator('#tooltip')).toContainText('Osric Amberlord');
    await expect(blocked).toBeDisabled();
    await expect(blocked).toContainText('peace pact');

    const basisSelect = page.locator('#war-target-basis');
    await expect(basisSelect.locator('..')).toHaveClass(/war-target-select-wrap/);
    const dropdownStyle = await basisSelect.evaluate(function (select) {
      const option = select.options[0];
      return {
        appearance:getComputedStyle(select).appearance,
        backgroundImage:getComputedStyle(select).backgroundImage,
        colorScheme:getComputedStyle(select).colorScheme,
        optionBackground:getComputedStyle(option).backgroundColor
      };
    });
    expect(dropdownStyle.appearance).toBe('none');
    expect(dropdownStyle.backgroundImage).toContain('linear-gradient');
    expect(dropdownStyle.colorScheme).toBe('dark');
    expect(dropdownStyle.optionBackground).toBe('rgb(42, 34, 24)');

    await page.locator('#war-target-sort').selectOption('territory');
    const territoryOrder = await page.locator(
      '#war-target-list [data-war-cause]:visible').evaluateAll(function (nodes) {
        return nodes.map(function (node) {
          return FB.world.byId[node.dataset.warCauseTarget].name;
        });
      });
    const sortedTerritories = await page.evaluate(function (names) {
      return names.slice().sort(function (a, b) { return a.localeCompare(b); });
    }, territoryOrder);
    expect(territoryOrder).toEqual(sortedTerritories);

    await page.locator('#war-target-search').fill('Osric Amberlord');
    await expect(claim).toBeVisible();
    await expect(blocked).toBeHidden();
    await page.locator('#war-target-search').fill('');
    await page.locator('#war-target-basis').selectOption('claim');
    await expect(claim).toBeVisible();
    await expect(blocked).toBeHidden();
    await page.locator('#war-target-basis').selectOption('all');
    await page.locator('#war-target-diplomacy').selectOption('blocked');
    await expect(blocked).toBeVisible();
    await expect(blocked.locator('.keyhint')).toHaveText('1');
    await page.locator('#war-target-rank').selectOption('higher');
    await expect(blocked).toBeVisible();
  });

test('enterprise groups and sorts persist and share their order with Household Plan',
  async function ({ page }) {
    const fixture = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      const workers = [];
      function worker(name, profession, guildRank) {
        const c = FB.makeCharacter(s, {
          name:name, sex:'m', born:s.date.year - 24,
          culture:me.culture, religion:me.religion, dyn:me.dyn,
          fatherId:me.id
        });
        me.childrenIds.push(c.id);
        c.career = {
          profession:profession, rank:'journeyman', experience:4,
          startedYear:s.date.year - 4, guildRank:guildRank || 'none',
          guildStanding:guildRank ? 40 : 0, chosen:true
        };
        workers.push(c);
        return c;
      }
      const farmer = worker('Farmer Sorter', 'farmer');
      const crafter = worker('Craft Sorter', 'craftsman', 'member');
      const merchant = worker('Trade Sorter', 'merchant', 'member');
      p.enterpriseMigration = 1;
      p.enterprises = [
        {
          uid:'enterprise_trade_sort', type:'trade_house_business',
          provinceId:p.provinceId, settlement:2, workerId:merchant.id
        },
        {
          uid:'enterprise_farm_sort', type:'field_strip',
          provinceId:p.provinceId, settlement:0, workerId:null
        },
        {
          uid:'enterprise_craft_sort', type:'workshop_business',
          provinceId:p.provinceId, settlement:1, workerId:crafter.id
        }
      ];
      FB.touchFamily();
      FB.enterpriseList(s);
      const before = JSON.stringify(s);
      FB.ui.showLivelihoods();
      return { before:before };
    });
    await waitForUiRefresh(page);

    const group = page.locator('[data-enterprise-group]');
    const workGuide = page.locator('#genmodal .gm-heading > #work-guide');
    await expect(workGuide).toHaveClass(/modal-guide-button/);
    await expect(workGuide).toHaveText('i');
    await expect(workGuide).toHaveAttribute(
      'aria-label', 'Guide: work and family scope');
    await expect(page.locator('#genmodal .gm-footer #work-guide')).toHaveCount(0);
    const guideChrome = await workGuide.evaluate(function (button) {
      const title = document.getElementById('gm-title').getBoundingClientRect();
      const icon = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      return {
        alignItems:style.alignItems,
        border:style.borderTopWidth,
        centerOffset:Math.abs((icon.top + icon.height / 2) -
          (title.top + title.height / 2)),
        display:style.display,
        justifyContent:style.justifyContent,
        titleAlignItems:getComputedStyle(document.getElementById('gm-title')).alignItems,
        titleDisplay:getComputedStyle(document.getElementById('gm-title')).display,
        titleTransform:getComputedStyle(document.getElementById('gm-title')).transform,
        titleMarginBottom:getComputedStyle(document.getElementById('gm-title')).marginBottom,
        titleRowMarginBottom:getComputedStyle(document.querySelector('.gm-heading')).marginBottom
      };
    });
    expect(guideChrome.border).toBe('1px');
    expect(guideChrome.centerOffset).toBeLessThanOrEqual(2);
    expect(guideChrome.display).toBe('inline-flex');
    expect(guideChrome.alignItems).toBe('center');
    expect(guideChrome.justifyContent).toBe('center');
    expect(guideChrome.titleDisplay).toBe('flex');
    expect(guideChrome.titleAlignItems).toBe('center');
    expect(guideChrome.titleTransform).toBe('matrix(1, 0, 0, 1, 0, 2)');
    expect(guideChrome.titleMarginBottom).toBe('0px');
    expect(guideChrome.titleRowMarginBottom).toBe('10px');
    const filtersToggle = page.locator(
      '#genmodal [data-list-toggle="filters"]');
    await expect(filtersToggle).toHaveAttribute('aria-expanded', 'false');
    await filtersToggle.click();
    await expect(filtersToggle).toHaveAttribute('aria-expanded', 'true');
    const dropdowns = page.locator(
      '[data-enterprise-view-controls="work"] .enterprise-view-select');
    await expect(dropdowns).toHaveCount(2);
    const dropdownStyles = await dropdowns.evaluateAll(function (nodes) {
      return nodes.map(function (wrapper) {
        const select = wrapper.querySelector('select');
        const style = getComputedStyle(select);
        return {
          arrow:getComputedStyle(wrapper, '::after').content,
          background:style.backgroundImage,
          borderColor:style.borderTopColor,
          borderRadius:style.borderTopLeftRadius,
          height:Math.round(select.getBoundingClientRect().height),
          paddingRight:style.paddingRight
        };
      });
    });
    expect(dropdownStyles).toEqual([
      {
        arrow:'"▾"',
        background:'linear-gradient(rgb(59, 48, 32), rgb(42, 34, 24))',
        borderColor:'rgb(138, 110, 52)',
        borderRadius:'6px',
        height:42,
        paddingRight:'34px'
      },
      {
        arrow:'"▾"',
        background:'linear-gradient(rgb(59, 48, 32), rgb(42, 34, 24))',
        borderColor:'rgb(138, 110, 52)',
        borderRadius:'6px',
        height:42,
        paddingRight:'34px'
      }
    ]);
    await group.selectOption('category');
    await expect(page.locator(
      '[data-list-section="family-enterprises-category-farmer"]')).toBeVisible();
    await expect(page.locator(
      '[data-list-section="family-enterprises-category-craftsman"]')).toBeVisible();
    await expect(page.locator(
      '[data-list-section="family-enterprises-category-merchant"]')).toBeVisible();

    await page.locator('[data-enterprise-group]').selectOption('settlement');
    await expect(page.locator(
      '[data-list-section^="family-enterprises-settlement-"]')).toHaveCount(3);

    await page.locator('[data-enterprise-group]').selectOption('none');
    await page.locator('[data-enterprise-sort]').selectOption('value');
    const order = await page.locator(
      '[data-list-section="family-enterprises"] [data-enterprise]')
      .evaluateAll(function (nodes) {
        return nodes.map(function (node) { return node.dataset.enterprise; });
      });
    expect(order).toEqual([
      'enterprise_trade_sort', 'enterprise_craft_sort', 'enterprise_farm_sort'
    ]);

    await page.locator('[data-enterprise="enterprise_craft_sort"]').click();
    await page.locator('#gm-cancel').click();
    await waitForUiRefresh(page);
    await expect(page.locator('[data-enterprise-sort]')).toHaveValue('value');
    expect(await page.evaluate(function () { return JSON.stringify(FB.state); }))
      .toBe(fixture.before);

    await page.evaluate(function () { FB.ui.showHouseholdPlan(); });
    await waitForUiRefresh(page);
    await expect(page.locator('[data-enterprise-view-controls="household"] ' +
      '[data-enterprise-sort]')).toHaveValue('value');
    await page.locator('[data-enterprise-view-controls="household"] ' +
      '[data-enterprise-sort]').selectOption('yield');
    await expect(page.locator('[data-enterprise-view-controls="household"] ' +
      '[data-enterprise-sort]')).toHaveValue('yield');
    await page.evaluate(function () { FB.ui.showLivelihoods(null, true); });
    await waitForUiRefresh(page);
    await expect(page.locator('[data-enterprise-view-controls="work"] ' +
      '[data-enterprise-sort]')).toHaveValue('yield');
  });
