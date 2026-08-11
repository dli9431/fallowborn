'use strict';

const { test, expect } = require('../support/fixture');
const { openGame, targetUrl } = require('../support/game');

const tracks = [
  ['christian-anglo_saxon-folk-hammer-and-lute', 'Hammer And Lute',
    'christian', 'anglo_saxon', 'folk', 1],
  ['christian-anglo_saxon-folk-market-at-dusk', 'Market At Dusk',
    'christian', 'anglo_saxon', 'folk', 2],
  ['christian-anglo_saxon-folk-millstream', 'Millstream',
    'christian', 'anglo_saxon', 'folk', 3],
  ['christian-anglo_saxon-war-march-of-iron', 'March Of Iron',
    'christian', 'anglo_saxon', 'war', 1],
  ['christian-anglo_saxon-court-candlelit-hall', 'Candlelit Hall',
    'christian', 'anglo_saxon', 'court', 1]
].map(function (item) {
  return {
    id:item[0], title:item[1], faith:item[2], culture:item[3], role:item[4],
    bankId:item[2] + '/' + item[3] + '/' + item[4], order:item[5],
    src:'music/' + item[2] + '/' + item[3] + '/' + item[4] + '/00' + item[5] +
      '-' + item[0].split('-').slice(3).join('-') + '.opus',
    bytes:2000000, duration:180, channels:2, inputRate:48000,
    bitrate:96000, rev:'test-' + item[5] + '-' + item[4]
  };
});

const catalog = {
  schema:1,
  intro:{
    id:'intro-fallowborn', title:'Fallowborn', src:'music/intro/000-fallowborn.opus',
    order:0, bytes:2000000, duration:180, channels:2, inputRate:48000,
    bitrate:96000, rev:'test-intro', kind:'intro'
  },
  tracks:tracks,
  banks:['folk', 'war', 'court'].map(function (role) {
    const records = tracks.filter(function (track) { return track.role === role; });
    return {
      id:'christian/anglo_saxon/' + role,
      faith:'christian', culture:'anglo_saxon', role:role,
      trackIds:records.map(function (track) { return track.id; }),
      bytes:records.length * 2000000,
      duration:records.length * 180
    };
  }),
  totalBytes:12000000,
  totalDuration:1080
};

async function routeSyntheticSoundtrack(page) {
  await page.route('**/data/music_catalog.js', function (route) {
    return route.fulfill({
      contentType:'application/javascript',
      body:'window.FBDATA=window.FBDATA||{};FBDATA.musicCatalog=' +
        JSON.stringify(catalog) + ';'
    });
  });
  await page.route('**/music/**/*.opus*', function (route) {
    return route.fulfill({ contentType:'audio/ogg', body:'synthetic-opus-response' });
  });
}

