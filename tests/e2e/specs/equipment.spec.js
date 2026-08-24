'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/items.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'js/ui_panels.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test('applies Equip Best immediately for one managed character',
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

    const desktopLayout = await page.locator('.equip-grid').evaluate(function (grid) {
      const cards = grid.querySelectorAll('.equip-slot-card');
      const area = grid.getBoundingClientRect();
      const first = cards[0].getBoundingClientRect();
      const second = cards[1].getBoundingClientRect();
      return {
        gridWidth:area.width,
        firstWidth:first.width,
        secondWidth:second.width,
        firstHeight:first.height,
        secondHeight:second.height,
        firstTop:first.top,
        secondTop:second.top
      };
    });
    expect(desktopLayout.firstWidth).toBeGreaterThan(desktopLayout.gridWidth * 0.45);
    expect(Math.abs(desktopLayout.firstWidth - desktopLayout.secondWidth))
      .toBeLessThan(1);
    expect(Math.abs(desktopLayout.firstTop - desktopLayout.secondTop))
      .toBeLessThan(1);
    expect(Math.abs(desktopLayout.firstHeight - desktopLayout.secondHeight))
      .toBeLessThan(1);
    expect(desktopLayout.firstHeight).toBeGreaterThanOrEqual(58);

    const tooltip = page.locator('#tooltip');
    const rightHand = page.getByRole('button', {
      name:'Right hand: Plain Round Shield',
      exact:true
    });
    await expect(rightHand).toHaveAttribute('aria-describedby',
      'equipment-slot-details-' + setup.targetId + '-rightHand');
    await rightHand.hover();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Right hand');
    await expect(tooltip).toContainText('Plain Round Shield');
    await expect(tooltip).toContainText('Plain');
    await expect(tooltip).toContainText('Worth about');
    await expect(tooltip).toContainText(
      'Select this slot to choose an exact object from the family armory.');

    const headSlot = page.getByRole('button', {
      name:'Head: Empty',
      exact:true
    });
    await headSlot.hover();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Head');
    await expect(tooltip).toContainText('Empty slot.');

    await rightHand.focus();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Plain Round Shield');

    await page.setViewportSize({ width:800, height:700 });
    await page.locator('#gm-title').hover();
    await expect(tooltip).toBeHidden();
    const tabletLayout = await page.locator('.equip-grid').evaluate(function (grid) {
      const cards = grid.querySelectorAll('.equip-slot-card');
      const area = grid.getBoundingClientRect();
      const first = cards[0].getBoundingClientRect();
      const second = cards[1].getBoundingClientRect();
      return {
        gridWidth:area.width,
        firstWidth:first.width,
        secondWidth:second.width,
        firstHeight:first.height,
        secondHeight:second.height,
        firstTop:first.top,
        secondTop:second.top
      };
    });
    expect(tabletLayout.firstWidth).toBeGreaterThan(tabletLayout.gridWidth * 0.45);
    expect(Math.abs(tabletLayout.firstWidth - tabletLayout.secondWidth))
      .toBeLessThan(1);
    expect(Math.abs(tabletLayout.firstTop - tabletLayout.secondTop))
      .toBeLessThan(1);
    expect(Math.abs(tabletLayout.firstHeight - tabletLayout.secondHeight))
      .toBeLessThan(1);
    expect(tabletLayout.firstHeight).toBeGreaterThanOrEqual(58);
    expect(await page.locator('#gm-title').evaluate(function (title) {
      return getComputedStyle(title).justifyContent;
    })).toBe('center');

    const rightHandCard = rightHand.locator('xpath=../..');
    const info = rightHandCard.locator('.equip-slot-info');
    const inlineDetails = rightHandCard.locator('.equip-slot-details');
    await expect(page.locator('.equip-slot-info')).toHaveCount(8);
    await expect(info).toBeVisible();
    await expect(info).toHaveText('?');
    await expect(info).toBeEnabled();
    await expect(headSlot.locator('xpath=../..').locator('.equip-slot-info'))
      .toBeVisible();
    const infoLayout = await rightHandCard.evaluate(function (card) {
      const slot = card.querySelector('.equip-slot').getBoundingClientRect();
      const button = card.querySelector('.equip-slot-info');
      const glyph = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      return {
        width:glyph.width,
        height:glyph.height,
        centerOffset:Math.abs((glyph.top + glyph.height / 2) -
          (slot.top + slot.height / 2)),
        background:style.backgroundColor,
        border:style.borderTopColor
      };
    });
    expect(infoLayout.width).toBeGreaterThanOrEqual(44);
    expect(infoLayout.height).toBeGreaterThanOrEqual(44);
    expect(infoLayout.centerOffset).toBeLessThan(1);
    expect(infoLayout.background).toBe('rgba(0, 0, 0, 0)');
    expect(infoLayout.border).toBe('rgba(0, 0, 0, 0)');
    await expect(info).toHaveAttribute('aria-expanded', 'false');
    await expect(inlineDetails).toBeHidden();

    await rightHand.hover();
    await expect(tooltip).toBeHidden();

    await info.click();
    await expect(info).toHaveAttribute('aria-expanded', 'true');
    await expect(inlineDetails).toBeVisible();
    await expect(inlineDetails).toContainText('Right hand');
    await expect(inlineDetails).toContainText('Plain Round Shield');
    await expect(inlineDetails).toContainText('Worth about');
    const expandedOffsets = await page.locator('.equip-slot-card')
      .evaluateAll(function (cards) {
        return cards.map(function (card) {
          const slot = card.querySelector('.equip-slot').getBoundingClientRect();
          const glyph = card.querySelector('.equip-slot-info').getBoundingClientRect();
          return Math.abs((glyph.top + glyph.height / 2) -
            (slot.top + slot.height / 2));
        });
      });
    expect(Math.max.apply(Math, expandedOffsets)).toBeLessThan(1);
    expect(await page.evaluate(function () {
      return JSON.stringify(FB.state.player.loadouts);
    })).toBe(setup.before);

    await info.click();
    await expect(info).toHaveAttribute('aria-expanded', 'false');
    await expect(inlineDetails).toBeHidden();

    await page.setViewportSize({ width:390, height:740 });
    await expect(info).toBeVisible();
    await expect(headSlot.locator('xpath=../..').locator('.equip-slot-info'))
      .toBeVisible();
    const phoneLayout = await page.locator('.equip-grid').evaluate(function (grid) {
      const cards = grid.querySelectorAll('.equip-slot-card');
      const area = grid.getBoundingClientRect();
      const first = cards[0].getBoundingClientRect();
      const second = cards[1].getBoundingClientRect();
      return {
        gridWidth:area.width,
        firstWidth:first.width,
        secondWidth:second.width,
        firstHeight:first.height,
        secondHeight:second.height,
        firstTop:first.top,
        secondTop:second.top
      };
    });
    expect(phoneLayout.firstWidth).toBeGreaterThan(phoneLayout.gridWidth * 0.45);
    expect(Math.abs(phoneLayout.firstWidth - phoneLayout.secondWidth))
      .toBeLessThan(1);
    expect(Math.abs(phoneLayout.firstTop - phoneLayout.secondTop)).toBeLessThan(1);
    expect(Math.abs(phoneLayout.firstHeight - phoneLayout.secondHeight))
      .toBeLessThan(1);
    expect(phoneLayout.firstHeight).toBeGreaterThanOrEqual(58);

    await page.getByRole('button', { name:/Equip Best/ }).click();

    await expect(page.locator('#genmodal')).toHaveClass(/equipment-modal/);
    await expect(page.locator('#genmodal')).not.toHaveClass(/equip-best-modal/);
    await expect(page.locator('#equip-best-apply, .equip-best-movements'))
      .toHaveCount(0);
    await expect(page.locator('#gm-title')).toHaveText(
      setup.targetName + String.fromCharCode(10) + 'Equipment');
    const titleGeometry = await page.locator('#gm-title').evaluate(function (title) {
      const heading = title.parentNode.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(title);
      const content = range.getBoundingClientRect();
      const style = getComputedStyle(title);
      return {
        justify:style.justifyContent,
        textAlign:style.textAlign,
        centerOffset:Math.abs((content.left + content.width / 2) -
          (heading.left + heading.width / 2))
      };
    });
    expect(titleGeometry.justify).toBe('center');
    expect(titleGeometry.textAlign).toBe('center');
    expect(titleGeometry.centerOffset).toBeLessThan(2);
    await expect(page.locator('#toasts')).toContainText(
      'Best available equipment applied to ' + setup.targetName + '.');
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

test('equipment reservations freeze coupled hands and remain manually removable',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const setup = await page.evaluate(function () {
      const s = FB.state;
      const head = s.chars[s.player.charId];
      const spouse = FB.makeCharacter(s, {
        name:'Cecily',
        sex:'f',
        culture:head.culture,
        religion:head.religion,
        born:s.date.year - 24,
        dyn:head.dyn,
        role:'spouse',
        traits:[]
      });
      spouse.health = 8;
      head.spouseId = spouse.id;
      spouse.spouseId = head.id;

      const shield = FB.grantItem(s, 'round_shield', {
        quality:'plain', visualSeed:311
      });
      const seax = FB.grantItem(s, 'keen_seax', {
        quality:'plain', visualSeed:312
      });
      const sword = FB.grantItem(s, 'hero_sword');
      const ring = FB.grantItem(s, 'silver_ring', {
        quality:'plain', visualSeed:313
      });
      FB.equipItem(s, spouse.id, 'rightHand', shield);
      FB.equipItem(s, spouse.id, 'leftHand', seax);
      FB.setProtected(s, 'equipmentItem', shield, true);
      FB.setProtected(s, 'equipmentItem', sword, true);
      FB.setProtected(s, 'equipmentItem', ring, true);

      const preview = FB.equipBestPreview(s, spouse.id);
      const manualUnequip = FB.unequipItem(s, spouse.id, 'rightHand');
      const stillProtected = FB.isProtected(
        s, 'equipmentItem', shield);
      const transferred = FB.transferItem(s, ring, spouse.id);
      const transferCleared = !FB.isProtected(
        s, 'equipmentItem', ring);
      FB.ui.showItemModal(sword);
      return {
        spouseId:spouse.id,
        shield:shield,
        seax:seax,
        sword:sword,
        preview:preview,
        manualUnequip:manualUnequip,
        stillProtected:stillProtected,
        transferred:transferred,
        transferCleared:transferCleared
      };
    });

    expect(setup.preview.ok).toBe(true);
    expect(setup.preview.refs).toEqual(expect.arrayContaining([
      setup.shield,
      setup.seax
    ]));
    expect(setup.preview.refs).not.toContain(setup.sword);
    expect(setup.preview.movements).toEqual([]);
    expect(setup.manualUnequip).toBe(setup.shield);
    expect(setup.stillProtected).toBe(true);
    expect(setup.transferred).toBe(true);
    expect(setup.transferCleared).toBe(true);

    const protection = page.getByRole('checkbox', {
      name:/Protect from automatic equipment changes/
    });
    await expect(protection).toBeChecked();
    await protection.uncheck();
    expect(await page.evaluate(function (ref) {
      return FB.isProtected(FB.state, 'equipmentItem', ref);
    }, setup.sword)).toBe(false);
  });

