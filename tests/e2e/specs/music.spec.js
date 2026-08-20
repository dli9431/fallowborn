'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/music.js',
  'js/main.js',
  'js/save.js',
  'js/ui_misc.js',
  'css/style.css',
  'data/music_catalog.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame, targetUrl } = require('../support/game/navigation');
const { unlockStartTier } = require('../support/game/start');

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

const intros = ['christian', 'muslim', 'pagan'].map(function (faith) {
  return {
    id:'intro-fallowborn-' + faith,
    title:'Fallowborn ' + faith.charAt(0).toUpperCase() + faith.slice(1),
    src:'music/intro/000-fallowborn-' + faith + '.opus',
    order:0, bytes:2000000, duration:180, channels:2, inputRate:48000,
    bitrate:96000, rev:'test-intro-' + faith, kind:'intro', faith:faith,
    culture:'all', role:'theme', bankId:faith + '/all/theme'
  };
});

const catalog = {
  schema:1,
  intro:intros[0],
  intros:intros,
  tracks:tracks,
  banks:['folk', 'war', 'court'].map(function (role) {
    const records = tracks.filter(function (track) { return track.role === role; });
    return {
      id:'christian/anglo_saxon/' + role,
      faith:'christian', culture:'anglo_saxon', role:role,
      trackIds:records.map(function (track) { return track.id; }).concat(intros[0].id),
      bytes:(records.length + 1) * 2000000,
      duration:(records.length + 1) * 180
    };
  }),
  totalBytes:16000000,
  totalDuration:1440
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
    await page.setViewportSize({ width:320, height:800 });
    await page.goto(targetUrl(testInfo), { waitUntil:'domcontentloaded' });

    await expect(page.locator('#music-choice:not(.hidden)')).toBeVisible();
    await expect(page.locator('#music-choice-copy')).toContainText('average song');
    await expect(page.locator('#music-choice-copy')).toContainText('complete soundtrack');
    const bootChoiceLayout = await page.locator('#loading').evaluate(function (loading) {
      function insideViewport(element) {
        const box = element.getBoundingClientRect();
        return box.top >= 0 && box.left >= 0 &&
          box.right <= window.innerWidth && box.bottom <= window.innerHeight;
      }
      return {
        titleInside:insideViewport(loading.querySelector('.gametitle')),
        choiceInside:insideViewport(document.getElementById('music-choice')),
        playInside:insideViewport(document.getElementById('music-choice-play')),
        silentInside:insideViewport(document.getElementById('music-choice-silent')),
        horizontalScroll:loading.scrollWidth > loading.clientWidth
      };
    });
    expect(bootChoiceLayout).toEqual({
      titleInside:true,
      choiceInside:true,
      playInside:true,
      silentInside:true,
      horizontalScroll:false
    });
    await page.getByRole('button', { name:'Continue silently', exact:true }).click();
    await expect(page.locator('#title:not(.hidden)')).toBeVisible();
    await page.setViewportSize({ width:1280, height:720 });
    expect(await page.evaluate(function () {
      return {
        choice:FB.game.uiPrefs.musicChoice,
        stored:JSON.parse(localStorage.getItem('fb_ui')).musicChoice
      };
    })).toEqual({ choice:'off', stored:'off' });

    const titleMusic = page.locator('#btn-title-music');
    const titleMusicNext = page.locator('#btn-title-music-next');
    await expect(titleMusic).toBeVisible();
    await expect(titleMusicNext).toBeVisible();
    await expect(titleMusic).toHaveText('♫');
    await expect(titleMusic).toHaveAttribute('aria-label', 'Play music');
    await expect(titleMusic).toHaveAttribute('aria-pressed', 'false');
    await expect(titleMusicNext).toHaveText('⏭');
    await expect(titleMusicNext).toHaveAttribute('aria-label', 'Next title theme');
    const musicControlsBox = await page.locator('#title-music-controls').evaluate(function (controls) {
      const box = controls.getBoundingClientRect();
      const toggleBox = controls.querySelector('#btn-title-music').getBoundingClientRect();
      const nextBox = controls.querySelector('#btn-title-music-next').getBoundingClientRect();
      return {
        left:box.left,
        bottom:window.innerHeight - box.bottom,
        leftHalf:box.right <= window.innerWidth / 2,
        toggleWidth:toggleBox.width,
        toggleHeight:toggleBox.height,
        nextWidth:nextBox.width,
        nextHeight:nextBox.height,
        gap:nextBox.left - toggleBox.right
      };
    });
    expect(musicControlsBox).toEqual(expect.objectContaining({
      leftHalf:true, toggleWidth:44, toggleHeight:44, nextWidth:44, nextHeight:44, gap:8
    }));
    expect(musicControlsBox.left).toBeLessThanOrEqual(24);
    expect(musicControlsBox.bottom).toBeLessThanOrEqual(24);

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
    const titleSelection = await page.evaluate(function () {
      return {
        selected:FB.music.selectedIntro().id,
        current:FB.music.current().id,
        title:FB.music.selectedIntro().title
      };
    });
    expect(intros.map(function (intro) { return intro.id; }))
      .toContain(titleSelection.selected);
    expect(titleSelection.current).toBe(titleSelection.selected);
    const selectedIntroAt = intros.map(function (intro) { return intro.id; })
      .indexOf(titleSelection.selected);
    const expectedNextIntro = intros[(selectedIntroAt + 1) % intros.length];
    await page.evaluate(function () {
      window.__initialTitleAudio = window.__musicAudio.filter(function (item) {
        return item.src && !item.paused;
      })[0];
    });
    await titleMusicNext.click();
    expect(await page.evaluate(function () {
      return {
        selected:FB.music.selectedIntro().id,
        current:FB.music.current().id
      };
    })).toEqual({ selected:expectedNextIntro.id, current:expectedNextIntro.id });
    await expect.poll(function () {
      return page.evaluate(function () {
        return {
          previousPaused:window.__initialTitleAudio.paused,
          playing:window.__musicAudio.filter(function (item) {
            return item.src && !item.paused;
          }).length
        };
      });
    }).toEqual({ previousPaused:true, playing:1 });
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
      mediaTitle:expectedNextIntro.title,
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
    await expect.poll(function () {
      return page.evaluate(function () {
        return !!window.__lastGameMusicAudio && !window.__lastGameMusicAudio.paused;
      });
    }).toBe(true);

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
      const titleTrack = FB.music.current().id;
      const titleAudio = window.__lastGameMusicAudio;
      FB.ui.showScreen(null);
      FB.platform.isItch = true;
      FB.music.sync(state);
      const immediateGame = {
        titleTrack:titleTrack,
        track:FB.music.current().id,
        bank:FB.music.currentBank().id,
        titleLooping:titleAudio.loop
      };
      const folkTrackIds = FB.music.currentBank().trackIds.slice();
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
        folkTrackIds:folkTrackIds,
        immediateGame:immediateGame,
        first:FB.music.current().id
      };
    });
    expect(context).toEqual(expect.objectContaining({
      folk:'christian/anglo_saxon/folk',
      realmWar:'christian/anglo_saxon/war',
      war:'christian/anglo_saxon/war',
      court:'christian/anglo_saxon/court',
      itchFolk:'christian/anglo_saxon/folk',
      itchWar:'christian/anglo_saxon/war',
      folkTrackIds:expect.arrayContaining(['intro-fallowborn-christian']),
      immediateGame:expect.objectContaining({
        bank:'christian/anglo_saxon/folk',
        titleLooping:false
      })
    }));
    expect(context.immediateGame.track).not.toBe(context.immediateGame.titleTrack);
    expect(context.folkTrackIds).toContain(context.immediateGame.track);
    await expect(page.locator('#btn-title-music')).toBeHidden();

    const musicBtn = page.locator('#btn-music');
    await expect(musicBtn).toBeVisible();
    await expect(musicBtn).toHaveAttribute('aria-label', 'Music');
    await expect(musicBtn).toHaveAttribute('title', 'Music');
    expect(await page.locator('#maphud .hudbtn').evaluateAll(function (buttons) {
      return buttons.map(function (b) { return b.id; });
    })).toEqual(['btn-music', 'btn-zoomin', 'btn-zoomout', 'btn-home', 'btn-mapmode', 'btn-marketlens', 'btn-find']);

    const musicControls = page.locator('#music-controls');
    await expect(musicControls).toBeHidden();

    await musicBtn.click();
    await expect(musicControls).toBeVisible();
    await expect(musicBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(musicBtn).toHaveClass(/on/);

    const quickToggle = page.locator('#music-playback');
    await expect(quickToggle).toBeVisible();
    await expect(quickToggle).toHaveText('⏸ Pause');
    await expect(quickToggle).toHaveAttribute('aria-pressed', 'true');

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
    await expect(quickToggle).toHaveText('▶ Play');
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
    await expect(quickToggle).toHaveText('⏸ Pause');

    // Clicking anywhere else in the UI closes the music overlay — aim at the
    // map's center: the open overlay occupies the map's top-left corner and
    // the HUD buttons its top-right, so a fixed corner point can land on
    // either of them instead of the canvas.
    const mapBox = await page.locator('#map').boundingBox();
    await page.locator('#map').click({
      position:{
        x:Math.round(mapBox.width / 2),
        y:Math.round(mapBox.height / 2)
      }
    });
    await expect(musicControls).toBeHidden();
    await expect(musicBtn).toHaveAttribute('aria-pressed', 'false');

    await musicBtn.click();
    await expect(musicControls).toBeVisible();
    await page.locator('#sidetabs [data-tab="prov"]').click();
    await expect(musicControls).toBeHidden();
    await expect(musicBtn).toHaveAttribute('aria-pressed', 'false');
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

    await musicBtn.click();
    await expect(musicControls).toBeVisible();
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
      const afterEndBank = FB.music.currentBank();
      return {
        first:first,
        atWar:atWar,
        atPeaceAgain:atPeaceAgain,
        afterEndTrack:FB.music.current().id,
        afterEndTrackIds:afterEndBank.trackIds.slice(),
        afterEndBank:afterEndBank.id
      };
    });
    expect(queuedContext.atWar).toBe(queuedContext.first);
    expect(queuedContext.atPeaceAgain).toBe(queuedContext.first);
    expect(queuedContext.afterEndBank).toBe('christian/anglo_saxon/war');
    expect(queuedContext.afterEndTrackIds).toContain(queuedContext.afterEndTrack);

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
      const afterEndBank = FB.music.currentBank();
      return {
        warTrack:warTrack,
        beforeEnd:beforeEnd,
        afterEndTrack:FB.music.current().id,
        afterEndTrackIds:afterEndBank.trackIds.slice(),
        afterEndBank:afterEndBank.id
      };
    });
    expect(peaceContext.beforeEnd).toBe(peaceContext.warTrack);
    expect(peaceContext.afterEndBank).toBe('christian/anglo_saxon/folk');
    expect(peaceContext.afterEndTrackIds).toContain(peaceContext.afterEndTrack);

    await page.setViewportSize({ width:390, height:740 });
    await page.evaluate(function () {
      FB.ui.setMusicOverlay(true);
      FB.ui.toast('A long map notification stays clear of the compact music controls.');
    });
    const mobileOverlay = await page.locator('#music-controls').evaluate(
      function (controls) {
        const map = document.getElementById('mapwrap').getBoundingClientRect();
        const controlBox = controls.getBoundingClientRect();
        const hud = document.getElementById('maphud');
        const hudBox = hud.getBoundingClientRect();
        const hudButtons = Array.from(hud.querySelectorAll('.hudbtn'));
        const firstHudButton = hudButtons[0].getBoundingClientRect();
        return {
          leftInset:Math.round(controlBox.left - map.left),
          topInset:Math.round(controlBox.top - map.top),
          controlsWidth:Math.round(controlBox.width),
          hasScroll:controls.scrollHeight > controls.clientHeight,
          hudDirection:getComputedStyle(hud).flexDirection,
          hudGap:parseFloat(getComputedStyle(hud).rowGap),
          hudButtonWidth:Math.round(firstHudButton.width),
          hudButtonHeight:Math.round(firstHudButton.height),
          hudButtonsVertical:hudButtons.every(function (button, index) {
            if (!index) return true;
            const previous = hudButtons[index - 1].getBoundingClientRect();
            return previous.bottom <= button.getBoundingClientRect().top;
          }),
          hudButtonOrder:hudButtons.map(function (b) { return b.id; }),
          clearsHud:controlBox.right <= hudBox.left
        };
      });
    expect(mobileOverlay).toEqual({
      leftInset:8,
      topInset:8,
      controlsWidth:expect.any(Number),
      hasScroll:false,
      hudDirection:'column',
      hudGap:2,
      hudButtonWidth:44,
      hudButtonHeight:44,
      hudButtonsVertical:true,
      hudButtonOrder:['btn-music', 'btn-zoomin', 'btn-zoomout', 'btn-home', 'btn-mapmode', 'btn-marketlens', 'btn-find'],
      clearsHud:true
    });
    /* Toast clearance is asserted on the settled layout: measured in the same
       breath as the viewport resize, the map strip can still be mid-reflow
       and report a frame where the toast and the overlay overlap. */
    await expect.poll(function () {
      return page.locator('#music-controls').evaluate(function (controls) {
        const controlBox = controls.getBoundingClientRect();
        const toast = document.querySelector('#toasts .toast:last-child');
        if (!toast) return false;
        const toastBox = toast.getBoundingClientRect();
        return toastBox.top >= controlBox.bottom || controlBox.left >= toastBox.right;
      });
    }).toBe(true);
    expect(mobileOverlay.controlsWidth).toBeLessThanOrEqual(300);
  });

