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
    await page.getByRole('button',{name:'Back to equipment',exact:true}).click();
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
