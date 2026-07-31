'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame
} = require('../support/game');

test('runtime mods merge definitions and the complete technology configuration',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);

    expect(await page.evaluate(function () {
      const eventId = FBDATA.events[0].id;
      const oldEvent = FBDATA.events[0];
      const oldEnterpriseFloor = FBDATA.techCaps.costFloor.enterprise;
      const oldLevyCap = FBDATA.techCaps.units.levy;
      const replacementEvent = {
        id:eventId,
        title:'Mod replacement event',
        trigger:{ never:true },
        options:[]
      };
      const addedEvent = {
        id:'e2e_mod_event',
        title:'Mod-added event',
        trigger:{ never:true },
        options:[]
      };
      const customDomain = {
        name:'Experimental arts',
        icon:'⚗',
        order:-1
      };
      const customTradition = {
        name:'Workshop exchange',
        cultures:[],
        religions:[]
      };
      const customTech = {
        name:'Experimental gearing',
        icon:'⚙',
        domain:'experimental',
        cost:40,
        req:[],
        reqAny:[],
        history:{
          attested:[800,850],
          adoption:{
            default:[850,950],
            workshop_exchange:[825,900]
          }
        },
        desc:'A mod-authored technology in a mod-authored domain.',
        confidence:'modded',
        sources:['MOD'],
        unlocks:['practice:experimental_gearing'],
        fx:{ movement:0.01 }
      };

      FB.mods.apply({
        events:[replacementEvent,addedEvent],
        techDomains:{ experimental:customDomain },
        techTraditions:{ workshop_exchange:customTradition },
        tech:{ experimental_gearing:customTech },
        techCaps:{
          movement:0.5,
          costFloor:{ build:0.45 },
          units:{ arch:333 }
        },
        defaultBookmark:'1066'
      });

      const errors = FB.validateTechnologyData();
      FB.mods.apply({ techCaps:{ movement:'fast' } });
      const invalidCapErrors = FB.validateTechnologyData();
      return {
        eventReplaced:FBDATA.events[0] === replacementEvent &&
          FBDATA.events[0] !== oldEvent,
        eventAdded:FBDATA.events.some(function (event) {
          return event.id === addedEvent.id;
        }),
        domainAdded:FBDATA.techDomains.experimental === customDomain,
        traditionAdded:FBDATA.techTraditions.workshop_exchange === customTradition,
        techAdded:FBDATA.tech.experimental_gearing === customTech,
        domainLabel:FB.dataText(null, null, 'techDomain', 'experimental',
          customDomain, 'name', {}),
        traditionLabel:FB.dataText(null, null, 'techTradition',
          'workshop_exchange', customTradition, 'name', {}),
        capsMerged:FBDATA.techCaps.movement === 0.5 &&
          FBDATA.techCaps.costFloor.build === 0.45 &&
          FBDATA.techCaps.costFloor.enterprise === oldEnterpriseFloor &&
          FBDATA.techCaps.units.arch === 333 &&
          FBDATA.techCaps.units.levy === oldLevyCap,
        defaultBookmark:FBDATA.defaultBookmark,
        validationErrors:errors,
        invalidCapRejected:invalidCapErrors.indexOf(
          'Technology cap movement must be a non-negative number.') >= 0
      };
    })).toEqual({
      eventReplaced:true,
      eventAdded:true,
      domainAdded:true,
      traditionAdded:true,
      techAdded:true,
      domainLabel:'Experimental arts',
      traditionLabel:'Workshop exchange',
      capsMerged:true,
      defaultBookmark:'1066',
      validationErrors:[],
      invalidCapRejected:true
    });
  });

test('a stored mod can select the default bookmark before world generation',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'Origin-backed localStorage is required for the reload contract.');

    await page.addInitScript(function () {
      const mod = JSON.stringify({
        name:'E2E default bookmark',
        defaultBookmark:'1066'
      });
      localStorage.setItem('fb_mods', JSON.stringify([mod]));
    });
    await openGame(page, testInfo);

    expect(await page.evaluate(function () {
      return {
        configured:FBDATA.defaultBookmark,
        active:FB.activeBookmarkId,
        count:FB.mods.count()
      };
    })).toEqual({
      configured:'1066',
      active:'1066',
      count:1
    });
  });

test('save fingerprints stamp and refuse a life from another mod set',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'Origin-backed localStorage is required for the reload contract.');

    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const saved = await page.evaluate(function () {
      return JSON.parse(FB.save.serialize());
    });
    expect(saved.mods).toBe('');

    await page.evaluate(function () {
      const mod = JSON.stringify({
        name:'E2E signature world',
        balance:{ e2eSignatureMarker:true }
      });
      localStorage.setItem('fb_mods', JSON.stringify([mod]));
    });
    await page.reload({ waitUntil:'domcontentloaded' });
    await expect(page.locator('#title:not(.hidden)')).toBeVisible();

    expect(await page.evaluate(function (data) {
      return {
        activeSig:FB.mods.sig(),
        marker:FBDATA.balance.e2eSignatureMarker,
        mismatch:FB.save.otherWorld(data),
        loaded:FB.game.loadData(data),
        stateStayedEmpty:FB.state === null
      };
    }, saved)).toEqual({
      activeSig:expect.stringMatching(/^1-/),
      marker:true,
      mismatch:true,
      loaded:false,
      stateStayedEmpty:true
    });
  });

