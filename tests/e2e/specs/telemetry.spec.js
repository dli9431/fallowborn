'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame
} = require('../support/game');

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
          'script[src="https://stats.fallowborn.com/script.js"]').length
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

test('gameplay telemetry reports lifecycle and bounded engagement events',
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
    let events = await page.evaluate(function () {
      return window.__telemetryEvents;
    });
    expect(events[0]).toEqual({
      name:'game-start',
      data:expect.objectContaining({
        version:expect.stringMatching(/^\d+\.\d+\.\d+$/),
        locale:'en',
        bookmark:'867',
        tier:1,
        generation:1,
        mode:'new',
        scenario:'farmer',
        family_preset:'standard'
      })
    });
    expect(['name', 'dynasty', 'seed', 'province', 'save'].filter(function (key) {
      return Object.prototype.hasOwnProperty.call(events[0].data, key);
    })).toEqual([]);

    await page.evaluate(function () {
      const realNow = Date.now;
      let simulatedNow = realNow();
      Date.now = function () { return simulatedNow; };
      for (let i = 0; i < 120; i++) {
        simulatedNow += 15000;
        document.dispatchEvent(new Event('visibilitychange'));
      }
      Date.now = realNow;
    });
    events = await page.evaluate(function () {
      return window.__telemetryEvents;
    });
    expect(events.map(function (event) { return event.name; })).toEqual([
      'game-start', 'play-1m', 'play-5m', 'play-15m', 'play-30m'
    ]);

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
      name:'game-continue',
      data:expect.objectContaining({
        version:expect.stringMatching(/^\d+\.\d+\.\d+$/),
        bookmark:'867',
        mode:'continue'
      })
    });

    await page.evaluate(function () {
      FB.game.toTitle();
      FB.game.startObserve();
    });
    events = await page.evaluate(function () {
      return window.__telemetryEvents;
    });
    expect(events.slice(-2).map(function (event) { return event.name; }))
      .toEqual(['game-exit', 'observe-start']);
    expect(events[events.length - 1].data).toEqual(expect.objectContaining({
      version:expect.stringMatching(/^\d+\.\d+\.\d+$/),
      bookmark:'867',
      mode:'observe'
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
        eventNames:window.__telemetryEvents.map(function (event) {
          return event.name;
        }),
        finalEvent:window.__telemetryEvents[window.__telemetryEvents.length - 1]
      };
    })).toEqual({
      succeeded:true,
      eventNames:['game-start', 'life-ended', 'succession', 'game-over'],
      finalEvent:{
        name:'game-over',
        data:expect.objectContaining({
          version:expect.stringMatching(/^\d+\.\d+\.\d+$/),
          mode:'new',
          peak_tier:1
        })
      }
    });
  });
