'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/main.js',
  'js/ui_misc.js',
  'js/ui_modals.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { START_CODE, startDeterministicGame } = require('../support/game/start');

test('telemetry accepts only the exact official play origin and stays silent locally',
  async function ({ page }, testInfo) {
    await page.addInitScript(function () {
      window.__umamiCalls = [];
      window.umami = {
        track:function (name, data) {
          window.__umamiCalls.push({ name:name, data:data });
        }
      };
    });
    await openGame(page, testInfo);

    expect(await page.evaluate(function () {
      return {
        official:FB.telemetry.isOfficialPlay({
          protocol:'https:', hostname:'play.fallowborn.com'
        }),
        insecureOfficial:FB.telemetry.isOfficialPlay({
          protocol:'http:', hostname:'play.fallowborn.com'
        }),
        localhost:FB.telemetry.isOfficialPlay({
          protocol:'http:', hostname:'127.0.0.1'
        }),
        itch:FB.telemetry.isOfficialPlay({
          protocol:'https:', hostname:'html-classic.itch.zone'
        }),
        lookalike:FB.telemetry.isOfficialPlay({
          protocol:'https:', hostname:'play.fallowborn.com.example.org'
        }),
        enabledHere:FB.telemetry.enabled(),
        trackerScripts:document.querySelectorAll(
          'script[src="https://stats.fallowborn.com/fb-client.js"]').length
      };
    })).toEqual({
      official:true,
      insecureOfficial:false,
      localhost:false,
      itch:false,
      lookalike:false,
      enabledHere:false,
      trackerScripts:0
    });

    await startDeterministicGame(page);
    expect(await page.evaluate(function () {
      FB.telemetry.track('local-probe', { synthetic:true });
      return window.__umamiCalls;
    })).toEqual([]);
  });

test('gameplay telemetry reports descriptive lifecycle and engagement events',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await page.evaluate(function () {
      window.__telemetryEvents = [];
      FB.telemetry = {
        enabled:function () { return true; },
        track:function (name, data) {
          window.__telemetryEvents.push({ name:name, data:data });
          return true;
        }
      };
      window.__telemetryRealNow = Date.now;
      window.__telemetryNow = Date.now();
      Date.now = function () { return window.__telemetryNow; };
    });

    await startDeterministicGame(page);
    let events = await page.evaluate(function () {
      return window.__telemetryEvents;
    });
    expect(events[0]).toEqual({
      name:'campaign-started',
      data:expect.objectContaining({
        telemetry_schema:2,
        game_version:expect.stringMatching(/^\d+\.\d+\.\d+$/),
        locale:'en',
        start_bookmark:'867',
        player_tier:1,
        dynasty_generation:1,
        entry_type:'new-campaign',
        scenario:'farmer',
        family_preset:'standard'
      })
    });
    expect(['name', 'dynasty', 'seed', 'province', 'save'].filter(function (key) {
      return Object.prototype.hasOwnProperty.call(events[0].data, key);
    })).toEqual([]);

    await page.evaluate(function () {
      for (let i = 0; i < 120; i++) {
        window.__telemetryNow += 15000;
        document.dispatchEvent(new Event('visibilitychange'));
      }
      window.dispatchEvent(new Event('pagehide'));
      Date.now = window.__telemetryRealNow;
      delete window.__telemetryRealNow;
      delete window.__telemetryNow;
    });
    events = await page.evaluate(function () {
      return window.__telemetryEvents;
    });
    expect(events.map(function (event) { return event.name; })).toEqual([
      'campaign-started',
      'hint-shown',
      'hint-dismissed',
      'active-play-reached-1-minute',
      'active-play-reached-5-minutes',
      'active-play-reached-15-minutes',
      'active-play-reached-30-minutes',
      'active-play-checkpoint'
    ]);
    expect(events[events.length - 1].data).toEqual(expect.objectContaining({
      entry_type:'new-campaign',
      active_seconds:1800,
      checkpoint_reason:'page-hide',
      game_year:867
    }));

    const saved = await page.evaluate(function () {
      return JSON.parse(FB.save.serialize());
    });
    await page.evaluate(function (data) {
      return new Promise(function (resolve, reject) {
        if (!FB.game.loadData(data, resolve)) {
          reject(new Error('Synthetic save was rejected'));
        }
      });
    }, saved);
    events = await page.evaluate(function () {
      return window.__telemetryEvents;
    });
    expect(events[events.length - 1]).toEqual({
      name:'campaign-resumed',
      data:expect.objectContaining({
        telemetry_schema:2,
        game_version:expect.stringMatching(/^\d+\.\d+\.\d+$/),
        start_bookmark:'867',
        entry_type:'resumed-campaign'
      })
    });

    await page.evaluate(function (data) {
      return new Promise(function (resolve, reject) {
        if (!FB.game.loadData(data, resolve)) {
          reject(new Error('Second synthetic save was rejected'));
        }
      });
    }, saved);
    expect(await page.evaluate(function () {
      return window.__telemetryEvents.filter(function (event) {
        return event.name === 'campaign-resumed';
      }).length;
    })).toBe(1);

    await page.evaluate(function () {
      FB.game.toTitle();
      FB.game.startObserve();
    });
    events = await page.evaluate(function () {
      return window.__telemetryEvents;
    });
    expect(events.slice(-2).map(function (event) { return event.name; }))
      .toEqual(['returned-to-title', 'observer-mode-started']);
    expect(events[events.length - 1].data).toEqual(expect.objectContaining({
      game_version:expect.stringMatching(/^\d+\.\d+\.\d+$/),
      start_bookmark:'867',
      entry_type:'observer-mode'
    }));
  });