test('bundled mod toggles persist and apply across reloads',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'Origin-backed localStorage is required for the reload contract.');

    await page.addInitScript(function () {
      window.FBMODS = [{
        id:'e2e-bundled',
        name:'E2E bundled mod',
        desc:'Synthetic bundled-mod contract.',
        data:{ balance:{ e2eBundledMarker:73 } }
      }];
    });
    await openGame(page, testInfo);
    expect(await page.evaluate(function () {
      return {
        enabled:FB.mods.isEnabled('e2e-bundled'),
        marker:FBDATA.balance.e2eBundledMarker || null
      };
    })).toEqual({ enabled:false, marker:null });

    await page.locator('#btn-mods').click();
    await expect(page.getByRole('heading', { name:'Mods', exact:true })).toBeVisible();
    await Promise.all([
      page.waitForNavigation({ waitUntil:'domcontentloaded' }),
      page.locator('#mod-bundled-0').click()
    ]);
    await expect(page.locator('#title:not(.hidden)')).toBeVisible();
    expect(await page.evaluate(function () {
      return {
        enabled:FB.mods.isEnabled('e2e-bundled'),
        marker:FBDATA.balance.e2eBundledMarker,
        count:FB.mods.count()
      };
    })).toEqual({ enabled:true, marker:73, count:1 });

    await page.locator('#btn-mods').click();
    await expect(page.getByRole('heading', { name:'Mods', exact:true })).toBeVisible();
    await Promise.all([
      page.waitForNavigation({ waitUntil:'domcontentloaded' }),
      page.locator('#mod-bundled-0').click()
    ]);
    await expect(page.locator('#title:not(.hidden)')).toBeVisible();
    expect(await page.evaluate(function () {
      return {
        enabled:FB.mods.isEnabled('e2e-bundled'),
        marker:FBDATA.balance.e2eBundledMarker || null,
        count:FB.mods.count()
      };
    })).toEqual({ enabled:false, marker:null, count:0 });
  });

test('invalid mod currency falls back without discarding the rest of the mod',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'Origin-backed localStorage is required for the reload contract.');

    await openGame(page, testInfo);
    await page.evaluate(function () {
      const mod = JSON.stringify({
        name:'E2E invalid currency',
        currency:{
          id:'broken',
          label:'Broken currency',
          icon:'!',
          smallestPerGold:0,
          units:[]
        },
        balance:{ e2eCurrencyMarker:91 }
      });
      localStorage.setItem('fb_mods', JSON.stringify([mod]));
    });
    await page.reload({ waitUntil:'domcontentloaded' });
    await expect(page.locator('#title:not(.hidden)')).toBeVisible();

    expect(await page.evaluate(function () {
      return {
        invalid:FB.mods.currencyInvalid(),
        currency:FBDATA.currency.id,
        marker:FBDATA.balance.e2eCurrencyMarker
      };
    })).toEqual({
      invalid:true,
      currency:'gold',
      marker:91
    });
  });

test('legacy 1066 hiding ignores decorative rivers but catches appended straits',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);

    expect(await page.evaluate(function () {
      const originalRivers = FBDATA.rivers;
      const oldStraitCount = FBDATA.straits.length;
      const replacementRivers = [[0,0,1,1]];
      const addedStrait = ['e2e_island','e2e_mainland'];

      FB.mods.apply({ rivers:replacementRivers });
      const afterRivers = {
        replaced:FBDATA.rivers === replacementRivers &&
          FBDATA.rivers !== originalRivers,
        available:FB.mods.bookmarkAvailable('1066'),
        visible:FB.bookmarks(false).some(function (bookmark) {
          return bookmark.id === '1066';
        })
      };

      FB.mods.apply({ straits:[addedStrait] });
      return {
        afterRivers:afterRivers,
        straitAppended:FBDATA.straits.length === oldStraitCount + 1 &&
          FBDATA.straits[FBDATA.straits.length - 1] === addedStrait,
        availableAfterStrait:FB.mods.bookmarkAvailable('1066'),
        visibleAfterStrait:FB.bookmarks(false).some(function (bookmark) {
          return bookmark.id === '1066';
        }),
        retainedForSaves:FB.bookmarks(true).some(function (bookmark) {
          return bookmark.id === '1066';
        })
      };
    })).toEqual({
      afterRivers:{ replaced:true, available:true, visible:true },
      straitAppended:true,
      availableAfterStrait:false,
      visibleAfterStrait:false,
      retainedForSaves:true
    });
  });

test('a legacy world mod that supplies a complete 1066 bookmark keeps it available',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);

    expect(await page.evaluate(function () {
      const complete1066 = JSON.parse(JSON.stringify(FBDATA.bookmarks['1066']));
      FB.mods.apply({
        straits:[],
        bookmarks:{ '1066':complete1066 }
      });
      return {
        available:FB.mods.bookmarkAvailable('1066'),
        replacement:FBDATA.bookmarks['1066'] === complete1066,
        id:FBDATA.bookmarks['1066'].id
      };
    })).toEqual({
      available:true,
      replacement:true,
      id:'1066'
    });
  });