test('barber status prices every tier and applies a persistent, day-free override',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s=FB.state,me=s.chars[s.player.charId];
      const originalTier=s.player.tier;
      const prices=[];
      for(let tier=0;tier<8;tier++){
        s.player.tier=tier;
        prices.push(FB.barberCost(s));
      }
      s.player.tier=2;
      me.sex='m';me.born=s.date.year-12;delete me.appearance;
      s.player.gold=100;
      const minorOptions=FB.barberOptions(s,me.id);
      const otherId=Object.keys(s.chars).filter(function(id){return id!==me.id;})[0];
      const other=FB.barberOptions(s,otherId);
      const invalid=FB.barberStatus(s,me.id,{hairStyle:'not-a-style'});
      const selection={hairStyle:minorOptions.current.hairStyle==='crownBraid'
        ?'bowl':'crownBraid'};
      s.player.tier=0;
      const earlierQuote=FB.barberStatus(s,me.id,selection);
      s.player.tier=2;
      s.player.travel={kind:'test'};
      const travel=FB.barberStatus(s,me.id,selection);
      delete s.player.travel;
      const eventsBusy=FB.ui.eventsBusy;
      FB.ui.eventsBusy=function(){return true;};
      const event=FB.barberStatus(s,me.id,selection);
      FB.ui.eventsBusy=eventsBusy;
      s.player.gold=0;
      const funds=FB.barberStatus(s,me.id,selection);
      s.player.gold=100;
      me.dead=true;
      const dead=FB.barberStatus(s,me.id,selection);
      me.dead=false;
      const turnBefore=s.turn,dateBefore=JSON.stringify(s.date);
      const rngBefore=JSON.stringify(FB.getRngState());
      const goldBefore=s.player.gold;
      const applied=FB.visitBarber(s,me.id,selection);
      const afterApply={
        turn:s.turn,date:JSON.stringify(s.date),rng:JSON.stringify(FB.getRngState()),
        gold:s.player.gold,appearance:JSON.parse(JSON.stringify(me.appearance))
      };
      const repeated=FB.visitBarber(s,me.id,selection);
      const goldAfterRepeat=s.player.gold;
      s.date.year+=4;
      const adultOptions=FB.barberOptions(s,me.id);
      const adultLook=FB.characterLook(me,s.date.year,s);
      const normalized=FB.barberStatus(s,me.id,{hairStyle:'crop',
        beardKind:'long',beardCut:'moustache'});
      const semantic=adultOptions.beardStyles.map(function(style){
        const status=FB.barberStatus(s,me.id,{hairStyle:'crop',
          beardFamily:style.family,beardStyle:style.id});
        return {code:status.code,family:status.selection&&status.selection.beardFamily,
          style:status.selection&&status.selection.beardStyle,
          pair:status.appearance&&status.appearance.beardKind+'|'+
            status.appearance.beardCut};
      });
      const mismatched=FB.barberStatus(s,me.id,{hairStyle:'crop',
        beardFamily:'moustache',beardStyle:'beardLong'});
      const payload=JSON.parse(FB.save.serialize());
      FB.save.restore(payload);
      const restored=FB.state.chars[FB.state.player.charId].appearance;
      return {
        prices:prices,
        originalTier:originalTier,
        minorFacialHair:minorOptions.facialHair,
        minorHairCount:minorOptions.hair.length,
        otherCode:other.code,
        invalidCode:invalid.code,
        earlierQuote:earlierQuote.cost,
        travelCode:travel.code,
        eventCode:event.code,
        fundsCode:funds.code,
        deadCode:dead.code,
        applied:applied,
        repeatedCode:repeated.code,
        repeatDidNotCharge:goldAfterRepeat===afterApply.gold,
        noDay:afterApply.turn===turnBefore&&afterApply.date===dateBefore,
        rngPure:afterApply.rng===rngBefore,
        chargedOnce:afterApply.gold===goldBefore-applied.cost,
        hairOnly:Object.keys(afterApply.appearance).length===1,
        persistsIntoAdulthood:adultLook.hairStyle===selection.hairStyle,
        adultFacialHair:adultOptions.facialHair,
        generatedBeardStillLive:adultOptions.beardOverridden===false,
        familyCount:adultOptions.beardFamilies.length,
        styleCount:adultOptions.beardStyles.length,
        moustacheCount:adultOptions.beardStyles.filter(function(style){
          return style.family==='moustache';
        }).length,
        semanticValid:semantic.every(function(entry,index){
          return entry.code!=='invalid_selection'&&
            entry.family===adultOptions.beardStyles[index].family&&
            entry.style===adultOptions.beardStyles[index].id;
        }),
        semanticUnique:new Set(semantic.map(function(entry){return entry.pair;})).size,
        mismatchedCode:mismatched.code,
        normalizedKind:normalized.selection.beardKind,
        normalizedCut:normalized.selection.beardCut,
        restored:restored
      };
    });

    expect(result.prices).toEqual([1,2,4,8,12,18,28,40]);
    expect(result.minorFacialHair).toBe(false);
    expect(result.minorHairCount).toBe(11);
    expect(result.otherCode).toBe('not_protagonist');
    expect(result.invalidCode).toBe('invalid_selection');
    expect(result.earlierQuote).toBe(1);
    expect(result.travelCode).toBe('travel');
    expect(result.eventCode).toBe('event');
    expect(result.fundsCode).toBe('insufficient_funds');
    expect(result.deadCode).toBe('dead');
    expect(result.applied).toEqual(expect.objectContaining({
      ok:true,code:'applied',cost:4
    }));
    expect(result.repeatedCode).toBe('unchanged');
    expect(result.repeatDidNotCharge).toBe(true);
    expect(result.noDay).toBe(true);
    expect(result.rngPure).toBe(true);
    expect(result.chargedOnce).toBe(true);
    expect(result.hairOnly).toBe(true);
    expect(result.persistsIntoAdulthood).toBe(true);
    expect(result.adultFacialHair).toBe(true);
    expect(result.generatedBeardStillLive).toBe(true);
    expect(result.familyCount).toBe(7);
    expect(result.styleCount).toBe(40);
    expect(result.moustacheCount).toBe(6);
    expect(result.semanticValid).toBe(true);
    expect(result.semanticUnique).toBe(40);
    expect(result.mismatchedCode).toBe('invalid_selection');
    expect(result.normalizedKind).toBe('short');
    expect(result.normalizedCut).toBe('moustache');
    expect(result.restored).toEqual(result.applied.appearance);
  });