test('a downloaded faith theme remains cached while another bank still uses it',
  async function ({ page }, testInfo) {
    test.skip(!testInfo.project.name.endsWith('-served'),
      'Synthetic soundtrack responses require the served-origin project.');
    await page.addInitScript(function () {
      localStorage.setItem('fb_ui', JSON.stringify({
        musicChoice:'off', musicOfflineBanks:{}, musicPreferred:{}, musicRatings:{}
      }));
    });
    await routeSyntheticSoundtrack(page);
    await page.goto(targetUrl(testInfo), { waitUntil:'domcontentloaded' });

    const result = await page.evaluate(async function () {
      /* This API is exposed only on the first-party release. The local harness
         deliberately avoids Cache Storage during ordinary boot. */
      FB.platform.name = 'play';
      FB.platform.isLocal = false;
      FB.platform.isPlay = true;
      function download(id) {
        return new Promise(function (resolve, reject) {
          FB.music.downloadBank(id, null, function (error) {
            if (error) reject(error);
            else resolve();
          });
        });
      }
      function remove(id) {
        return new Promise(function (resolve) { FB.music.removeBank(id, resolve); });
      }
      function cached(track) {
        return new Promise(function (resolve) { FB.music.isTrackCached(track, resolve); });
      }

      const theme = FB.music.catalog().intros.filter(function (intro) {
        return intro.faith === 'christian';
      })[0];
      await download('christian/anglo_saxon/folk');
      await download('christian/anglo_saxon/war');
      await remove('christian/anglo_saxon/folk');
      const afterOneRemoval = await cached(theme);
      await remove('christian/anglo_saxon/war');
      const afterLastRemoval = await cached(theme);
      return { afterOneRemoval:afterOneRemoval, afterLastRemoval:afterLastRemoval };
    });

    expect(result).toEqual({ afterOneRemoval:true, afterLastRemoval:false });
  });

