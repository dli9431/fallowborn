'use strict';
const {test,expect} = require('../support/fixture');
const {openTitle,prepareGameContent,targetUrl} = require('../support/game/navigation');
const {openCrazyTitle} = require('../support/game/crazygames-title');
const {startDeterministicGame} = require('../support/game/start');
const {mockCrazyGames} = require('../support/crazygames');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const harbor = require('../fixtures/authoring/existing-person-harbor.json');
const {nativeSourceFiles} = require('../support/game/bookmark-sources-legacy');

dependsOnRuntime(__filename,['index.html','js/main.js','js/bookmark_sources.js',
  'js/bookmark_composition.js','js/mods.js','js/stories.js','js/world.js','js/save.js','js/save_v4.js','js/mapview.js','js/events.js',
  'js/ui_modals.js','js/ui_misc.js','js/i18n.js','js/crazygames.js','js/starts.js','js/balance.js',
  'js/model.js','js/government_support.js','js/mobile_guard.js','js/bookmark_setup.js','data/cultures.js','data/settlements.js',
  'data/bookmark_sources.js','data/bookmarks.js','data/starts.js'].concat(nativeSourceFiles));

async function watchPreparation(page) {
  await page.route('**/js/main.js',async function (route) {
    const response = await route.fetch();
    function watch() {
      const record = window.__menuWork = {publish:0,mods:0,stories:0,world:0,loading:false};
      window.__reviewWorlds = [];
      window.__reviewStatuses = [];
      const originalBalance = JSON.stringify(FBDATA.balance), originalTech = JSON.stringify(FBDATA.tech);
      ['reviewSource','prepareSource'].forEach(function (method) {
        const review = FB.bookmarkCompositions[method];
        FB.bookmarkCompositions[method] = function (input) {
          window.__reviewWorlds.push(input.bookmark.id);
          if (input.id !== 'native_unattached_declarations') {
            const message = document.getElementById('loadmsg').textContent;
            const frames = window.__preparationFrames;
            window.__reviewStatuses.push({correct:message === FB.T('Checking bookmark {bookmark}…',{bookmark:input.bookmark.id}),
              painted:!!frames && frames.messages.indexOf(message) >= 0});
          }
          return review.apply(this,arguments);
        };
      });
      [[FB.bookmarkCompositions,'publishPending','publish'],[FB.mods,'applyStored','mods'],
        [FB.stories,'load','stories'],[FB,'activateBookmark','world']].forEach(function (entry) {
        const original = entry[0][entry[1]];
        entry[0][entry[1]] = function () {
          record[entry[2]]++;
          if (entry[2] === 'mods') window.__setupBaselineUnchanged =
            JSON.stringify(FBDATA.balance) === originalBalance && JSON.stringify(FBDATA.tech) === originalTech;
          if (entry[2] === 'publish') {
            const screen = document.getElementById('loading');
            record.loading = !screen.classList.contains('hidden') && screen.getBoundingClientRect().height > 0;
          }
          return original.apply(this,arguments);
        };
      });
    }
    await route.fulfill({response:response,body:'(' + watch.toString() + ')();\n' + await response.text()});
  });
}

// Dates outside the eager title set load on demand. Direct setup API calls
// first load the requested date, as the picker and saved-game paths do.
async function loadBookmarkDates(page,ids) {
  await page.evaluate(function (ids) {
    return new Promise(function (resolve,reject) {
      FB.bookmarkSources.loadDates(ids,function (error) { if (error) reject(error); else resolve(); });
    });
  },ids);
}

test('initial classic scripts preserve dependency order after HTML parsing',async function ({page},info) {
  await page.addInitScript(function () {
    window.__initialScripts = [];
    document.addEventListener('load',function (event) {
      const script = event.target;
      if (script.tagName === 'SCRIPT' && script.hasAttribute('defer'))
        window.__initialScripts.push({src:script.getAttribute('src'),state:document.readyState});
    },true);
  });
  await openTitle(page,info);
  const result = await page.evaluate(function () {
    const scripts = Array.from(document.scripts).filter(function (script) {
      return /^(data|js)\//.test(script.getAttribute('src') || '') && script.getAttribute('src') !== 'js/ui_modals.js';
    });
    return {expected:scripts.map(function (script) { return script.getAttribute('src'); }),
      deferred:scripts.every(function (script) { return script.defer && !script.async; }),
      loaded:window.__initialScripts,ready:FB.game.bootReady,published:FB.bookmarkSources.hasPublished()};
  });
  expect(result.deferred).toBe(true);
  expect(result.loaded.map(function (row) { return row.src; })).toEqual(result.expected);
  expect(result.loaded.every(function (row) { return row.state !== 'loading'; })).toBe(true);
  expect(result.ready).toBe(true);
  expect(result.published).toBe(false);
});

