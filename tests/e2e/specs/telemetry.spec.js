'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html',
  'js/events.js',
  'js/main.js',
  'js/portrait.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'data/bookmarks.js',
  'data/cultures.js',
  'data/events_tutorial.js',
  'data/starts.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const {
  START_CODE, startDeterministicGame, unlockStartTier
} = require('../support/game/start');

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

test('New Game telemetry reports each setup screen once per attempt',
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
    await unlockStartTier(page, 1);

    await page.getByRole('button', { name:'New Game', exact:true }).click();
    for (let i = 0; i < 2; i++) {
      await page.locator('#btn-bm-seed').click();
      await page.getByRole('button', { name:'Cancel', exact:true }).click();
    }
    await page.locator('#bookmarklist .scencard').first().click();
    await page.getByRole('button', { name:/Free Farmer/ }).click();
    await page.getByRole('button', { name:'Random Province', exact:true }).click();
    await page.getByRole('button', { name:'Continue', exact:true }).click();
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();

    // Revisit every guided screen; none should emit a second view.
    await page.locator('#btn-cg-back').click();
    await page.locator('#btn-pick-back').click();
    await page.locator('#btn-pick-back').click();
    await page.locator('#btn-ng-back').click();
    await page.locator('#bookmarklist .scencard').first().click();

    const events = await page.evaluate(function () {
      return window.__telemetryEvents.filter(function (event) {
        return event.name.indexOf('new-game-') === 0;
      });
    });
    expect(events.map(function (event) { return event.name; })).toEqual([
      'new-game-starting-date-viewed',
      'new-game-seed-dialog-viewed',
      'new-game-beginning-viewed',
      'new-game-birthplace-viewed',
      'new-game-character-viewed'
    ]);
    expect(events[0].data).toEqual(expect.objectContaining({
      telemetry_schema:2,
      game_version:expect.stringMatching(/^\d+\.\d+\.\d+$/),
      locale:'en'
    }));
    expect(events[2].data).toEqual(expect.objectContaining({
      start_bookmark:'867'
    }));
    expect(events[3].data).toEqual(expect.objectContaining({
      start_bookmark:'867',
      scenario:'farmer'
    }));
    expect(events[4].data).toEqual(expect.objectContaining({
      start_bookmark:'867',
      scenario:'farmer'
    }));
    expect(events.filter(function (event) {
      return Object.prototype.hasOwnProperty.call(event.data, 'start_bookmark');
    }).every(function (event) {
      return !Object.prototype.hasOwnProperty.call(event.data, 'game_year');
    })).toBe(true);
    expect(events.some(function (event) {
      return ['name', 'dynasty', 'seed', 'province', 'save'].some(function (key) {
        return Object.prototype.hasOwnProperty.call(event.data, key);
      });
    })).toBe(false);
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
    const campaignStarted = events.filter(function (event) {
      return event.name === 'campaign-started';
    })[0];
    expect(campaignStarted).toEqual({
      name:'campaign-started',
      data:expect.objectContaining({
        telemetry_schema:2,
        game_version:expect.stringMatching(/^\d+\.\d+\.\d+$/),
        locale:'en',
        start_bookmark:'867',
        player_tier:1,
        dynasty_generation:1,
        game_year:867,
        entry_type:'new-campaign',
        quick_start:'custom',
        scenario:'farmer',
        family_preset:'standard',
        starting_location:'london',
        starting_culture:'english',
        starting_religion:'catholic'
      })
    });
    expect(['name', 'dynasty', 'seed', 'province', 'save'].filter(function (key) {
      return Object.prototype.hasOwnProperty.call(campaignStarted.data, key);
    })).toEqual([]);
    expect(await page.evaluate(function () {
      return FB.state.telemetry;
    })).toEqual({
      version:1,
      quickStart:'custom',
      firstDayAdvanced:0,
      firstEventResolved:0
    });

    await page.evaluate(function () {
      FB.game.passDay({ deferUi:true });
      const ev = FB.eventById('tut_welcome');
      FB.resolveEventOption(FB.state, ev, ev.options[0],
        FB.eventContext(FB.state, {}), { automated:false });
    });

    await page.evaluate(function () {
      for (let i = 0; i < 240; i++) {
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
      'new-game-starting-date-viewed',
      'new-game-seed-dialog-viewed',
      'new-game-character-viewed',
      'campaign-started',
      'hint-shown',
      'first-day-advanced',
      'first-event-resolved',
      'active-play-reached-1-minute',
      'active-play-reached-5-minutes',
      'active-play-reached-15-minutes',
      'active-play-reached-30-minutes',
      'active-play-reached-60-minutes',
      'active-play-checkpoint'
    ]);
    expect(events[events.length - 1].data).toEqual(expect.objectContaining({
      entry_type:'new-campaign',
      active_seconds:3600,
      checkpoint_reason:'page-hide',
      game_year:867,
      quick_start:'custom'
    }));
    expect(events.filter(function (event) {
      return event.name === 'first-event-resolved';
    })[0].data).toEqual(expect.objectContaining({
      resolution_mode:'manual',
      quick_start:'custom'
    }));
    expect(events.filter(function (event) {
      return event.name.indexOf('new-game-') !== 0 &&
        Object.prototype.hasOwnProperty.call(event.data, 'start_bookmark');
    }).every(function (event) {
      return Number.isFinite(event.data.game_year);
    })).toBe(true);

    const saved = await page.evaluate(function () {
      return JSON.parse(FB.save.serialize());
    });
    await page.evaluate(function (data) {
      window.__telemetryResumeRealNow = Date.now;
      window.__telemetryResumeNow = Date.now();
      Date.now = function () { return window.__telemetryResumeNow; };
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
        game_year:867,
        entry_type:'resumed-campaign',
        quick_start:'custom'
      })
    });

    await page.evaluate(function () {
      for (let i = 0; i < 4; i++) {
        window.__telemetryResumeNow += 15000;
        document.dispatchEvent(new Event('visibilitychange'));
      }
    });

    await page.evaluate(function (data) {
      return new Promise(function (resolve, reject) {
        if (!FB.game.loadData(data, resolve)) {
          reject(new Error('Second synthetic save was rejected'));
        }
      });
    }, saved);
    expect(await page.evaluate(function () {
      for (let i = 0; i < 16; i++) {
        window.__telemetryResumeNow += 15000;
        document.dispatchEvent(new Event('visibilitychange'));
      }
      Date.now = window.__telemetryResumeRealNow;
      delete window.__telemetryResumeRealNow;
      delete window.__telemetryResumeNow;
      const resumeEvents = window.__telemetryEvents.filter(function (event) {
        return event.name === 'campaign-resumed';
      });
      const resumedMilestones = window.__telemetryEvents.filter(function (event) {
        return event.data.entry_type === 'resumed-campaign' &&
          event.name.indexOf('active-play-reached-') === 0;
      });
      return {
        resumes:resumeEvents.length,
        milestones:resumedMilestones.map(function (event) {
          return event.name;
        }),
        origins:resumedMilestones.map(function (event) {
          return event.data.quick_start;
        })
      };
    })).toEqual({
      resumes:1,
      milestones:[
        'active-play-reached-1-minute',
        'active-play-reached-5-minutes'
      ],
      origins:['custom', 'custom']
    });

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
      game_year:867,
      entry_type:'observer-mode'
    }));
  });