test('local served boot leaves Cache Storage idle',
  async function ({ page }, testInfo) {
    test.skip(!testInfo.project.name.endsWith('-served'),
      'Cache Storage is available only on served origins.');
    await page.addInitScript(function () {
      window.__musicCacheOpenCalls = 0;
      if (!window.caches || typeof window.caches.open !== 'function') return;
      const open = window.caches.open.bind(window.caches);
      window.caches.open = function () {
        window.__musicCacheOpenCalls++;
        return open.apply(null, arguments);
      };
    });
    await routeSyntheticSoundtrack(page);
    await openGame(page, testInfo);

    expect(await page.evaluate(function () {
      return {
        local:FB.platform.isLocal,
        cacheOpenCalls:window.__musicCacheOpenCalls
      };
    })).toEqual({ local:true, cacheOpenCalls:0 });
  });

/* On phone-sized screens the birthplace ("Where were you born?") and character
   ("Who are you?") screens put their Back button in the bottom-left corner the
   title music controls occupy — the controls hide there and return on larger
   viewports and on screens outside that flow. */
test('phone-sized birthplace and character screens yield the corner to Back',
  async function ({ page }, testInfo) {
    test.skip(!testInfo.project.name.endsWith('-served'),
      'Synthetic soundtrack responses require the served-origin project.');
    await page.addInitScript(function () {
      HTMLMediaElement.prototype.canPlayType = function () { return 'probably'; };
      localStorage.setItem('fb_ui', JSON.stringify({
        musicChoice:'off', musicOfflineBanks:{}, musicPreferred:{}, musicRatings:{}
      }));
    });
    await routeSyntheticSoundtrack(page);
    await page.setViewportSize({ width:390, height:844 });
    await openGame(page, testInfo);
    await unlockStartTier(page, 1);

    const controls = page.locator('#title-music-controls');
    await expect(controls).toBeVisible();

    // title → New Game → fresh seed → first bookmark → Free Farmer → birthplace
    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#ng-fresh').click();
    await page.locator('#bookmarklist .scencard').first().click();
    await page.getByRole('button', { name:/Free Farmer/ }).click();
    await expect(page.locator('#pickprov:not(.hidden)')).toBeVisible();
    await expect(controls).toBeHidden();

    // take the county seat straight into the character screen
    await page.getByRole('button', { name:'Random Province', exact:true }).click();
    await page.locator('#btn-pick-random').click(); // "Begin in {seat}"
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await expect(controls).toBeHidden();

    // the same screen on a desktop-sized viewport keeps the controls
    await page.setViewportSize({ width:1280, height:800 });
    await expect(controls).toBeVisible();
    await page.setViewportSize({ width:390, height:844 });
    await expect(controls).toBeHidden();

    // Back walks settlement → county → scenario list; only the last leaves
    // the flow and returns the controls
    await page.locator('#btn-cg-back').click();
    await expect(page.locator('#pickprov:not(.hidden)')).toBeVisible();
    await expect(controls).toBeHidden();
    await page.locator('#btn-pick-back').click();
    await expect(page.locator('#pickprov:not(.hidden)')).toBeVisible();
    await expect(controls).toBeHidden();
    await page.locator('#btn-pick-back').click();
    await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();
    await expect(controls).toBeVisible();
  });