test('a pending initial data file leaves the title parsed without enabling incomplete controls',async function ({page},info) {
  test.skip(!info.project.name.endsWith('-served'),'Controlling a pending resource requires a served origin.');
  let release;
  const pending = new Promise(function (resolve) { release = resolve; });
  await page.route('**/data/map_data.js',async function (route) {
    await pending;
    await route.continue();
  });
  try {
    await page.goto(targetUrl(info),{waitUntil:'commit'});
    await page.waitForFunction(function () { return document.readyState === 'interactive'; });
    await expect(page.locator('#title')).toBeVisible();
    await expect(page.locator('#btn-newgame')).toBeDisabled();
    expect(await page.evaluate(function () { return !!(window.FB && FB.game); })).toBe(false);
    expect(await page.locator('script[src="js/main.js"]').count()).toBe(1);
  } finally { release(); }
  await page.waitForFunction(function () { return !!(window.FB && FB.game && FB.game.bootReady); });
  expect(await page.evaluate(function () { return FB.bookmarkSources.hasPublished(); })).toBe(false);
});

async function untouched(page) {
  // Allow the former idle prewarm a rendering opportunity without a timed sleep.
  return page.evaluate(function () {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        resolve({work:window.__menuWork,ready:FB.game.contentReady,
          published:FB.bookmarkSources.hasPublished(),state:FB.state});
      }); });
    });
  });
}