test('the protagonist Equipment sheet previews, cancels, and pays for barbering',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const setup = await page.evaluate(function () {
      const s=FB.state,me=s.chars[s.player.charId];
      me.sex='m';me.born=s.date.year-28;delete me.appearance;
      s.player.tier=3;s.player.gold=80.75;
      FB.ui.showEquipmentModal(me.id,'close');
      return {id:me.id,gold:s.player.gold,turn:s.turn,
        rng:JSON.stringify(FB.getRngState())};
    });

    await expect(page.getByRole('button',{name:'Visit Barber…',exact:true}))
      .toBeVisible();
    await page.getByRole('button',{name:'Visit Barber…',exact:true}).click();
    await expect(page.getByRole('heading', {name:/Visit Barber for/})).toBeVisible();
    await expect(page.locator('[data-barber-hair]')).toHaveCount(11);
    await expect(page.locator('[data-barber-beard-family]')).toHaveCount(7);
    await expect(page.locator('[data-barber-beard-style]')).toHaveCount(40);
    await expect(page.locator('.barber-cycle').first()).toBeHidden();
    await expect(page.locator('#barber-quote')).toContainText('Cost: 8 gold');
    await expect(page.locator('#barber-quote')).toContainText('Current gold: 80');
    await expect(page.locator('#barber-quote')).not.toContainText('80.75');
    const desktopScroll=await page.evaluate(function () {
      const body=document.getElementById('gm-body');
      const controls=body.querySelector('.barber-controls');
      const preview=body.querySelector('.barber-preview');
      controls.style.maxHeight='120px';
      controls.scrollTop=0;
      const before=preview.getBoundingClientRect().top;
      const canScroll=controls.scrollHeight>controls.clientHeight;
      controls.scrollTop=controls.scrollHeight;
      const result={
        bodyOverflow:getComputedStyle(body).overflowY,
        controlsOverflow:getComputedStyle(controls).overflowY,
        canScroll:canScroll,
        scrolled:controls.scrollTop>0,
        portraitStable:Math.abs(preview.getBoundingClientRect().top-before)<0.5
      };
      controls.style.maxHeight='';
      controls.scrollTop=0;
      return result;
    });
    expect(desktopScroll).toEqual({
      bodyOverflow:'hidden',controlsOverflow:'auto',canScroll:true,
      scrolled:true,portraitStable:true
    });
    await page.locator('[data-barber-beard-family="moustache"]').click();
    await expect(page.locator('[data-barber-beard-style]:visible')).toHaveCount(6);
    const handlebar=page.locator(
      '[data-barber-beard-style="moustacheHandlebar"]');
    await handlebar.click();
    await expect(handlebar).toHaveAttribute('aria-pressed','true');
    const alternateId=await page.locator(
      '[data-barber-hair][aria-pressed="false"]').first()
      .getAttribute('data-barber-hair');
    const alternate=page.locator('[data-barber-hair="'+alternateId+'"]');
    await alternate.focus();
    await page.keyboard.press('Enter');
    await expect(alternate).toHaveAttribute('aria-pressed','true');
    expect(await page.evaluate(function (id) {
      return {appearance:FB.state.chars[id].appearance||null,
        gold:FB.state.player.gold};
    },setup.id)).toEqual({appearance:null,gold:setup.gold});
    await page.getByRole('button',{name:'Back',exact:true}).click();
    await expect(page.getByRole('heading',{name:/Equipment for/})).toBeVisible();
    expect(await page.evaluate(function (id) {
      return FB.state.chars[id].appearance||null;
    },setup.id)).toBeNull();

    await page.getByRole('button',{name:'Visit Barber…',exact:true}).click();
    await page.locator('[data-barber-beard-family="moustache"]').click();
    await page.locator(
      '[data-barber-beard-style="moustacheHandlebar"]').click();
    const paidChoiceId=await page.locator(
      '[data-barber-hair][aria-pressed="false"]').last()
      .getAttribute('data-barber-hair');
    const paidChoice=page.locator('[data-barber-hair="'+paidChoiceId+'"]');
    await paidChoice.focus();
    await page.keyboard.press('Space');
    await page.getByRole('button',{name:'Pay and apply',exact:true}).click();
    await expect(page.getByRole('heading',{name:/Equipment for/})).toBeVisible();
    const applied=await page.evaluate(function (setup) {
      return {appearance:FB.state.chars[setup.id].appearance,
        gold:FB.state.player.gold,turn:FB.state.turn,
        rng:JSON.stringify(FB.getRngState())};
    },setup);
    expect(applied.appearance.hairStyle).toBeTruthy();
    expect(applied.appearance.beardKind).toBe('short');
    expect(applied.appearance.beardCut).toBe('moustacheHandlebar');
    expect(applied.gold).toBe(setup.gold-8);
    expect(applied.turn).toBe(setup.turn);
    expect(applied.rng).toBe(setup.rng);

    await page.evaluate(function () {
      const s=FB.state,head=s.chars[s.player.charId];
      const spouse=FB.makeCharacter(s,{name:'Other Equipment',sex:'f',
        culture:head.culture,religion:head.religion,born:s.date.year-25,
        dyn:head.dyn,role:'spouse',traits:[]});
      spouse.health=8;head.spouseId=spouse.id;spouse.spouseId=head.id;
      FB.ui.showEquipmentModal(spouse.id,'close');
    });
    await expect(page.getByRole('button',{name:'Visit Barber…',exact:true}))
      .toHaveCount(0);
  });