test('first soundtrack boot, title pause, and background playback preserve state',
  async function ({ page }, testInfo) {
    test.skip(!testInfo.project.name.endsWith('-served'),
      'Synthetic soundtrack responses require the served-origin project.');
    await page.addInitScript(function () {
      HTMLMediaElement.prototype.canPlayType = function () { return 'probably'; };
      window.__musicMediaSession = {
        playbackState:'none', metadata:null, handlers:{},
        setActionHandler:function (name, callback) { this.handlers[name] = callback; }
      };
      Object.defineProperty(navigator, 'mediaSession', {
        configurable:true, value:window.__musicMediaSession
      });
      window.MediaMetadata = function (data) {
        for (const key in data) this[key] = data[key];
      };
      window.__musicAudio = [];
      function FakeAudio() {
        this.currentTime = 0;
        this.error = null;
        this.listeners = {};
        this.loop = false;
        this.networkState = 1;
        this.paused = true;
        this.readyState = 4;
        this.src = '';
        this.volume = 0;
        window.__musicAudio.push(this);
      }
      FakeAudio.prototype.addEventListener = function (name, callback) {
        this.listeners[name] = this.listeners[name] || [];
        this.listeners[name].push(callback);
      };
      FakeAudio.prototype.dispatch = function (name) {
        (this.listeners[name] || []).forEach(function (callback) { callback(); });
      };
      FakeAudio.prototype.load = function () {};
      FakeAudio.prototype.pause = function () {
        this.paused = true;
        this.dispatch('pause');
      };
      FakeAudio.prototype.play = function () {
        this.paused = false;
        this.dispatch('playing');
        return Promise.resolve();
      };
      FakeAudio.prototype.removeAttribute = function (name) {
        if (name === 'src') this.src = '';
      };
      window.Audio = FakeAudio;
    });
    await routeSyntheticSoundtrack(page);
    await page.goto(targetUrl(testInfo), { waitUntil:'domcontentloaded' });

    await expect(page.locator('#music-choice:not(.hidden)')).toBeVisible();
    await expect(page.locator('#music-choice-copy')).toContainText('average song');
    await expect(page.locator('#music-choice-copy')).toContainText('complete soundtrack');
    await page.getByRole('button', { name:'Continue silently', exact:true }).click();
    await expect(page.locator('#title:not(.hidden)')).toBeVisible();
    expect(await page.evaluate(function () {
      return {
        choice:FB.game.uiPrefs.musicChoice,
        stored:JSON.parse(localStorage.getItem('fb_ui')).musicChoice
      };
    })).toEqual({ choice:'off', stored:'off' });

    const titleMusic = page.locator('#btn-title-music');
    await expect(titleMusic).toBeVisible();
    await expect(titleMusic).toHaveText('♫');
    await expect(titleMusic).toHaveAttribute('aria-label', 'Play music');
    await expect(titleMusic).toHaveAttribute('aria-pressed', 'false');
    const musicButtonBox = await titleMusic.evaluate(function (button) {
      const box = button.getBoundingClientRect();
      return {
        width:box.width,
        height:box.height,
        right:window.innerWidth - box.right,
        bottom:window.innerHeight - box.bottom
      };
    });
    expect(musicButtonBox).toEqual(expect.objectContaining({ width:44, height:44 }));
    expect(musicButtonBox.right).toBeLessThanOrEqual(24);
    expect(musicButtonBox.bottom).toBeLessThanOrEqual(24);

    await titleMusic.click();
    await expect(titleMusic).toHaveText('⏸');
    await expect(titleMusic).toHaveAttribute('aria-label', 'Pause music');
    await expect(titleMusic).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(function () {
      return {
        choice:FB.game.uiPrefs.musicChoice,
        stored:JSON.parse(localStorage.getItem('fb_ui')).musicChoice
      };
    })).toEqual({ choice:'on', stored:'on' });
    await expect.poll(function () {
      return page.evaluate(function () {
        return window.__musicAudio.some(function (item) { return item.src && !item.paused; });
      });
    }).toBe(true);
    const playingSrc = await page.evaluate(function () {
      window.__titleAudio = window.__musicAudio.filter(function (item) {
        return item.src && !item.paused;
      })[0];
      window.__titleAudio.currentTime = 47;
      return window.__titleAudio.src;
    });
    expect(await page.evaluate(function () {
      return {
        nativeLoop:window.__titleAudio.loop,
        mediaTitle:window.__musicMediaSession.metadata.title,
        playbackState:window.__musicMediaSession.playbackState,
        actions:Object.keys(window.__musicMediaSession.handlers).sort()
      };
    })).toEqual({
      nativeLoop:true,
      mediaTitle:'Fallowborn',
      playbackState:'playing',
      actions:['nexttrack', 'pause', 'play', 'previoustrack']
    });

    await titleMusic.click();
    await expect(titleMusic).toHaveText('♫');
    await expect(titleMusic).toHaveAttribute('aria-label', 'Play music');
    await expect(titleMusic).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(function () {
      return {
        paused:window.__titleAudio.paused,
        currentTime:window.__titleAudio.currentTime,
        choice:FB.game.uiPrefs.musicChoice,
        stored:JSON.parse(localStorage.getItem('fb_ui')).musicChoice
      };
    })).toEqual({ paused:true, currentTime:47, choice:'off', stored:'off' });

    await titleMusic.click();
    await expect(titleMusic).toHaveText('⏸');
    await expect(titleMusic).toHaveAttribute('aria-label', 'Pause music');
    expect(await page.evaluate(function () {
      return {
        sameElement:window.__musicAudio.filter(function (item) {
          return item.src && !item.paused;
        })[0] === window.__titleAudio,
        src:window.__titleAudio.src,
        paused:window.__titleAudio.paused,
        currentTime:window.__titleAudio.currentTime,
        choice:FB.game.uiPrefs.musicChoice,
        stored:JSON.parse(localStorage.getItem('fb_ui')).musicChoice
      };
    })).toEqual({
      sameElement:true, src:playingSrc, paused:false, currentTime:47,
      choice:'on', stored:'on'
    });

    expect(await page.evaluate(function () {
      FB.music.setBackgroundPlayback(true);
      window.dispatchEvent(new Event('blur'));
      return {
        paused:window.__titleAudio.paused,
        choice:FB.game.uiPrefs.musicChoice,
        background:FB.music.backgroundPlaybackEnabled()
      };
    })).toEqual({ paused:false, choice:'on', background:true });
    await page.evaluate(function () { window.dispatchEvent(new Event('focus')); });
    expect(await page.evaluate(function () {
      Object.defineProperty(document, 'hidden', { configurable:true, value:true });
      document.dispatchEvent(new Event('visibilitychange'));
      return window.__titleAudio.paused;
    })).toBe(false);
    await page.evaluate(function () { window.__titleAudio.pause(); });
    await expect.poll(function () {
      return page.evaluate(function () {
        return {
          playing:!window.__titleAudio.paused,
          playbackState:window.__musicMediaSession.playbackState,
          recovered:FB.music.playbackDiagnostics().some(function (entry) {
            return entry.type === 'recover-pause';
          })
        };
      });
    }).toEqual({ playing:true, playbackState:'playing', recovered:true });
    await page.evaluate(function () {
      Object.defineProperty(document, 'hidden', { configurable:true, value:false });
      document.dispatchEvent(new Event('visibilitychange'));
      FB.music.setBackgroundPlayback(false);
    });

    await titleMusic.click();
    await expect(titleMusic).toHaveText('♫');
    expect(await page.evaluate(function () {
      return JSON.parse(localStorage.getItem('fb_ui')).musicChoice;
    })).toBe('off');
    await page.reload({ waitUntil:'domcontentloaded' });
    await expect(page.locator('#title:not(.hidden)')).toBeVisible();
    await expect(page.locator('#music-choice')).toHaveClass(/hidden/);
    await expect(titleMusic).toHaveText('♫');
    expect(await page.evaluate(function () {
      return {
        choice:FB.game.uiPrefs.musicChoice,
        stored:JSON.parse(localStorage.getItem('fb_ui')).musicChoice,
        playing:window.__musicAudio.some(function (item) { return item.src && !item.paused; })
      };
    })).toEqual({ choice:'off', stored:'off', playing:false });

    await page.locator('#btn-newgame').click();
    await page.locator('#ng-fresh').click();
    await expect(page.locator('#bookmarks:not(.hidden)')).toBeVisible();
    await expect(titleMusic).toBeVisible();
    await page.locator('#btn-bm-back').click();

    await page.locator('#btn-settings').click();
    const shortcutEntry = page.locator('#set-shortcuts');
    await expect(shortcutEntry).toBeVisible();
    await expect(shortcutEntry.locator('.shortcut-settings-title'))
      .toHaveText('Keyboard shortcuts…');
    const shortcutLayout = await shortcutEntry.evaluate(function (button) {
      const title = button.querySelector('.shortcut-settings-title').getBoundingClientRect();
      const description = button.querySelector('.adesc').getBoundingClientRect();
      return {
        descriptionDisplay:getComputedStyle(button.querySelector('.adesc')).display,
        descriptionBelow:description.top >= title.bottom,
        contained:button.scrollWidth <= button.clientWidth + 1
      };
    });
    expect(shortcutLayout).toEqual({
      descriptionDisplay:'block', descriptionBelow:true, contained:true
    });
    await page.locator('#gm-back').click();

    await page.setViewportSize({ width:390, height:740 });
    await page.locator('#btn-settings').click();
    await expect(page.locator('#set-shortcuts')).toHaveCount(0);
  });