async function watchPreparationFrames(page) {
  await page.evaluate(function () {
    const capture = window.__preparationFrames = {active:true,widths:[],messages:[]};
    function frame() {
      if (!capture.active) return;
      const loading = document.getElementById('loading'), bar = document.getElementById('loadbar');
      const width = parseInt(bar.style.width,10);
      if (!loading.classList.contains('hidden')) {
        const message = document.getElementById('loadmsg').textContent;
        if (capture.messages.indexOf(message) < 0) capture.messages.push(message);
        if (!FB.game.contentReady && !FB.game.campaignReady(FB.activeBookmarkId) && width > 0 && width < 100 &&
            capture.widths.indexOf(width) < 0) capture.widths.push(width);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}
async function preparationFrames(page) {
  return page.evaluate(function () {
    window.__preparationFrames.active = false;
    return {widths:window.__preparationFrames.widths,messages:window.__preparationFrames.messages};
  });
}

test('map work slices reduce timer waits without changing geometry, settlements or progress',async function ({page},info) {
  const runs = [];
  // A synthetic work clock compares several chunks per turn with a single
  // chunk per turn. This checks scheduling and output, not machine speed.
  for (const increment of [0.25,10]) {
    await openTitle(page,info);
    await loadBookmarkDates(page,['1241']);
    runs.push(await page.evaluate(function (increment) {
      FB.bookmarkSources.prepareSetup('1241');
      return new Promise(function (resolve,reject) {
        const descriptor = Object.getOwnPropertyDescriptor(performance,'now'), timeout = window.setTimeout;
        const rng = FB.getRngState(), uid = FB.getUidCounter(), progress = [];
        let clock = 0, timers = 0;
        Object.defineProperty(performance,'now',{configurable:true,value:function () { clock += increment; return clock; }});
        window.setTimeout = function () { timers++; return timeout.apply(this,arguments); };
        function restore() {
          if (descriptor) Object.defineProperty(performance,'now',descriptor);
          else delete performance.now;
          window.setTimeout = timeout;
        }
        try {
          FB.activateBookmark('1241',function (fraction) { progress.push(fraction); },function (error) {
            restore();
            if (error) { reject(error); return; }
            const world = FB.world;
            let hash = 2166136261;
            [world.grid,world.land,world.landmass].forEach(function (cells) {
              for (let i = 0; i < cells.length; i++) hash = Math.imul(hash ^ cells[i],16777619);
            });
            resolve({timers:timers,progress:progress,grid:hash,
              geography:FB.mods.fingerprint({provs:world.provs,adj:world.adj,waterAdj:world.waterAdj,landRouteUnits:world.landRouteUnits}),
              pure:rng === FB.getRngState() && uid === FB.getUidCounter()});
          });
        } catch (error) { restore(); reject(error); }
      });
    },increment));
  }
  expect(runs[0].timers).toBeGreaterThan(1);
  expect(runs[0].timers).toBeLessThan(runs[1].timers / 2);
  expect(runs[0].grid).toBe(runs[1].grid);
  expect(runs[0].geography).toBe(runs[1].geography);
  expect(runs[0].progress).toEqual(runs[1].progress);
  runs.forEach(function (run) {
    expect(run.pure).toBe(true);
    expect(run.progress[run.progress.length - 1]).toBe(1);
    expect(run.progress.every(function (fraction,i) { return !i || fraction >= run.progress[i - 1]; })).toBe(true);
  });
});

for (const crazy of [false,true]) {
  async function title(page,info) {
    if (crazy) {
      await mockCrazyGames(page);
      await page.addInitScript(function () { window.FB_DISTRIBUTION='crazygames'; window.FB_CRAZYGAMES_STORAGE='localstorage'; });
      await openCrazyTitle(page,info);
    } else await openTitle(page,info);
  }

  test('title and date browsing defer campaign checks on ' + (crazy ? 'CrazyGames' : 'standard'),async function ({page},info) {
    test.skip(!info.project.name.endsWith('-served'),'Counters require source interception.');
    await watchPreparation(page);
    await title(page,info);
    for (const button of ['#btn-settings','#btn-help','#btn-load']) {
      await page.locator(button).click();
      await expect(page.locator('#genmodal:not(.hidden)')).toBeVisible();
      await page.evaluate(function () { FB.ui.closeModal(); });
    }
    await page.locator(crazy ? '#btn-choose-beginning' : '#btn-newgame').click();
    await expect(page.locator('[data-bookmark="867"]')).toBeVisible();
    await expect(page.locator('[data-bookmark="1066"]')).toBeVisible();
    await expect(page.locator('[data-quick-start="osric_867"]')).toBeVisible();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('A-SHORT-SEED');
    await page.locator('#ng-seed').press('Enter');
    expect(await untouched(page)).toEqual({work:{publish:0,mods:0,stories:0,world:0,loading:false},
      ready:false,published:false,state:null});

    await watchPreparationFrames(page);
    await page.locator('[data-bookmark="867"]').click();
    await expect(page.locator('#newgame:not(.hidden)')).toBeVisible({timeout:30000});
    const setupFrames = await preparationFrames(page);
    expect(setupFrames.widths.length).toBeGreaterThanOrEqual(2);
    expect(setupFrames.messages).toContain('Checking bookmark 867…');
    expect(setupFrames.messages).toContain('Preparing faiths and cultures…');
    expect(await page.evaluate(function () {
      return {work:window.__menuWork,ready:FB.game.contentReady,bookmark:FB.activeBookmarkId,state:FB.state};
    })).toEqual({work:{publish:0,mods:0,stories:0,world:1,loading:false},ready:false,bookmark:'867',state:null});
    expect(await page.evaluate(function () { return window.__reviewWorlds; })).toEqual(['867']);
    expect(await page.evaluate(function () {
      const known = FB.startSelectorReport({id:'setup_probe',bookmarkIds:['476','867']},FB.activeBookmark);
      const unknown = FB.startSelectorReport({id:'setup_probe',bookmarkIds:['missing_setup_date','867']},FB.activeBookmark);
      return {known:known.valid,unknown:unknown.valid,unreviewedAvailable:FB.bookmarkAvailable('476'),
        religionFaults:FB.configureReligions()};
    })).toEqual({known:true,unknown:false,unreviewedAvailable:false,religionFaults:[]});
    await page.locator('#btn-ng-back').click();
    await page.locator('[data-bookmark="1066"]').click();
    await expect(page.locator('#newgame:not(.hidden)')).toBeVisible({timeout:30000});
    expect(await page.evaluate(function () { return window.__menuWork; }))
      .toEqual({publish:0,mods:0,stories:0,world:2,loading:false});
    expect(await page.evaluate(function () { return window.__reviewWorlds; })).toEqual(['867','1066']);
  });

  test('a first quick start prepares content before creating the life on ' + (crazy ? 'CrazyGames' : 'standard'),async function ({page},info) {
    test.skip(!info.project.name.endsWith('-served'),'Counters require source interception.');
    await watchPreparation(page);
    await title(page,info);
    await watchPreparationFrames(page);
    if (!crazy) {
      await page.locator('#btn-newgame').click();
      await page.locator('[data-quick-start="osric_867"]').click();
    } else await page.locator('#btn-newgame').click();
    await expect(page.locator('#game:not(.hidden)')).toBeVisible({timeout:30000});
    const frames = await preparationFrames(page);
    expect(frames.widths.length).toBeGreaterThanOrEqual(5);
    expect(frames.widths).toEqual(frames.widths.slice().sort(function (a,b) { return a-b; }));
    expect(frames.messages).toEqual(expect.arrayContaining(['Checking bookmark 867…',
      'Loading stories…','Preparing shared content…','Preparing interface…','Creating campaign…']));
    expect(await page.evaluate(function () { return window.__reviewWorlds; })).toEqual(['867']);
    const statuses = await page.evaluate(function () { return window.__reviewStatuses; });
    expect(statuses.length).toBe(1);
    expect(statuses.every(function (row) { return row.correct && row.painted; })).toBe(true);
    await expect(page.locator('#loadmsg')).toHaveAttribute('role','status');
    await expect(page.locator('#loadmsg')).toHaveAttribute('aria-live','polite');
    expect(await page.evaluate(function () {
      return {ready:FB.game.contentReady,campaignReady:FB.game.campaignReady('867'),work:window.__menuWork,
        bookmark:FB.activeBookmarkId,name:FB.state.chars[FB.state.player.charId].name};
    })).toEqual({ready:false,campaignReady:true,work:{publish:0,mods:0,stories:1,world:1,loading:false},bookmark:'867',name:'Osric'});
    expect(await page.evaluate(function () {
      FB.game.setPaused(true);
      const save = JSON.parse(FB.save.serialize());
      FB.save.restore(save);
      return {signature:save.mods,valid:FB.save.v4.validatePlatform(FB.state),bookmark:FB.state.start.id};
    })).toEqual({signature:crazy ? 'crazygames-content-1' : '',valid:true,bookmark:'867'});
  });
}

test('a shared start and a later Continue both cross the deferred content boundary',async function ({page},info) {
  test.skip(!info.project.name.endsWith('-served'),'Counters require source interception.');
  await watchPreparation(page);
  await openTitle(page,info);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    FB.game.setPaused(true);
    return new Promise(function (resolve,reject) {
      FB.save.toSlot('auto',function (ok) { if (ok) resolve(); else reject(new Error('Save failed')); });
    });
  });
  await openTitle(page,info);
  expect(await untouched(page)).toMatchObject({ready:false,work:{publish:0,mods:0,stories:0,world:0}});
  await page.locator('#btn-continue').click();
  await expect(page.locator('#game:not(.hidden)')).toBeVisible({timeout:30000});
  expect(await page.evaluate(function () {
    return {ready:FB.game.contentReady,campaignReady:FB.game.campaignReady('867'),work:window.__menuWork,
      name:FB.state.chars[FB.state.player.charId].name,seed:FB.state.seed};
  })).toEqual({ready:false,campaignReady:true,work:{publish:0,mods:0,stories:1,world:1,loading:false},
    name:'Ada',seed:'CADENCE-867-farmer-london-f-Ada'});
  expect(await page.evaluate(function () { return window.__reviewWorlds; })).toEqual(['867']);
});

for (const scenario of ['henry_pious_1241','koten_1241']) {
  test(scenario+' resumes a compact guarded world from the cold title',async function ({page},info) {
    await openTitle(page,info);
    await page.locator('#btn-newgame').click();
    await page.locator('[data-bookmark="1241"]').click();
    await page.locator('[data-scenario="'+scenario+'"]').click();
    await page.locator('#btn-cg-start').click();
    await expect(page.locator('#game:not(.hidden)')).toBeVisible();
    const before=await page.evaluate(function () {
      FB.game.setPaused(true);FB.ui.closeModal();
      return new Promise(function (resolve,reject) {
        FB.save.toSlot('auto',function (ok) {
          if (!ok) {reject(new Error('Save failed'));return;}
          const s=FB.state,r=FB.mobile.row(s,'koten_following_1241');
          resolve(JSON.stringify([s.start,s.player.charId,s.bookmarkSetup,r.guardedParty,r.camps,
            r.guardedParty.characterIds.map(function (id) {return [id,s.chars[id].homeProvinceId];})]));
        });
      });
    });
    await openTitle(page,info);
    expect(await page.evaluate(function () {return FB.game.contentReady;})).toBe(false);
    await page.locator('#btn-continue').click();
    await expect(page.locator('#game:not(.hidden)')).toBeVisible({timeout:30000});
    const restored=await page.evaluate(function () {
      FB.game.setPaused(true);
      const s=FB.state,r=FB.mobile.row(s,'koten_following_1241');
      return {same:JSON.stringify([s.start,s.player.charId,s.bookmarkSetup,r.guardedParty,r.camps,
        r.guardedParty.characterIds.map(function (id) {return [id,s.chars[id].homeProvinceId];})]),
        ready:FB.game.campaignReady('1241'),allDates:FB.game.contentReady,setup:FB.bookmarkSources.setupId(),
        valid:FB.save.v4.validatePlatform(s)};
    });
    expect(restored).toEqual({same:before,ready:true,allDates:false,setup:'1241',valid:true});
  });
}

test('stored mod dates are previewed before their full installation',async function ({page},info) {
  test.skip(!info.project.name.endsWith('-served'),'Counters require source interception.');
  await watchPreparation(page);
  await page.addInitScript(function (mod) {
    localStorage.setItem('fb_mods',JSON.stringify([JSON.stringify(mod)]));
  },harbor);
  await openTitle(page,info);
  await page.locator('#btn-newgame').click();
  await expect(page.locator('[data-bookmark="harbor_world"]')).toBeVisible();
  expect(await untouched(page)).toMatchObject({ready:false,published:false,work:{publish:0,mods:0,stories:0,world:0}});
  await page.locator('[data-bookmark="harbor_world"]').click();
  await expect(page.locator('#newgame:not(.hidden)')).toBeVisible({timeout:30000});
  expect(await page.evaluate(function () {
    return {ready:FB.game.contentReady,bookmark:FB.activeBookmarkId,work:window.__menuWork};
  })).toEqual({ready:true,bookmark:'harbor_world',work:{publish:1,mods:1,stories:1,world:1,loading:true}});
});

test('display metadata cannot bypass rejection of a broken bookmark',async function ({page},info) {
  test.skip(!info.project.name.endsWith('-served'),'Source fault injection requires a served origin.');
  await page.route('**/data/bookmark_sources.js',async function (route) {
    const response = await route.fetch();
    function fault() {
      FB.bookmarkSources.stage({source:'deferred-world-probe',bookmarks:['867'],catalogs:[]},function (data) {
        const world = data.bookmarks['867'];
        [world].concat(Object.values(world.revisions || {})).forEach(function (layer) {
          const realm = (layer.realms || []).find(function (row) { return !row.nonTerritorial; });
          if (realm) realm.capital = 'missing_menu_capital';
        });
      });
    }
    await route.fulfill({response:response,body:'(' + fault.toString() + ')();\n' + await response.text()});
  });
  await openTitle(page,info);
  await page.locator('#btn-newgame').click();
  await page.locator('[data-bookmark="867"]').click();
  await expect(page.getByRole('heading',{name:'Bookmark unavailable',exact:true})).toBeVisible({timeout:30000});
  expect(await page.evaluate(function () { return {state:FB.state,available:FB.bookmarkAvailable('867'),ready:FB.game.contentReady}; }))
    .toEqual({state:null,available:false,ready:false});
  await page.evaluate(function () { FB.ui.closeModal(); });
  await page.locator('[data-bookmark="1066"]').click();
  await expect(page.locator('#newgame:not(.hidden)')).toBeVisible({timeout:30000});
  await page.locator('#scenariolist button').filter({hasText:'Observe'}).click();
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  expect(await page.evaluate(function () { return {date:FB.state.start.id,allDates:FB.game.contentReady}; }))
    .toEqual({date:'1066',allDates:false});
});

for (const observe of [false,true]) {
  test('setup reuses its selected date for ' + (observe ? 'Observe' : 'Begin Your Story'),async function ({page},info) {
    test.skip(!info.project.name.endsWith('-served'),'Counters require source interception.');
    await watchPreparation(page);
    await openTitle(page,info);
    await page.locator('#btn-newgame').click();
    await page.locator('[data-bookmark="867"]').click();
    await expect(page.locator('#newgame:not(.hidden)')).toBeVisible({timeout:30000});
    expect(await page.evaluate(function () {
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      return {play:FB.game.start(),observe:FB.game.startObserve(),state:FB.state,
        unchanged:rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({play:false,observe:false,state:null,unchanged:true});
    if (!observe) {
      await page.locator('[data-scenario="serf"]').click();
      await expect(page.locator('#pickprov:not(.hidden)')).toBeVisible();
      await page.evaluate(function () { FB.game.pickFoundLocation('london',0); });
      await page.locator('#btn-pick-random').click();
      await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
      await page.locator('input[name="cg-sex"][value="f"]').check();
      await page.locator('input[name="cg-family"][value="standard"]').check();
      await page.locator('#cg-name').fill('Lina');
    }
    expect(await untouched(page)).toMatchObject({ready:false,published:false,state:null,
      work:{publish:0,mods:0,stories:0,world:1}});
    if (observe) await page.locator('#scenariolist button').filter({hasText:'Observe'}).click();
    else await page.locator('#btn-cg-start').click();
    await expect(page.locator('#game:not(.hidden)')).toBeVisible({timeout:30000});
    expect(await page.evaluate(function () {
      const state = FB.state, person = state && state.chars[state.player.charId];
      return {ready:FB.game.contentReady,campaignReady:FB.game.campaignReady('867'),published:FB.bookmarkSources.hasPublished(),
        setup:FB.bookmarkSources.setupId(),reviews:window.__reviewWorlds,
        work:window.__menuWork,observe:FB.game.observe,bookmark:state.start.id,
        name:person ? person.name : null,sex:person ? person.sex : null,
        province:state.player.provinceId};
    })).toMatchObject({ready:false,campaignReady:true,published:false,setup:'867',reviews:['867'],observe:observe,bookmark:'867',
      work:{publish:0,mods:0,stories:1,world:1,loading:false},
      ...(observe ? {} : {name:'Lina',sex:'f',province:'london'})});
  });
}

test('a running scoped campaign can open Mods without changing its state, signature or map view',async function ({page},info) {
  await openTitle(page,info);
  await page.locator('#btn-newgame').click();
  await page.locator('[data-bookmark="1241"]').click();
  await page.locator('[data-scenario="henry_pious_1241"]').click();
  await page.locator('#btn-cg-start').click();
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  await page.evaluate(function () {
    FB.game.setPaused(true); FB.ui.closeModal();
    window.__scopedSave = JSON.parse(FB.save.serialize());
    window.__scopedState = FB.state;
    window.__scopedBefore = JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter()]);
    window.__scopedView = [FB.map.zoom,FB.map.viewX,FB.map.viewY];
    FB.ui.showMods();
  });
  await page.waitForFunction(function () { return FB.game.contentReady && FB.state === window.__scopedState; });
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  const result = await page.evaluate(function () {
    const unchanged = window.__scopedBefore === JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter()]);
    const sameView = JSON.stringify(window.__scopedView) === JSON.stringify([FB.map.zoom,FB.map.viewX,FB.map.viewY]);
    const signature = FB.mods.sig();
    FB.save.restore(window.__scopedSave);
    return {unchanged:unchanged,sameView:sameView,signature:signature,original:window.__scopedSave.mods,
      valid:FB.save.v4.validatePlatform(FB.state),date:FB.state.start.id,setup:FB.bookmarkSources.setupId()};
  });
  expect(result).toEqual({unchanged:true,sameView:true,signature:'',original:'',valid:true,date:'1241',setup:null});
});

test('a save from another date prepares only that date and failed preflight restores the running campaign',async function ({page},info) {
  test.skip(!info.project.name.endsWith('-served'),'Review counts require source interception.');
  await watchPreparation(page);
  await openTitle(page,info);
  await page.locator('#btn-newgame').click();
  await page.locator('[data-quick-start="osric_867"]').click();
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  await page.evaluate(function () {
    FB.game.setPaused(true); FB.ui.closeModal();
    window.__otherSave = JSON.parse(FB.save.serialize());
    FB.game.toTitle();
  });
  await page.locator('#btn-newgame').click();
  await page.locator('[data-bookmark="1241"]').click();
  await page.locator('[data-scenario="henry_pious_1241"]').click();
  await page.locator('#btn-cg-start').click();
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  await page.evaluate(function () {
    FB.game.setPaused(true); FB.ui.closeModal();
    // Normalize through the save owner before comparing a failed switch.
    FB.save.serialize();
    window.__priorLife = FB.state; window.__priorData = FBDATA; window.__priorWorld = FB.world;
    window.__priorBefore = JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter()]);
    FB.game.loadData(Object.assign({},window.__otherSave,{mods:'wrong-content-signature'}));
  });
  await expect(page.locator('#genmodal:not(.hidden)')).toContainText('modded world');
  expect(await page.evaluate(function () {
    return {same:FB.state === window.__priorLife && FBDATA === window.__priorData && FB.world === window.__priorWorld,
      unchanged:window.__priorBefore === JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter()]),
      ready:FB.game.campaignReady('1241'),setup:FB.bookmarkSources.setupId(),signature:JSON.parse(FB.save.serialize()).mods};
  })).toEqual({same:true,unchanged:true,ready:true,setup:'1241',signature:''});
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  await page.evaluate(function () {
    FB.ui.closeModal(); window.__switched = false;
    FB.game.loadData(window.__otherSave,function () { window.__switched = true; });
  });
  await page.waitForFunction(function () { return window.__switched; });
  expect(await page.evaluate(function () {
    return {date:FB.state.start.id,ready:FB.game.campaignReady('867'),allDates:FB.game.contentReady,
      setup:FB.bookmarkSources.setupId(),valid:FB.save.v4.validatePlatform(FB.state),reviews:window.__reviewWorlds};
  })).toEqual({date:'867',ready:true,allDates:false,setup:'867',valid:true,reviews:['867','1241','867','867']});
});

