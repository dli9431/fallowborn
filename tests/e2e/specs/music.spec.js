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

test('first soundtrack boot explains bandwidth and title pause preserves position',
  async function ({ page }, testInfo) {
    test.skip(!testInfo.project.name.endsWith('-served'),
      'Synthetic soundtrack responses require the served-origin project.');
    await page.addInitScript(function () {
      HTMLMediaElement.prototype.canPlayType = function () { return 'probably'; };
      window.__musicAudio = [];
      function FakeAudio() {
        this.currentTime = 0;
        this.loop = false;
        this.paused = true;
        this.src = '';
        this.volume = 0;
        window.__musicAudio.push(this);
      }
      FakeAudio.prototype.addEventListener = function () {};
      FakeAudio.prototype.load = function () {};
      FakeAudio.prototype.pause = function () { this.paused = true; };
      FakeAudio.prototype.play = function () {
        this.paused = false;
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

test('context banks and modal Previous/Next follow listening history',
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
      function FakeAudio() {
        this.currentTime = 0;
        this.loop = false;
        this.src = '';
        this.volume = 0;
      }
      FakeAudio.prototype.addEventListener = function () {};
      FakeAudio.prototype.load = function () {};
      FakeAudio.prototype.pause = function () {};
      FakeAudio.prototype.play = function () { return Promise.resolve(); };
      FakeAudio.prototype.removeAttribute = function (name) {
        if (name === 'src') this.src = '';
      };
      window.Audio = FakeAudio;
    });
    await routeSyntheticSoundtrack(page);
    await openGame(page, testInfo);
    await expect(page.locator('#btn-title-music')).toBeHidden();

    const context = await page.evaluate(function () {
      const state = {
        seed:'music-test',
        player:{ charId:'me', tier:1, profession:'farmer', flags:{} },
        chars:{ me:{ id:'me', religion:'christian', culture:'anglo_saxon' } }
      };
      const folk = FB.music.resolveBank(state).id;
      state.player.profession = 'soldier';
      const war = FB.music.resolveBank(state).id;
      state.player.profession = 'farmer';
      state.player.tier = 3;
      const court = FB.music.resolveBank(state).id;
      state.player.tier = 1;
      FB.state = state;
      FB.music.sync(state, true);
      return { folk:folk, war:war, court:court, first:FB.music.current().id };
    });
    expect(context).toEqual(expect.objectContaining({
      folk:'christian/anglo_saxon/folk',
      war:'christian/anglo_saxon/war',
      court:'christian/anglo_saxon/court'
    }));

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
    await expect(page.getByRole('button', { name:'⏮ Previous', exact:true })).toBeDisabled();
    await expect(page.getByRole('button', { name:'Next ⏭', exact:true })).toBeVisible();
    await expect(page.locator('#music-up')).toHaveCount(0);

    await page.getByRole('button', { name:'Next ⏭', exact:true }).click();
    await expect(page.getByRole('button', { name:'⏮ Previous', exact:true })).toBeEnabled();
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
      name:'event-' + ratedTrack + '-thumbsup',
      data:expect.objectContaining({ track_id:ratedTrack, music_role:'folk' })
    }]);
  });