test('context banks, playback controls, and listening history stay consistent',
  async function ({ page }, testInfo) {
    test.skip(!testInfo.project.name.endsWith('-served'),
      'Synthetic soundtrack responses require the served-origin project.');

    await page.addInitScript(function () {
      localStorage.setItem('fb_ui', JSON.stringify({
        musicChoice:'on',
        musicVolume:0.55,
        musicPreferred:{},
        musicRatings:{},
        musicOfflineBanks:{}
      }));
      HTMLMediaElement.prototype.canPlayType = function () { return 'probably'; };
      window.__gameMusicMediaSession = {
        playbackState:'none', metadata:null, handlers:{},
        setActionHandler:function (name, callback) { this.handlers[name] = callback; }
      };
      Object.defineProperty(navigator, 'mediaSession', {
        configurable:true, value:window.__gameMusicMediaSession
      });
      window.MediaMetadata = function (data) {
        for (const key in data) this[key] = data[key];
      };
      function FakeAudio() {
        this.currentTime = 0;
        this.error = null;
        this.listeners = {};
        this.loop = false;
        this.networkState = 1;
        this.paused = true;
        this.readyState = 4;
        this.src = '';
        this.volume = 0;
        window.__gameMusicAudio = window.__gameMusicAudio || [];
        window.__gameMusicAudio.push(this);
      }
      FakeAudio.prototype.addEventListener = function (name, callback) {
        this.listeners[name] = this.listeners[name] || [];
        this.listeners[name].push(callback);
      };
      FakeAudio.prototype.dispatch = function (name) {
        (this.listeners[name] || []).forEach(function (callback) { callback(); });
      };
      FakeAudio.prototype.load = function () {};
      FakeAudio.prototype.pause = function () {
        this.paused = true;
        this.dispatch('pause');
      };
      FakeAudio.prototype.play = function () {
        this.paused = false;
        window.__lastGameMusicAudio = this;
        this.dispatch('playing');
        return Promise.resolve();
      };
      FakeAudio.prototype.removeAttribute = function (name) {
        if (name === 'src') this.src = '';
      };
      FakeAudio.prototype.finish = function () {
        if (this.loop) {
          this.currentTime = 0;
          this.paused = false;
          return;
        }
        this.paused = true;
        this.dispatch('ended');
      };
      window.__finishGameMusic = function () {
        const playing = window.__gameMusicAudio.filter(function (item) {
          return item.src && !item.paused;
        });
        if (!playing.length) throw new Error('No playing soundtrack element');
        playing.forEach(function (item) { item.finish(); });
      };
      window.Audio = FakeAudio;
    });
    await routeSyntheticSoundtrack(page);
    await openGame(page, testInfo);
    await expect(page.locator('#btn-title-music')).toBeVisible();

    const context = await page.evaluate(function () {
      const state = {
        seed:'music-test',
        player:{ charId:'me', tier:1, profession:'farmer', flags:{}, liege:'lord' },
        chars:{ me:{ id:'me', religion:'christian', culture:'anglo_saxon' } },
        realms:{
          lord:{ id:'lord', alive:true, liege:null, war:null },
          foe:{ id:'foe', alive:true, liege:null, war:null }
        }
      };
      const folk = FB.music.resolveBank(state).id;
      state.realms.lord.war = { enemy:'foe' };
      const realmWar = FB.music.resolveBank(state).id;
      state.realms.lord.war = null;
      state.player.profession = 'soldier';
      const war = FB.music.resolveBank(state).id;
      state.player.profession = 'farmer';
      state.player.tier = 3;
      const court = FB.music.resolveBank(state).id;
      state.player.tier = 1;
      // Never install this stub as FB.state: the real UI (topbar refresh,
      // role orientations, autosave) dereferences a full game state and
      // throws against this partial one. Every sync takes the stub explicitly.
      window.__musicContextState = state;
      FB.ui.showScreen(null);
      FB.platform.isItch = true;
      FB.music.sync(state, true);
      const itchFolkBank = FB.music.currentBank();
      state.realms.lord.war = { enemy:'foe' };
      FB.music.sync(state, true);
      const itchWarBank = FB.music.currentBank();
      FB.platform.isItch = false;
      state.realms.lord.war = null;
      FB.music.sync(state, true);
      return {
        folk:folk, realmWar:realmWar, war:war, court:court,
        itchFolk:itchFolkBank ? itchFolkBank.id : null,
        itchWar:itchWarBank ? itchWarBank.id : null,
        first:FB.music.current().id
      };
    });
    expect(context).toEqual(expect.objectContaining({
      folk:'christian/anglo_saxon/folk',
      realmWar:'christian/anglo_saxon/war',
      war:'christian/anglo_saxon/war',
      court:'christian/anglo_saxon/court',
      itchFolk:'christian/anglo_saxon/folk',
      itchWar:'christian/anglo_saxon/war'
    }));
    await expect(page.locator('#btn-title-music')).toBeHidden();

    const quickToggle = page.locator('#music-now-playing-toggle');
    await expect(quickToggle).toBeVisible();
    await expect(quickToggle).toHaveAttribute('aria-label', 'Pause music');
    await expect(quickToggle).toHaveAttribute('aria-pressed', 'true');
    expect(await page.locator('.music-now-playing-controls').evaluate(function (controls) {
      const title = controls.querySelector('#music-now-playing').getBoundingClientRect();
      const toggle = controls.querySelector('#music-now-playing-toggle').getBoundingClientRect();
      return {
        toggleToRight:toggle.left >= title.right,
        toggleWidth:toggle.width,
        toggleHeight:toggle.height
      };
    })).toEqual({ toggleToRight:true, toggleWidth:34, toggleHeight:34 });

    await expect.poll(function () {
      return page.evaluate(function () {
        return window.__gameMusicAudio.some(function (item) {
          return item.src && !item.paused;
        });
      });
    }).toBe(true);

    expect(await page.evaluate(function () {
      const active = window.__lastGameMusicAudio;
      FB.music.setRepeat(true);
      const repeating = active.loop;
      FB.music.setRepeat(false);
      return {
        repeating:repeating,
        stoppedRepeating:!active.loop,
        playbackState:window.__gameMusicMediaSession.playbackState,
        mediaTitle:window.__gameMusicMediaSession.metadata.title
      };
    })).toEqual({
      repeating:true,
      stoppedRepeating:true,
      playbackState:'playing',
      mediaTitle:expect.any(String)
    });

    await quickToggle.click();
    await expect(quickToggle).toHaveAttribute('aria-label', 'Play music');
    await expect(quickToggle).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(function () {
      return {
        paused:FB.music.isPaused(),
        anyPlaying:window.__gameMusicAudio.some(function (item) {
          return item.src && !item.paused;
        }),
        choice:FB.game.uiPrefs.musicChoice
      };
    })).toEqual({ paused:true, anyPlaying:false, choice:'on' });

    await quickToggle.click();
    await expect(quickToggle).toHaveAttribute('aria-label', 'Pause music');
    expect(await page.evaluate(function () {
      window.dispatchEvent(new Event('blur'));
      return {
        paused:FB.music.isPaused(),
        anyPlaying:window.__gameMusicAudio.some(function (item) {
          return item.src && !item.paused;
        }),
        choice:FB.game.uiPrefs.musicChoice
      };
    })).toEqual({ paused:false, anyPlaying:false, choice:'on' });
    expect(await page.evaluate(function () {
      window.dispatchEvent(new Event('focus'));
      return window.__gameMusicAudio.some(function (item) {
        return item.src && !item.paused;
      });
    })).toBe(true);

    await page.evaluate(function () { FB.ui.showSettings(); });
    const backgroundPlayback = page.locator('#set-music-background');
    await expect(backgroundPlayback).toBeVisible();
    await expect(backgroundPlayback).not.toBeChecked();
    await backgroundPlayback.check();
    expect(await page.evaluate(function () {
      return {
        preference:FB.music.backgroundPlaybackEnabled(),
        stored:JSON.parse(localStorage.getItem('fb_ui')).musicBackgroundPlayback
      };
    })).toEqual({ preference:true, stored:true });
    await page.evaluate(function () { FB.ui.closeModal(); });
    expect(await page.evaluate(function () {
      window.dispatchEvent(new Event('blur'));
      return {
        paused:FB.music.isPaused(),
        anyPlaying:window.__gameMusicAudio.some(function (item) {
          return item.src && !item.paused;
        })
      };
    })).toEqual({ paused:false, anyPlaying:true });
    await page.evaluate(function () { window.dispatchEvent(new Event('focus')); });
    await expect.poll(function () {
      return page.evaluate(function () {
        return FB.music.playbackDiagnostics().some(function (entry) {
          return entry.type === 'prepared-next';
        });
      });
    }).toBe(true);
    const backgroundTransition = await page.evaluate(function () {
      Object.defineProperty(document, 'hidden', { configurable:true, value:true });
      document.dispatchEvent(new Event('visibilitychange'));
      const before = FB.music.current().id;
      window.__lastGameMusicAudio.finish();
      return {
        changed:FB.music.current().id !== before,
        playing:!window.__lastGameMusicAudio.paused,
        volume:window.__lastGameMusicAudio.volume,
        playbackState:window.__gameMusicMediaSession.playbackState
      };
    });
    expect(backgroundTransition).toEqual({
      changed:true,
      playing:true,
      volume:0.55,
      playbackState:'playing'
    });
    await page.evaluate(function () {
      Object.defineProperty(document, 'hidden', { configurable:true, value:false });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.evaluate(function () { FB.ui.showSettings(); });
    await expect(backgroundPlayback).toBeChecked();
    await backgroundPlayback.uncheck();
    expect(await page.evaluate(function () {
      return JSON.parse(localStorage.getItem('fb_ui')).musicBackgroundPlayback;
    })).toBe(false);
    await page.evaluate(function () { FB.ui.closeModal(); });

    await quickToggle.click();
    expect(await page.evaluate(function () {
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('focus'));
      return {
        paused:FB.music.isPaused(),
        anyPlaying:window.__gameMusicAudio.some(function (item) {
          return item.src && !item.paused;
        })
      };
    })).toEqual({ paused:true, anyPlaying:false });
    await quickToggle.click();

    const navigation = await page.evaluate(function () {
      const first = FB.music.current().id;
      FB.music.next();
      const second = FB.music.current().id;
      FB.music.previous();
      const previous = FB.music.current().id;
      FB.ui.showMusicTrack();
      return { first:first, second:second, previous:previous };
    });
    expect(navigation.second).not.toBe(navigation.first);
    expect(navigation.previous).toBe(navigation.first);
    const musicPrevious = page.locator('#music-previous');
    const musicPlayback = page.locator('#music-playback');
    const musicNext = page.locator('#music-next');
    await expect(musicPrevious).toBeEnabled();
    await expect(musicPlayback).toHaveText('⏸ Pause');
    await expect(musicNext).toBeVisible();
    await expect(page.locator('#music-up')).toHaveCount(0);

    expect(await page.locator('.music-track-navigation > button').evaluateAll(function (buttons) {
      return buttons.map(function (button) { return button.id; });
    })).toEqual(['music-previous', 'music-playback', 'music-next']);

    await musicPlayback.click();
    await expect(musicPlayback).toHaveText('▶ Play');
    expect(await page.evaluate(function () {
      return {
        paused:FB.music.isPaused(),
        anyPlaying:window.__gameMusicAudio.some(function (item) {
          return item.src && !item.paused;
        }),
        choice:FB.game.uiPrefs.musicChoice
      };
    })).toEqual({ paused:true, anyPlaying:false, choice:'on' });

    await musicPlayback.click();
    await expect(musicPlayback).toHaveText('⏸ Pause');
    expect(await page.evaluate(function () {
      return {
        paused:FB.music.isPaused(),
        anyPlaying:window.__gameMusicAudio.some(function (item) {
          return item.src && !item.paused;
        })
      };
    })).toEqual({ paused:false, anyPlaying:true });

    await musicNext.click();
    await expect(musicPrevious).toBeEnabled();
    expect(await page.evaluate(function () { return FB.music.current().id; }))
      .toBe(navigation.second);

    const ratedTrack = await page.evaluate(function () {
      window.__musicTelemetry = [];
      FB.platform.isPlay = true;
      FB.trackTelemetry = function (name, data) {
        window.__musicTelemetry.push({ name:name, data:data });
        return true;
      };
      FB.ui.showMusicTrack(true);
      return FB.music.current().id;
    });
    await page.getByRole('button', { name:'👍 Like', exact:true }).click();
    expect(await page.evaluate(function () { return window.__musicTelemetry; })).toEqual([{
      name:'music-rating',
      data:expect.objectContaining({
        track_id:ratedTrack,
        track_title:expect.any(String),
        rating:'up',
        music_role:'folk'
      })
    }]);

    await page.getByRole('button', { name:'👎 Dislike', exact:true }).click();
    expect(await page.evaluate(function () { return window.__musicTelemetry; })).toEqual([
      expect.objectContaining({
        name:'music-rating',
        data:expect.objectContaining({ track_id:ratedTrack, rating:'up' })
      }),
      expect.objectContaining({
        name:'music-rating',
        data:expect.objectContaining({ track_id:ratedTrack, rating:'down' })
      })
    ]);

    const queuedContext = await page.evaluate(function () {
      const state = window.__musicContextState;
      const first = FB.music.current().id;
      state.realms.lord.war = { enemy:'foe' };
      FB.music.sync(state);
      const atWar = FB.music.current().id;
      state.realms.lord.war = null;
      FB.music.sync(state);
      const atPeaceAgain = FB.music.current().id;
      state.realms.lord.war = { enemy:'foe' };
      FB.music.sync(state);
      window.__finishGameMusic();
      return {
        first:first,
        atWar:atWar,
        atPeaceAgain:atPeaceAgain,
        afterEndRole:FB.music.current().role,
        afterEndBank:FB.music.currentBank().id
      };
    });
    expect(queuedContext).toEqual({
      first:queuedContext.first,
      atWar:queuedContext.first,
      atPeaceAgain:queuedContext.first,
      afterEndRole:'war',
      afterEndBank:'christian/anglo_saxon/war'
    });

    await expect.poll(function () {
      return page.evaluate(function () {
        return window.__gameMusicAudio.some(function (item) {
          return item.src && !item.paused;
        });
      });
    }).toBe(true);

    const peaceContext = await page.evaluate(function () {
      const state = window.__musicContextState;
      const warTrack = FB.music.current().id;
      state.realms.lord.war = null;
      FB.music.sync(state);
      const beforeEnd = FB.music.current().id;
      window.__finishGameMusic();
      return {
        warTrack:warTrack,
        beforeEnd:beforeEnd,
        afterEndRole:FB.music.current().role,
        afterEndBank:FB.music.currentBank().id
      };
    });
    expect(peaceContext).toEqual({
      warTrack:peaceContext.warTrack,
      beforeEnd:peaceContext.warTrack,
      afterEndRole:'folk',
      afterEndBank:'christian/anglo_saxon/folk'
    });

    await page.setViewportSize({ width:390, height:740 });
    expect(await quickToggle.evaluate(function (button) {
      const box = button.getBoundingClientRect();
      return { width:box.width, height:box.height };
    })).toEqual({ width:44, height:44 });
  });