// Each date starts from a fresh title. Eager preparation here would install
// the shared records first and hide cold-setup conflicts or missing profiles.
for (const id of ['476','493','568','634','711','800','867','1066','1096','1204','1241']) {
  test(id + ' prepares independently from the cold title with complete dependencies',async function ({page},info) {
    await openTitle(page,info);
    await loadBookmarkDates(page,[id]);
    const result = await page.evaluate(function (id) {
      const base = FBDATA, rng = FB.getRngState(), uid = FB.getUidCounter();
      function foundation() {
        return JSON.stringify([base.cultures,base.settlementSites,base.constituencyProfiles,base.balance,base.tech]);
      }
      const before = foundation(), compile = FB.stories.compile;
      let report, compiles = 0;
      FB.stories.compile = function () { compiles++; return compile.apply(this,arguments); };
      try { report = FB.bookmarkSources.prepareSetup(id); }
      finally { FB.stories.compile = compile; }
      const revisions = FB.bookmarkRevisions(id);
      const constituencies = [];
      revisions.forEach(function (world) {
        world.realms.forEach(function (realm) {
          if (realm.constituency && constituencies.indexOf(realm.constituency) < 0) constituencies.push(realm.constituency);
        });
      });
      return {published:report.published,worldFaults:report.worldFaults,compiles:compiles,
        rejected:report.starts.filter(function (start) { return !start.ready; }),
        religionFaults:FB.configureReligions(),
        revisionFaults:revisions.map(function (world) { return FB.validateBookmarkWorld(world); }),
        missingConstituencies:constituencies.filter(function (key) { return !FBDATA.constituencyProfiles[key]; }),
        constituencies:constituencies,site:FBDATA.settlementSites.santiago_476,
        basquePeriod:!!(FBDATA.cultures.basque.nameEras && FBDATA.cultures.basque.nameEras.late_antique),
        state:FB.state,complete:FB.game.contentReady,allPublished:FB.bookmarkSources.hasPublished(),
        isolated:base !== FBDATA && before === foundation() && rng === FB.getRngState() && uid === FB.getUidCounter()};
    },id);
    expect(result).toMatchObject({published:true,worldFaults:[],rejected:[],religionFaults:[],missingConstituencies:[],
      basquePeriod:true,state:null,complete:false,allPublished:false,isolated:true});
    expect(result.compiles).toBeLessThanOrEqual(3);
    result.revisionFaults.forEach(function (faults) { expect(faults).toEqual([]); });
    if (id === '476') expect(result.site).toMatchObject({x:-8.65,y:42.74,names:[{to:600,name:'Iria Flavia'}]});
    if (id === '1066') expect(result.constituencies).toContain('iceland_commonwealth_1066');
    if (id === '1204') expect(result.constituencies).toContain('siwa_oasis_1204');
  });
}