test('campaign telemetry identifies the selected quick start',
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
    await page.locator('[data-quick-start="biera_1066"]').click();
    await expect(page.getByRole('heading', {
      name:'Your Story Begins', exact:true
    })).toBeVisible({ timeout:30 * 1000 });

    const events = await page.evaluate(function () {
      return window.__telemetryEvents;
    });
    const campaignStarted = events.filter(function (event) {
      return event.name === 'campaign-started';
    });
    expect(campaignStarted).toHaveLength(1);
    expect(campaignStarted[0].data).toEqual(expect.objectContaining({
      telemetry_schema:2,
      entry_type:'new-campaign',
      quick_start:'biera_1066',
      scenario:'serf',
      start_bookmark:'1066',
      starting_location:'norrland',
      starting_culture:'sami',
      starting_religion:'norse_pagan'
    }));
    expect(await page.evaluate(function () {
      return FB.state.telemetry;
    })).toEqual({
      version:1,
      quickStart:'biera_1066',
      firstDayAdvanced:0,
      firstEventResolved:0
    });
    expect(events.filter(function (event) {
      return event.name.indexOf('new-game-') === 0;
    }).map(function (event) { return event.name; })).toEqual([
      'new-game-starting-date-viewed'
    ]);

    const resumed = await page.evaluate(function () {
      const saved = JSON.parse(FB.save.serialize());
      FB.game.passDay({ deferUi:true });
      return new Promise(function (resolve, reject) {
        if (!FB.game.loadData(saved, function () {
          resolve({
            record:FB.state.telemetry,
            resumeEvent:window.__telemetryEvents.filter(function (event) {
              return event.name === 'campaign-resumed';
            })[0],
            firstDayEvent:window.__telemetryEvents.filter(function (event) {
              return event.name === 'first-day-advanced';
            })[0]
          });
        })) reject(new Error('Synthetic quick-start save was rejected'));
      });
    });
    expect(resumed.record).toEqual({
      version:1,
      quickStart:'biera_1066',
      firstDayAdvanced:0,
      firstEventResolved:0
    });
    expect(resumed.resumeEvent.data).toEqual(expect.objectContaining({
      entry_type:'resumed-campaign',
      quick_start:'biera_1066'
    }));
    expect(resumed.firstDayEvent.data).toEqual(expect.objectContaining({
      entry_type:'new-campaign',
      quick_start:'biera_1066'
    }));
  });