test('mobile barber cycles each category while only its options pane scrolls',
  async function ({ page }, testInfo) {
    await page.setViewportSize({width:390,height:520});
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const setup=await page.evaluate(function () {
      const s=FB.state,me=s.chars[s.player.charId];
      me.sex='m';me.born=s.date.year-28;
      me.appearance={hairStyle:'crop',beardKind:'short',beardCut:'natural'};
      s.player.gold=80.75;
      FB.ui.showEquipmentModal(me.id,'close');
      return {id:me.id,gold:s.player.gold,
        appearance:JSON.parse(JSON.stringify(me.appearance))};
    });
    await page.getByRole('button',{name:'Visit Barber…',exact:true}).click();

    await expect(page.locator('.barber-cycle')).toHaveCount(3);
    await expect(page.locator('.barber-choices')).toHaveCount(3);
    await expect(page.locator('[data-barber-direction="-1"]')).toHaveCount(3);
    await expect(page.locator('[data-barber-direction="1"]')).toHaveCount(3);
    const desktopGroups=page.locator('.barber-choices');
    for(let i=0;i<await desktopGroups.count();i++){
      await expect(desktopGroups.nth(i)).toBeHidden();
    }
    const hairCurrent=page.locator('[data-barber-current="hair"]');
    const familyCurrent=page.locator('[data-barber-current="beard-family"]');
    const styleCurrent=page.locator('[data-barber-current="beard-style"]');
    const before={
      hair:await hairCurrent.textContent(),
      family:await familyCurrent.textContent(),
      style:await styleCurrent.textContent()
    };
    await page.getByRole('button',{name:'Next Hair',exact:true}).click();
    expect(await hairCurrent.textContent()).not.toBe(before.hair);
    await page.getByRole('button',{name:'Previous Hair',exact:true}).click();
    expect(await hairCurrent.textContent()).toBe(before.hair);
    await page.getByRole('button',{name:'Next Hair',exact:true}).click();
    await page.getByRole('button',{name:'Next Facial hair',exact:true}).click();
    await page.getByRole('button',{name:'Next Facial hair style',exact:true}).click();
    expect(await hairCurrent.textContent()).not.toBe(before.hair);
    expect(await familyCurrent.textContent()).not.toBe(before.family);
    expect(await styleCurrent.textContent()).not.toBe(before.style);
    await expect(page.locator('#barber-quote')).toContainText('Current gold: 80');
    await expect(page.locator('#barber-quote')).not.toContainText('80.75');

    const geometry=await page.evaluate(function () {
      const body=document.getElementById('gm-body');
      const controls=body.querySelector('.barber-controls');
      const preview=body.querySelector('.barber-preview');
      const footerButtons=body.closest('.modalcard').querySelectorAll(
        '.gm-footer .btn');
      controls.scrollTop=0;
      const previewTop=preview.getBoundingClientRect().top;
      const overflow=controls.scrollHeight>controls.clientHeight;
      controls.scrollTop=controls.scrollHeight;
      return {
        bodyOverflow:getComputedStyle(body).overflowY,
        controlsOverflow:getComputedStyle(controls).overflowY,
        overflow:overflow,
        scrolled:controls.scrollTop>0,
        portraitStable:Math.abs(preview.getBoundingClientRect().top-previewTop)<0.5,
        controlsHeight:controls.clientHeight,
        footerSingleRow:footerButtons.length===2 && Math.abs(
          footerButtons[0].getBoundingClientRect().top-
          footerButtons[1].getBoundingClientRect().top)<0.5
      };
    });
    expect(geometry).toMatchObject({
      bodyOverflow:'hidden',controlsOverflow:'auto',overflow:true,
      scrolled:true,portraitStable:true,footerSingleRow:true
    });
    expect(geometry.controlsHeight).toBeGreaterThan(0);
    expect(await page.evaluate(function (setup) {
      const s=FB.state;
      return {gold:s.player.gold,appearance:s.chars[setup.id].appearance};
    },setup)).toEqual({gold:setup.gold,appearance:setup.appearance});
    await page.evaluate(function(){history.back();});
    await expect(page.getByRole('heading',{name:/Equipment/})).toBeVisible();
  });