test('setup faith references recognize unloaded dates without weakening availability or candidate validation',async function ({page},info) {
  await openTitle(page,info);
  await loadBookmarkDates(page,['476']);
  const result = await page.evaluate(function () {
    FB.bookmarkSources.prepareSetup('476');
    const live = FBDATA, religions = live.religions, world = FB.bookmark('476');
    const faithId = 'mesopotamian_traditional', definition = religions[faithId];
    function review(availability) {
      live.religions = Object.assign({},religions);
      live.religions[faithId] = Object.assign({},definition,{availability:availability});
      return {faults:FB.configureReligions().filter(function (fault) { return fault.indexOf('Faith ' + faithId + ':') === 0; }),
        available:FB.faithHistoricalAvailable(faithId,world,'community')};
    }
    try {
      const known = review({bookmarkIds:['476','493']});
      const unknown = review({bookmarkIds:['476','missing_setup_date']});
      const duplicate = review({bookmarkIds:['476','476']});
      const empty = review({bookmarkIds:[]});
      const otherDate = review({bookmarkIds:['493']});
      const otherConsumer = review({bookmarkIds:['476','493'],consumers:['institution']});
      const otherYear = review({bookmarkIds:['476','493'],yearMin:493});
      review({bookmarkIds:['476','493']});
      const selector = {id:'setup_probe',bookmarkIds:['476','493']};
      const explicit = FB.startSelectorReport(selector,world,undefined,live);
      const unreviewed = {known:FB.bookmarkSources.setupKnowsBookmark('493'),
        definition:FB.bookmark('493'),available:FB.bookmarkAvailable('493')};
      // A detached candidate has the same declarations but lacks the referenced
      // world. The active setup must not provide implicit permission to it.
      window.FBDATA = Object.assign({},live);
      const candidate = {faults:FB.configureReligions().filter(function (fault) { return fault.indexOf('Faith ' + faithId + ':') === 0; }),
        available:FB.faithHistoricalAvailable(faithId,world,'community'),
        selector:FB.startSelectorReport(selector,world).valid};
      window.FBDATA = live;
      const restored = review({bookmarkIds:['476','493']});
      return {known:known,unknown:unknown,duplicate:duplicate,empty:empty,otherDate:otherDate,
        otherConsumer:otherConsumer,otherYear:otherYear,candidate:candidate,restored:restored,
        explicit:explicit.valid,unreviewed:unreviewed,complete:FB.game.contentReady,state:FB.state};
    } finally {
      window.FBDATA = live; live.religions = religions; FB.invalidateReligionData();
    }
  });
  expect(result).toMatchObject({known:{faults:[],available:true},restored:{faults:[],available:true},
    explicit:false,unreviewed:{known:true,definition:null,available:false},complete:false,state:null});
  for (const key of ['unknown','duplicate','candidate']) {
    expect(result[key].faults).toEqual(['Faith mesopotamian_traditional: availability.bookmarkIds must name unique known ids.']);
    expect(result[key].available).toBe(false);
  }
  expect(result.candidate.selector).toBe(false);
  for (const key of ['empty','otherDate','otherConsumer','otherYear']) expect(result[key]).toEqual({faults:[],available:false});
});