test('first-time hints report shown, interaction, dismissal, and opt-out actions',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await page.evaluate(function () {
      window.__telemetryEvents = [];
      FB.telemetry = {
        enabled:function () { return true; },
        track:function (name, data) {
          window.__telemetryEvents.push({ name:name, data:data });
          return true;
        }
      };
    });

    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#ng-seed').fill(START_CODE);
    await page.getByRole('button', { name:/Use this seed/ }).click();
    await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
    await page.getByRole('button', { name:'Begin', exact:true }).click();

    for (const text of ['map is yours to explore', 'Use Home to recenter',
      'Use Map filters']) {
      const opening = page.locator('.coachmark', { hasText:text });
      await expect(opening).toBeVisible();
      await opening.getByRole('button', { name:'Got it', exact:true }).click();
    }
    await page.evaluate(function () {
      /* Isolate this assertion from the earlier map-tour telemetry while
         reconstructing the unread Deeds prompt under test. */
      FB.ui.coachmarkReset();
      window.__telemetryEvents = [];
      FB.ui.resumeFirstPlayerTip();
    });
    const coach = page.locator('.coachmark', { hasText:'Begin in Deeds' });
    await expect(coach).toBeVisible();
    await page.locator('#sidetabs .tab[data-tab="actions"]').click();
    await coach.getByRole('button', { name:'Got it', exact:true }).click();
    const flow = page.locator('.coachmark', { hasText:'unpause with Play' });
    await expect(flow).toBeVisible();
    await flow.getByRole('button', { name:'Got it', exact:true }).click();

    await page.evaluate(function () {
      FB.game.uiPrefs.hideTips = false;
      FB.ui.maybeTip('telemetry-opt-out', 'Synthetic opt-out lesson',
        '#timebtns', { noNext:true });
    });
    const optOut = page.locator('.coachmark', { hasText:'Synthetic opt-out lesson' });
    await expect(optOut).toBeVisible();
    await optOut.getByRole('button', { name:'Stop tips', exact:true }).click();

    const events = await page.evaluate(function () {
      return window.__telemetryEvents.filter(function (event) {
        return event.name.indexOf('hint-') === 0 ||
          event.name === 'tips-disabled';
      });
    });
    expect(events.map(function (event) { return event.name; })).toEqual([
      'hint-shown',
      'hint-interacted',
      'hint-dismissed',
      'hint-shown',
      'hint-dismissed',
      'hint-shown',
      'tips-disabled'
    ]);
    expect(events[0].data).toEqual(expect.objectContaining({
      telemetry_schema:2,
      hint_id:'first-deed',
      hint_kind:'first-time'
    }));
    expect(events[1].data).toEqual(expect.objectContaining({
      hint_id:'first-deed',
      interaction:'highlighted-control'
    }));
    expect(events[2].data).toEqual(expect.objectContaining({
      hint_id:'first-deed',
      dismiss_action:'got-it'
    }));
    expect(events[3].data).toEqual(expect.objectContaining({
      hint_id:'first-time-flow'
    }));
    expect(events[4].data).toEqual(expect.objectContaining({
      hint_id:'first-time-flow',
      dismiss_action:'got-it'
    }));
    expect(events[6].data).toEqual(expect.objectContaining({
      hint_id:'telemetry-opt-out',
      disable_scope:'first-time',
      disable_source:'coachmark'
    }));
  });

test('death telemetry distinguishes succession from a completed saga',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await page.evaluate(function () {
      window.__telemetryEvents = [];
      FB.telemetry = {
        enabled:function () { return true; },
        track:function (name, data) {
          window.__telemetryEvents.push({ name:name, data:data });
          return true;
        }
      };
    });
    await startDeterministicGame(page);

    expect(await page.evaluate(function () {
      const firstHeir = FB.heirsOf(FB.state)[0];
      FB.game.die('Synthetic test death');
      FB.ui.closeModal();
      const succeeded = FB.game.succeedTo(firstHeir.id);
      const remainingHeirs = FB.heirsOf(FB.state);
      for (const heir of remainingHeirs) heir.dead = true;
      FB.game.die('Synthetic final death');
      FB.ui.closeModal();
      FB.game.toTitle();
      return {
        succeeded:succeeded,
        eventNames:window.__telemetryEvents.filter(function (event) {
          return event.name.indexOf('hint-') !== 0 &&
            event.name !== 'tips-disabled';
        }).map(function (event) { return event.name; }),
        finalEvent:window.__telemetryEvents[window.__telemetryEvents.length - 1]
      };
    })).toEqual({
      succeeded:true,
      eventNames:[
        'campaign-started',
        'player-life-ended',
        'succession-completed',
        'campaign-ended-no-heir'
      ],
      finalEvent:{
        name:'campaign-ended-no-heir',
        data:expect.objectContaining({
          telemetry_schema:2,
          game_version:expect.stringMatching(/^\d+\.\d+\.\d+$/),
          entry_type:'new-campaign',
          peak_player_tier:1
        })
      }
    });
  });

test('living succession reports a completed retirement explicitly',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await page.evaluate(function () {
      window.__telemetryEvents = [];
      FB.telemetry = {
        enabled:function () { return true; },
        track:function (name, data) {
          window.__telemetryEvents.push({ name:name, data:data });
          return true;
        }
      };
    });
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const firstHeir = FB.heirsOf(FB.state)[0];
      const succeeded = FB.game.succeedTo(firstHeir.id, {
        livingAbdication:true,
        retirement:true
      });
      return {
        succeeded:succeeded,
        event:window.__telemetryEvents[window.__telemetryEvents.length - 1]
      };
    });
    expect(result).toEqual({
      succeeded:true,
      event:{
        name:'retirement-completed',
        data:expect.objectContaining({
          telemetry_schema:2,
          entry_type:'new-campaign',
          dynasty_generation:2
        })
      }
    });
  });