test('female and minor pickers hide facial hair and narrow browser Back returns safely',
  async function ({ page }, testInfo) {
    await page.setViewportSize({width:390,height:740});
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const setup=await page.evaluate(function () {
      const s=FB.state,me=s.chars[s.player.charId];
      me.sex='f';me.born=s.date.year-24;delete me.appearance;s.player.gold=50;
      FB.ui.showEquipmentModal(me.id,'close');
      return {id:me.id,gold:s.player.gold};
    });
    await page.getByRole('button',{name:'Visit Barber…',exact:true}).click();
    await expect(page.locator('[data-barber-hair]')).toHaveCount(11);
    await expect(page.locator('.barber-choices')).toHaveCount(1);
    await expect(page.locator('.barber-choices')).toBeHidden();
    await expect(page.locator('.barber-cycle')).toHaveCount(1);
    await expect(page.locator('.barber-cycle')).toBeVisible();
    await expect(page.locator('[data-barber-beard-family]')).toHaveCount(0);
    await expect(page.locator('[data-barber-beard-style]')).toHaveCount(0);
    const geometry=await page.locator('#genmodal .modalcard').evaluate(function(card){
      const rect=card.getBoundingClientRect();
      const buttons=Array.prototype.slice.call(
        card.querySelectorAll('.barber-cycle-button')).map(function(button){
          return button.getBoundingClientRect().height;
        });
      const body=document.getElementById('gm-body');
      return {left:rect.left,right:rect.right,width:window.innerWidth,
        scrollWidth:body.scrollWidth,clientWidth:body.clientWidth,
        minButton:Math.min.apply(Math,buttons),
        bodyOverflow:getComputedStyle(body).overflowY,
        controlsOverflow:getComputedStyle(
          body.querySelector('.barber-controls')).overflowY};
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.width+1);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth+1);
    expect(geometry.minButton).toBeGreaterThanOrEqual(44);
    expect(geometry.bodyOverflow).toBe('hidden');
    expect(geometry.controlsOverflow).toBe('auto');
    await page.evaluate(function(){history.back();});
    await expect(page.getByRole('heading',{name:/Equipment/})).toBeVisible();
    expect(await page.evaluate(function (setup) {
      return {appearance:FB.state.chars[setup.id].appearance||null,
        gold:FB.state.player.gold};
    },setup)).toEqual({appearance:null,gold:setup.gold});

    await page.evaluate(function (id) {
      const s=FB.state,me=s.chars[id];me.sex='m';me.born=s.date.year-13;
      FB.ui.showEquipmentModal(id,'close');
    },setup.id);
    await page.getByRole('button',{name:'Visit Barber…',exact:true}).click();
    await expect(page.locator('.barber-cycle')).toHaveCount(1);
    await expect(page.locator('[data-barber-beard-family]')).toHaveCount(0);
    await expect(page.locator('[data-barber-beard-style]')).toHaveCount(0);
    await expect(page.locator('[data-barber-cycle="beard-family"]')).toHaveCount(0);
    await expect(page.locator('[data-barber-cycle="beard-style"]')).toHaveCount(0);
  });