test('switching affected setup dates preserves the complete catalogue at the final gate',async function ({page},info) {
  async function catalogue() {
    return page.evaluate(function () {
      const roots = ['bookmarks','startScenarios','storyInstances','cultures','religions','geographies',
        'settlementSites','settlementLayouts','constituencyProfiles','balance','tech'];
      const data = {};
      roots.forEach(function (root) { data[root] = FBDATA[root]; });
      return {fingerprint:FB.mods.fingerprint(data),starts:FBDATA.startScenarios.map(function (row) { return row.id; }),
        stories:FB.stories.list().map(function (row) { return row.id; }),
        published:FB.bookmarkCompositions.sourceReports().filter(function (row) { return row.bookmarkId; })
          .every(function (row) { return row.published; }),setup:FB.bookmarkSources.setupId(),
        setupReferences:FB.bookmarkSources.setupKnowsBookmark('493'),religionFaults:FB.configureReligions(),ready:FB.game.contentReady};
    });
  }
  await openTitle(page,info);
  await page.locator('#btn-newgame').click();
  for (const id of ['476','1204','1066']) {
    await page.locator('[data-bookmark="' + id + '"]').click();
    await expect(page.locator('#newgame:not(.hidden)')).toBeVisible({timeout:30000});
    expect(await page.evaluate(function () { return FB.game.contentReady; })).toBe(false);
    await page.locator('#btn-ng-back').click();
  }
  await prepareGameContent(page);
  const afterSetup = await catalogue();
  expect(afterSetup).toMatchObject({published:true,setup:null,setupReferences:false,religionFaults:[],ready:true});
  await openTitle(page,info);
  // The owner-facing synchronous API must produce the same catalogue as the
  // yielding menu gate, including after a partially prepared setup session.
  await loadBookmarkDates(page,null);
  await page.evaluate(function () { FB.bookmarkCompositions.publishPending(); });
  await prepareGameContent(page);
  expect(await catalogue()).toEqual(afterSetup);
});

