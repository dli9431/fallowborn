'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/lang_en.js',
  'index.html',
  'css/style.css',
  'js/i18n.js',
  'js/messages.js',
  'js/model.js',
  'js/save.js',
  'js/main.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'js/ui_panels.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test('the chronicle grows by prepend and trims, identical to a full rebuild',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    await page.evaluate(function () {
      FB.ui.showTab('log');
      FB.ui.refresh();
    });

    const result = await page.evaluate(async function () {
      function twoFrames() {
        return new Promise(function (resolve) {
          requestAnimationFrame(function () {
            requestAnimationFrame(resolve);
          });
        });
      }
      const s = FB.state;
      const SH = FB.ui._shared;
      const box = document.getElementById('tab-log');
      await twoFrames();

      /* seed two probe entries first so the preserved-node check never
         depends on how much chronicle the start wrote */
      for (let i = 0; i < 2; i++) {
        FB.news(s, FB.msg('news.e2e.chronicle_seed_' + i,
          'E2E chronicle seed {n}', { n: i }));
      }
      FB.ui.refresh();
      await twoFrames();
      const oldSecond = box.querySelectorAll('.logentry')[1];

      /* a burst of news in one JS turn: the coalesced refresh takes the
         incremental append path */
      for (let i = 0; i < 5; i++) {
        FB.news(s, FB.msg('news.e2e.chronicle_probe_' + i,
          'E2E chronicle probe {n}', { n: i }));
      }
      FB.ui.refresh();
      await twoFrames();

      const appended = box.innerHTML;
      const entries = box.querySelectorAll('.logentry');
      const newestFirst =
        appended.indexOf('probe 4') >= 0 &&
        appended.indexOf('probe 4') < appended.indexOf('probe 3') &&
        appended.indexOf('probe 3') < appended.indexOf('probe 0');
      /* existing nodes are preserved by the prepend, not reparsed: the old
         second entry is the same node object, now five places lower */
      const preserved = !!oldSecond && box.contains(oldSecond) &&
        box.querySelectorAll('.logentry')[6] === oldSecond;
      const quietStable = entries.length;

      /* a quiet refresh leaves the DOM exactly as it was */
      FB.ui.refresh();
      await twoFrames();
      const quietUnchanged = box.innerHTML === appended &&
        box.querySelectorAll('.logentry').length === quietStable;

      /* forcing the guard's fallback must produce byte-identical markup */
      SH.logRenderedLen = -1;
      FB.ui.refresh();
      await twoFrames();
      const rebuildIdentical = box.innerHTML === appended;

      /* a flood appends and trims back to the 80-entry window */
      for (let i = 0; i < 200; i++) {
        FB.news(s, FB.msg('news.e2e.chronicle_flood_' + i,
          'E2E chronicle flood {n}', { n: i }));
      }
      FB.ui.refresh();
      await twoFrames();
      const flooded = box.querySelectorAll('.logentry');
      const floodFirst = flooded[0] && flooded[0].textContent;
      const floodLast = flooded[flooded.length - 1] &&
        flooded[flooded.length - 1].textContent;
      return {
        appended:true,
        newestFirst:newestFirst,
        preserved:preserved,
        quietUnchanged:quietUnchanged,
        rebuildIdentical:rebuildIdentical,
        floodCount:flooded.length,
        floodNewest:!!floodFirst && floodFirst.indexOf('flood 199') >= 0,
        floodOldest:!!floodLast && floodLast.indexOf('flood 120') >= 0
      };
    });

    expect(result).toEqual({
      appended:true,
      newestFirst:true,
      preserved:true,
      quietUnchanged:true,
      rebuildIdentical:true,
      floodCount:80,
      floodNewest:true,
      floodOldest:true
    });
  });

test('reloaded Chronicle descriptors lazily recover their English source',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const key = await page.evaluate(function () {
      delete FBDATA.lang.en;
      const selected = 'news.army.disbands';
      if (FB.englishMessage(selected)) {
        throw new Error('Expected the saved news source to be unregistered.');
      }
      const s = FB.state;
      s.log.push({
        y:s.date.year, s:s.date.season, d:s.date.day,
        msg:FB.message(selected, {})
      });
      FB.ui.showTab('log');
      FB.ui.refresh();
      return selected;
    });

    await expect.poll(async function () {
      return page.evaluate(function () {
        return !!(FBDATA.lang.en && FBDATA.lang.en.entries);
      });
    }).toBe(true);
    await expect(page.locator('#tab-log .chronicle-entries')).not.toContainText(key);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const entry = s.log[s.log.length - 1];
      return FB.newsText(entry, s, s.player.charId);
    });
    expect(result).not.toBe(key);
    expect(result).not.toMatch(/^news\./);
  });