test('legacy saves do not invent campaign activation telemetry',
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
      const saved = JSON.parse(FB.save.serialize());
      delete saved.state.telemetry;
      window.__telemetryEvents = [];
      return new Promise(function (resolve, reject) {
        if (!FB.game.loadData(saved, function () {
          FB.game.passDay({ deferUi:true });
          const ev = FB.eventById('tut_welcome');
          FB.resolveEventOption(FB.state, ev, ev.options[0],
            FB.eventContext(FB.state, {}), { automated:false });
          resolve({
            record:FB.state.telemetry,
            events:window.__telemetryEvents
          });
        })) reject(new Error('Synthetic legacy save was rejected'));
      });
    });
    expect(result.record).toEqual({
      version:1,
      quickStart:'unknown',
      firstDayAdvanced:1,
      firstEventResolved:1
    });
    expect(result.events.map(function (event) { return event.name; }))
      .toEqual(['campaign-resumed']);
    expect(result.events[0].data).toEqual(expect.objectContaining({
      quick_start:'unknown'
    }));
  });

test('visibility checkpoints require meaningful new active time',
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
      window.__telemetryEvents = [];
      const realNow = Date.now;
      let now = Date.now();
      let hidden = false;
      Date.now = function () { return now; };
      Object.defineProperty(document, 'hidden', {
        configurable:true,
        get:function () { return hidden; }
      });
      function addVisibleSeconds(seconds) {
        hidden = false;
        now += seconds * 1000;
        document.dispatchEvent(new Event('visibilitychange'));
      }
      function hidePage() {
        hidden = true;
        document.dispatchEvent(new Event('visibilitychange'));
        hidden = false;
        document.dispatchEvent(new Event('visibilitychange'));
      }
      addVisibleSeconds(10);
      hidePage();
      addVisibleSeconds(30);
      hidePage();
      addVisibleSeconds(30);
      hidePage();
      addVisibleSeconds(15);
      window.dispatchEvent(new Event('pagehide'));
      Date.now = realNow;
      delete document.hidden;
      return window.__telemetryEvents.filter(function (event) {
        return event.name === 'active-play-checkpoint';
      }).map(function (event) {
        return {
          seconds:event.data.active_seconds,
          reason:event.data.checkpoint_reason
        };
      });
    })).toEqual([
      { seconds:10, reason:'page-hidden' },
      { seconds:70, reason:'page-hidden' },
      { seconds:85, reason:'page-hide' }
    ]);
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

    await unlockStartTier(page, 1);
    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#btn-bm-seed').click();
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
    await expect(coach).toHaveCount(0);
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
      dismiss_action:'highlighted-control'
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
            event.name.indexOf('new-game-') !== 0 &&
            event.name !== 'tips-disabled';
        }).map(function (event) { return event.name; }),
        missingCampaignYear:window.__telemetryEvents.filter(function (event) {
          return event.name.indexOf('new-game-') !== 0 &&
            Object.prototype.hasOwnProperty.call(event.data, 'start_bookmark') &&
            !Number.isFinite(event.data.game_year);
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
      missingCampaignYear:[],
      finalEvent:{
        name:'campaign-ended-no-heir',
        data:expect.objectContaining({
          telemetry_schema:2,
          game_version:expect.stringMatching(/^\d+\.\d+\.\d+$/),
          start_bookmark:'867',
          game_year:867,
          entry_type:'new-campaign',
          quick_start:'custom',
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
          start_bookmark:'867',
          game_year:867,
          entry_type:'new-campaign',
          quick_start:'custom',
          dynasty_generation:2
        })
      }
    });
  });