test('an unexpected preparation failure releases the loading screen and publication lock',async function ({page},info) {
  test.skip(!info.project.name.endsWith('-served'),'Source failure requires interception.');
  await page.route('**/js/main.js',async function (route) {
    const response = await route.fetch();
    await route.fulfill({response:response,body:'FB.bookmarkCompositions.prepareSource=function(){throw new Error("Preparation failure probe");};\n' + await response.text()});
  });
  await openTitle(page,info);
  await page.locator('#btn-newgame').click();
  await page.locator('[data-quick-start="osric_867"]').click();
  await expect(page.locator('#genmodal:not(.hidden)')).toContainText('Preparation failure probe');
  await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#title:not(.hidden)')).toBeVisible();
  expect(await page.evaluate(function () {
    return {ready:FB.game.contentReady,publishing:FB.bookmarkSources.isPublishing(),state:FB.state};
  })).toEqual({ready:false,publishing:false,state:null});
});

test('a genuinely missing constituency still rejects setup without publishing partial data',async function ({page},info) {
  test.skip(!info.project.name.endsWith('-served'),'Source fault injection requires a served origin.');
  await page.route('**/data/bookmark_sources.js',async function (route) {
    const response = await route.fetch();
    function removeProfile() {
      FB.bookmarkSources.stage({source:'missing-setup-constituency',bookmarks:['1204'],catalogs:['constituencyProfiles']},function (data) {
        delete data.constituencyProfiles.siwa_oasis_1204;
      });
    }
    await route.fulfill({response:response,body:'(' + removeProfile.toString() + ')();\n' + await response.text()});
  });
  await openTitle(page,info);
  await loadBookmarkDates(page,['1204']);
  const result = await page.evaluate(function () {
    const base = FBDATA, before = JSON.stringify(base), rng = FB.getRngState(), uid = FB.getUidCounter();
    const messages = JSON.stringify(FB.englishMessages()), stories = FB.stories.list().map(function (row) { return row.id; });
    let error = '';
    try { FB.bookmarkSources.prepareSetup('1204'); } catch (failure) { error = failure.message; }
    return {error:error,state:FB.state,setup:FB.bookmarkSources.setupId(),
      unchanged:base === FBDATA && before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter() &&
        messages === JSON.stringify(FB.englishMessages()) && JSON.stringify(stories) === JSON.stringify(FB.stories.list().map(function (row) { return row.id; }))};
  });
  expect(result).toMatchObject({state:null,setup:null,unchanged:true});
  expect(result.error).toContain('siwa_households_1204: invalid local constituency or territory');
});