test('the complete Chronicle archive survives recent-log trimming and adopts old saves',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      const archive = FB.ensureChronicle(s);
      const before = archive.entries.length;
      for (let i = 0; i < 450; i++) {
        FB.news(s, FB.msg('news.e2e.complete_chronicle',
          'Archive entry {n}', { n:i }), { toast:false });
      }
      const firstAdded = FB.chronicleEntry(archive, archive.entries[before]);
      const lastAdded = FB.chronicleEntry(archive,
        archive.entries[archive.entries.length - 1]);
      const payload = JSON.parse(FB.save.serialize());
      const artifact = FB.save.chronicleData(s);
      const parsed = FB.save.parseChronicle(JSON.stringify(artifact));

      const legacyPayload = JSON.parse(JSON.stringify(payload));
      delete legacyPayload.state.chronicle;
      FB.save.restore(legacyPayload);
      const legacy = FB.state;
      const recovered = legacy.chronicle;
      FB.news(legacy, FB.msg('news.e2e.old_save_continues',
        'The old save continues.', {}), { toast:false });
      return {
        recent:s.log.length,
        added:archive.entries.length - before,
        first:FB.newsText(firstAdded, s, s.player.charId),
        last:FB.newsText(lastAdded, s, s.player.charId),
        compact:Array.isArray(archive.entries[before]) &&
          archive.strings.indexOf('news.e2e.complete_chronicle') >= 0,
        serialized:payload.state.chronicle.entries.length,
        artifactCount:artifact.entries.length,
        artifactComplete:artifact.complete,
        parsed:!!parsed,
        legacyPartial:recovered.partial,
        legacyAdopted:recovered.entries.length === 301,
        legacyContinues:FB.newsText(legacy.log[legacy.log.length - 1],
          legacy, legacy.player.charId)
      };
    });

    expect(result).toMatchObject({
      recent:300,
      added:450,
      first:'Archive entry 0',
      last:'Archive entry 449',
      compact:true,
      artifactComplete:true,
      parsed:true,
      legacyPartial:true,
      legacyAdopted:true,
      legacyContinues:'The old save continues.'
    });
    expect(result.serialized).toBe(result.artifactCount);
  });

test('the in-game Chronicle opens the full viewer and returns to the live panel',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const opened = await page.evaluate(function () {
      const s = FB.state;
      for (let i = 0; i < 130; i++) {
        FB.news(s, FB.msg('news.e2e.ingame_chronicle',
          'In-game Chronicle entry {n}', { n:i }), { toast:false });
      }
      delete FBDATA.lang.en;
      delete FB.englishMessages()['news.army.disbands'];
      FB.news(s, FB.message('news.army.disbands', {}), { toast:false });
      FB.ui.showTab('log');
      FB.ui.refresh();
      FB.game.paused = false;
      window.__chronicleLiveState = s;
      window.__chronicleLiveTurn = s.turn;
      window.__chronicleLiveRng = FB.getRngState();
      document.querySelector('[data-chronicle-full]').click();
      return {
        pausedWhileLoading:FB.game.paused,
        stateSame:FB.state === window.__chronicleLiveState,
        turnSame:FB.state.turn === window.__chronicleLiveTurn,
        rngSame:FB.getRngState() === window.__chronicleLiveRng
      };
    });

    expect(opened).toEqual({
      pausedWhileLoading:true,
      stateSame:true,
      turnSame:true,
      rngSame:true
    });
    await expect(page.getByRole('heading', { name:/^Chronicle of / })).toBeVisible();
    await expect(page.locator('.chronicle-viewer-entry')).toHaveCount(60);
    await expect(page.locator('.chronicle-viewer-pages')).toContainText('Page 1 of');
    expect(await page.evaluate(function () { return FB.game.paused; })).toBe(false);

    const returned = await page.evaluate(function () {
      document.getElementById('chronicle-back').click();
      return {
        modalHidden:document.getElementById('genmodal').classList.contains('hidden'),
        gameVisible:!document.getElementById('game').classList.contains('hidden'),
        chronicleVisible:document.getElementById('tab-log').offsetParent !== null,
        activeTab:FB.ui._shared.activeTab,
        paused:FB.game.paused,
        stateSame:FB.state === window.__chronicleLiveState,
        turnSame:FB.state.turn === window.__chronicleLiveTurn,
        rngSame:FB.getRngState() === window.__chronicleLiveRng,
        focusReturned:document.activeElement &&
          document.activeElement.hasAttribute('data-chronicle-full')
      };
    });

    expect(returned).toEqual({
      modalHidden:true,
      gameVisible:true,
      chronicleVisible:true,
      activeTab:'log',
      paused:false,
      stateSame:true,
      turnSame:true,
      rngSame:true,
      focusReturned:true
    });
  });

test('the title Chronicle viewer pages, filters, and reopens recent history',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    await page.evaluate(function () {
      const s = FB.state;
      for (let i = 0; i < 130; i++) {
        FB.news(s, FB.msg('news.e2e.viewer_entry',
          'Viewer entry {n}', { n:i }), { toast:false });
      }
      FB.save.rememberChronicle(s);
      FB.game.toTitle();
    });

    await page.getByRole('button', { name:'View Chronicle', exact:true }).click();
    await expect(page.getByRole('heading', { name:'Chronicle Library', exact:true }))
      .toBeVisible();
    await page.getByRole('button', { name:/Open recent Chronicle/ }).click();
    await expect(page.locator('.chronicle-viewer-summary')).toContainText('Entries');
    await expect(page.locator('.chronicle-head')).toHaveCount(1);
    await expect(page.getByRole('heading', {
      name:'The shape of the saga', exact:true
    })).toHaveCount(0);
    await expect(page.locator('.chronicle-history-chart')).toHaveCount(0);
    await expect(page.locator('.chronicle-viewer-entry')).toHaveCount(60);
    await expect(page.locator('.chronicle-viewer-pages')).toContainText('Page 1 of');

    await page.locator('#chronicle-search').fill('Viewer entry 129');
    await page.locator('#chronicle-search-go').click();
    await expect(page.locator('.chronicle-viewer-entry')).toHaveCount(1);
    await expect(page.locator('.chronicle-viewer-entry')).toContainText('Viewer entry 129');
    await page.getByRole('button', { name:'Back', exact:true }).click();
    await expect(page.getByRole('heading', { name:'Chronicle Library', exact:true }))
      .toBeVisible();
    const archiveText = await page.evaluate(function () {
      return JSON.stringify(FB.save.recentChronicle());
    });
    await page.locator('#chronicle-file').setInputFiles({
      name:'fallowborn-chronicle-test.json',
      mimeType:'application/json',
      buffer:Buffer.from(archiveText)
    });
    await page.getByRole('button', { name:/Open Chronicle file/ }).click();
    await expect(page.locator('.chronicle-viewer-summary')).toContainText('Entries');
    await expect(page.locator('.chronicle-viewer-entry')).toHaveCount(60);
  });

test('the mobile Chronicle can collapse filters and keeps download within the history',
  async function ({ page }, testInfo) {
    await page.setViewportSize({ width:390, height:844 });
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    await page.evaluate(function () {
      FB.ui.showTab('log');
      FB.ui.refresh();
      document.querySelector('[data-chronicle-full]').click();
    });

    const toggle = page.locator('#chronicle-filter-toggle');
    const fields = page.locator('#chronicle-filter-fields');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(fields).toBeVisible();
    await expect(page.locator(
      '#gm-body > .chronicle-viewer-actions #chronicle-download')).toBeVisible();
    await expect(page.locator('.gm-footer #chronicle-download')).toHaveCount(0);
    await page.locator('#chronicle-category').selectOption('news');
    await expect(page.locator('#chronicle-category')).toHaveValue('news');

    await toggle.click();
    await expect(toggle).toHaveText('Show filters');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(fields).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveText('Hide filters');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(fields).toBeVisible();
    await expect(page.locator('#chronicle-category')).toHaveValue('news');
  });

test('a finished campaign can explore or download its full Chronicle',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const finished = await page.evaluate(function () {
      for (let i = 0; i < 75; i++) {
        FB.news(FB.state, FB.msg('news.e2e.finished_chronicle',
          'Finished entry {n}', { n:i }), { toast:false });
      }
      const me = FB.state.chars[FB.state.player.charId];
      const relatives = FB.heirsOf(FB.state);
      for (let i = 0; i < relatives.length; i++) relatives[i].dead = true;
      me.dead = true;
      FB.state.player.dead = true;
      const artifact = FB.save.chronicleData(FB.state);
      FB.ui.gameOver();
      return artifact.campaign.finished;
    });

    expect(finished).toBe(true);
    await expect(page.getByRole('heading', { name:'The Chronicle Closes', exact:true }))
      .toBeVisible();
    await expect(page.getByRole('button', { name:'Download Chronicle', exact:true }))
      .toBeVisible();
    await page.getByRole('button', { name:'Explore full Chronicle', exact:true }).click();
    await expect(page.locator('.chronicle-viewer-entry')).toHaveCount(60);
    await expect(page.locator('.chronicle-viewer-entries'))
      .toContainText('Finished entry 0');
  });
