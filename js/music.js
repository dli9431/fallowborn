/* Fallowborn music: catalog routing, playback, caching, and offline packs. */
window.FB = window.FB || {};

(function () {
  'use strict';

  const M = FB.music = {};
  const MUSIC_CACHE = 'fallowborn-music-v1';
  const HISTORY_LIMIT = 40;
  const PLAYBACK_EVENT_LIMIT = 30;
  const CROSSFADE_MS = 1400;
  let catalog = null;
  let selectedIntro = null;
  let tracksById = {};
  let banksById = {};
  let supported = false;
  let initialized = false;
  let mode = 'title';
  let signature = '';
  let currentTrack = null;
  let currentBankId = null;
  let pendingBankId = null;
  let deck = [];
  let deckAt = 0;
  let deckCycle = 0;
  let queuedTrack = null;
  let preparedTrack = null;
  let prepareToken = 0;
  let history = [];
  let historyAt = -1;
  let repeatTrack = false;
  let audio = [];
  let audioObjectUrls = [];
  let activeAudio = -1;
  let playToken = 0;
  let downloadToken = 0;
  let gestureArmed = false;
  let titlePaused = false;
  let playbackPaused = false;
  let backgroundPaused = false;
  let resumeAfterBackground = false;
  let windowFocused = true;
  let networkUnavailable = false;
  let warnedUnavailable = false;
  let lifecycleRecoveryPending = false;
  let hiddenRecoveryAttempted = false;
  let mediaSessionConfigured = false;
  const playbackEvents = [];
  const failedTracks = {};

  function prefs() {
    return FB.game && FB.game.uiPrefs ? FB.game.uiPrefs : null;
  }

  function savePrefs() {
    if (FB.game && FB.game.saveUiPrefs) FB.game.saveUiPrefs();
  }

  function enabled() {
    const p = prefs();
    return !!(p && p.musicChoice === 'on');
  }

  function backgroundPlaybackEnabled() {
    const p = prefs();
    return !!(p && p.musicBackgroundPlayback);
  }

  function updateTitleToggle() {
    const button = document.getElementById('btn-title-music');
    if (!button) return;
    const loading = document.getElementById('loading');
    const game = document.getElementById('game');
    const pregame = loading && loading.classList.contains('hidden') &&
      game && game.classList.contains('hidden');
    const available = supported && M.hasCatalog() && pregame;
    const playing = enabled() && !titlePaused;
    button.classList.toggle('hidden', !available);
    button.setAttribute('aria-pressed', playing ? 'true' : 'false');
    button.textContent = playing ? '⏸' : '♫';
    const label = FB.T(playing ? 'Pause music' : 'Play music');
    button.setAttribute('aria-label', label);
    button.title = label;
  }

  function cacheAvailable() {
    return !FB.platform.isFile && typeof window.caches !== 'undefined' &&
      typeof window.fetch === 'function';
  }

  function absoluteUrl(url) {
    try { return new URL(url, window.location.href).href; } catch (error) { return url; }
  }

  function trackUrl(track) {
    if (!track) return '';
    if (FB.platform.isFile) return track.src;
    return track.src + '?m=' + encodeURIComponent(track.rev || '1');
  }

  function playbackIntended() {
    if (!enabled() || !currentTrack) return false;
    if (mode === 'title') return !titlePaused;
    if (mode === 'game') return !playbackPaused;
    return false;
  }

  function nativeLoopEnabled(track) {
    return !!(track && (repeatTrack || (mode === 'title' && track.kind === 'intro')));
  }

  function recordPlaybackEvent(type, element) {
    const mediaError = element && element.error;
    playbackEvents.push({
      type:type,
      at:Date.now(),
      trackId:currentTrack ? currentTrack.id : null,
      hidden:!!document.hidden,
      paused:element ? !!element.paused : null,
      currentTime:element ? Number(element.currentTime) || 0 : null,
      networkState:element && typeof element.networkState === 'number'
        ? element.networkState : null,
      readyState:element && typeof element.readyState === 'number'
        ? element.readyState : null,
      errorCode:mediaError && typeof mediaError.code === 'number' ? mediaError.code : null
    });
    if (playbackEvents.length > PLAYBACK_EVENT_LIMIT) playbackEvents.shift();
  }

  function setMediaSessionState(value) {
    if (!navigator.mediaSession) return;
    try { navigator.mediaSession.playbackState = value; } catch (error) {}
  }

  function updateMediaSession(track) {
    if (!navigator.mediaSession) return;
    if (!track) {
      try { navigator.mediaSession.metadata = null; } catch (error) {}
      setMediaSessionState('none');
      return;
    }
    if (typeof window.MediaMetadata === 'function') {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title:track.title,
          artwork:[{
            src:absoluteUrl('static/icon-512.png'), sizes:'512x512', type:'image/png'
          }]
        });
      } catch (error) {}
    }
  }

  function configureMediaSession() {
    if (mediaSessionConfigured || !navigator.mediaSession) return;
    mediaSessionConfigured = true;
    function action(name, handler) {
      try { navigator.mediaSession.setActionHandler(name, handler); } catch (error) {}
    }
    action('play', function () {
      if (mode === 'title' && (!enabled() || titlePaused)) {
        M.toggleTitlePlayback();
      } else if (mode === 'game' && playbackPaused) {
        M.togglePlayback();
      } else if (activeAudio >= 0 && audio[activeAudio].src) {
        resumeElement(audio[activeAudio]);
      }
    });
    action('pause', function () {
      if (mode === 'title' && enabled() && !titlePaused) M.toggleTitlePlayback();
      else if (mode === 'game' && !playbackPaused) M.togglePlayback();
    });
    action('previoustrack', function () {
      if (mode === 'game') M.previous();
    });
    action('nexttrack', function () {
      if (mode === 'game') M.next();
    });
  }

  function humanize(value) {
    return String(value || '').split(/[-_]/).map(function (word) {
      return word ? word.charAt(0).toUpperCase() + word.slice(1) : '';
    }).join(' ');
  }

  M.formatBytes = function (bytes) {
    bytes = Number(bytes) || 0;
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    if (bytes < 1024 * 1024 * 1024) {
      return (Math.round(bytes / (1024 * 1024) * 10) / 10) + ' MB';
    }
    return (Math.round(bytes / (1024 * 1024 * 1024) * 100) / 100) + ' GB';
  };

  M.formatDuration = function (seconds) {
    seconds = Math.max(0, Math.round(Number(seconds) || 0));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;
    if (hours) return hours + 'h ' + minutes + 'm';
    return minutes + ':' + (remainder < 10 ? '0' : '') + remainder;
  };

  M.bankLabel = function (bank) {
    if (!bank) return FB.T('All soundtrack music');
    const faith = bank.faith === 'all' ? FB.T('Any faith') : humanize(bank.faith);
    const culture = bank.culture === 'all' ? FB.T('Any culture') : humanize(bank.culture);
    return faith + ' · ' + culture + ' · ' + FB.T(humanize(bank.role));
  };

  function introTracks() {
    if (!catalog) return [];
    if (Array.isArray(catalog.intros) && catalog.intros.length) {
      return catalog.intros;
    }
    return catalog.intro ? [catalog.intro] : [];
  }

  function buildIndexes() {
    tracksById = {};
    banksById = {};
    if (!catalog) return;
    (catalog.tracks || []).forEach(function (track) { tracksById[track.id] = track; });
    (catalog.banks || []).forEach(function (bank) { banksById[bank.id] = bank; });
    introTracks().forEach(function (track) { tracksById[track.id] = track; });
  }

  function createAudio() {
    for (let i = 0; i < 2; i++) {
      const element = new Audio();
      element.preload = 'auto';
      element.addEventListener('ended', function () {
        if (activeAudio !== i || !currentTrack) return;
        recordPlaybackEvent('ended', element);
        if (nativeLoopEnabled(currentTrack)) {
          element.loop = true;
          element.currentTime = 0;
          if (backgroundPaused) resumeAfterBackground = true;
          else resumeElement(element);
        } else {
          setMediaSessionState('playing');
          if (!advanceAfterTrack({ noCrossfade:true })) setMediaSessionState('paused');
        }
      });
      element.addEventListener('error', function () {
        if (activeAudio !== i || !currentTrack) return;
        recordPlaybackEvent('error', element);
        failedTracks[currentTrack.id] = true;
        element.pause();
        element.removeAttribute('src');
        releaseAudioUrl(i);
        activeAudio = -1;
        currentTrack = null;
        updateNowPlaying();
        if (!advanceAfterTrack()) updateMediaSession(null);
      });
      element.addEventListener('playing', function () {
        if (activeAudio !== i || !currentTrack) return;
        lifecycleRecoveryPending = false;
        recordPlaybackEvent('playing', element);
        setMediaSessionState('playing');
      });
      element.addEventListener('pause', function () {
        if (activeAudio !== i || !currentTrack) return;
        recordPlaybackEvent('pause', element);
        if (element.ended) {
          if (playbackIntended()) setMediaSessionState('playing');
          return;
        }
        if (playbackIntended() && backgroundPlaybackEnabled()) {
          lifecycleRecoveryPending = true;
          setMediaSessionState('playing');
          if (document.hidden && !hiddenRecoveryAttempted) {
            hiddenRecoveryAttempted = true;
            setTimeout(function () { recoverBackgroundPlayback('pause'); }, 0);
          }
        } else {
          setMediaSessionState('paused');
        }
      });
      ['waiting', 'stalled', 'suspend'].forEach(function (type) {
        element.addEventListener(type, function () {
          if (activeAudio !== i || !currentTrack) return;
          recordPlaybackEvent(type, element);
          if (playbackIntended()) setMediaSessionState('playing');
        });
      });
      audio.push(element);
      audioObjectUrls.push(null);
    }
  }

  function releaseAudioUrl(index) {
    const url = audioObjectUrls[index];
    if (!url) return;
    try { URL.revokeObjectURL(url); } catch (error) {}
    audioObjectUrls[index] = null;
  }

  function releasePreparedUrl(url) {
    if (!/^blob:/.test(url || '')) return;
    try { URL.revokeObjectURL(url); } catch (error) {}
  }

  function clearPreparedTrack(clearQueue) {
    prepareToken++;
    if (preparedTrack) releasePreparedUrl(preparedTrack.url);
    preparedTrack = null;
    if (clearQueue) queuedTrack = null;
  }

  function takePreparedUrl(track) {
    if (!preparedTrack || !track || preparedTrack.trackId !== track.id) return null;
    const url = preparedTrack.url;
    preparedTrack = null;
    prepareToken++;
    return url;
  }

  function upcomingTrack() {
    if (mode !== 'game' || pendingBankId) return null;
    if (historyAt >= 0 && historyAt < history.length - 1) {
      return tracksById[history[historyAt + 1]] || null;
    }
    if (!queuedTrack) queuedTrack = nextDeckTrack();
    return queuedTrack;
  }

  function prepareUpcomingTrack() {
    if (!enabled() || mode !== 'game' || repeatTrack) return;
    const track = upcomingTrack();
    if (!track || track === currentTrack) return;
    if (preparedTrack && preparedTrack.trackId === track.id) return;
    clearPreparedTrack(false);
    const token = ++prepareToken;
    loadTrack(track, function (error, url) {
      const wanted = upcomingTrack();
      if (token !== prepareToken || error || !wanted || wanted.id !== track.id) {
        if (!error) releasePreparedUrl(url);
        return;
      }
      preparedTrack = { trackId:track.id, url:url };
      recordPlaybackEvent('prepared-next', null);
    });
  }

  function reconcileCache() {
    if (!cacheAvailable() || !catalog) return;
    const allowed = {};
    const records = introTracks().concat(catalog.tracks || []);
    records.forEach(function (track) { allowed[absoluteUrl(trackUrl(track))] = true; });
    caches.open(MUSIC_CACHE).then(function (cache) {
      return cache.keys().then(function (requests) {
        return Promise.all(requests.map(function (request) {
          return allowed[request.url] ? Promise.resolve(false) : cache.delete(request);
        }));
      });
    }).then(function () {
      validateOfflineMarkers();
    }, function () {
      /* Cache Storage is optional outside the first-party play origin. */
    });
  }

  M.init = function () {
    if (initialized) return;
    initialized = true;
    catalog = FBDATA.musicCatalog || {
      schema:1, intro:null, intros:[], tracks:[], banks:[], totalBytes:0, totalDuration:0
    };
    const intros = introTracks();
    const rngState = FB.getRngState();
    selectedIntro = intros.length ? FB.pick(intros) : null;
    FB.setRngState(rngState);
    buildIndexes();
    const probe = document.createElement('audio');
    try {
      supported = !!probe.canPlayType &&
        probe.canPlayType('audio/ogg; codecs="opus"') !== '';
    } catch (error) {
      supported = false;
    }
    createAudio();
    configureMediaSession();
    window.addEventListener('online', function () {
      networkUnavailable = false;
      warnedUnavailable = false;
      for (const id in failedTracks) delete failedTracks[id];
      signature = '';
      if (!enabled()) return;
      if (FB.state) M.sync(FB.state, true);
      else M.showTitle(true);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pauseForBackground();
      else {
        resumeAfterFocus();
        recoverBackgroundPlayback('visible');
      }
    });
    window.addEventListener('blur', function () {
      windowFocused = false;
      pauseForBackground();
    });
    window.addEventListener('focus', function () {
      windowFocused = true;
      resumeAfterFocus();
      recoverBackgroundPlayback('focus');
    });
    document.addEventListener('freeze', function () {
      if (!backgroundPlaybackEnabled() || !playbackIntended()) return;
      lifecycleRecoveryPending = true;
      recordPlaybackEvent('freeze', activeAudio >= 0 ? audio[activeAudio] : null);
    });
    document.addEventListener('resume', function () {
      recoverBackgroundPlayback('resume');
    });
    window.addEventListener('pageshow', function () {
      recoverBackgroundPlayback('pageshow');
    });
    const recoverOnInteraction = function () {
      recoverBackgroundPlayback('interaction');
    };
    document.addEventListener('pointerdown', recoverOnInteraction, true);
    document.addEventListener('touchstart', recoverOnInteraction, true);
    document.addEventListener('keydown', recoverOnInteraction, true);
    window.addEventListener('pagehide', function () {
      if (!backgroundPlaybackEnabled() || !playbackIntended()) return;
      lifecycleRecoveryPending = true;
      recordPlaybackEvent('pagehide', activeAudio >= 0 ? audio[activeAudio] : null);
    });
    const nowPlaying = document.getElementById('music-now-playing');
    if (nowPlaying) {
      nowPlaying.addEventListener('click', function () {
        if (FB.ui && FB.ui.showMusicTrack) FB.ui.showMusicTrack();
      });
    }
    const playbackToggle = document.getElementById('music-now-playing-toggle');
    if (playbackToggle) {
      playbackToggle.addEventListener('click', function () {
        M.togglePlayback();
      });
    }
    const titleToggle = document.getElementById('btn-title-music');
    if (titleToggle) {
      titleToggle.addEventListener('click', function () {
        M.toggleTitlePlayback();
      });
    }
    updateTitleToggle();
    reconcileCache();
    if (selectedIntro && supported) {
      loadTrack(selectedIntro, function (error, url) {
        if (!error && /^blob:/.test(url || '')) {
          try { URL.revokeObjectURL(url); } catch (revokeError) {}
        }
      });
    }
  };

  M.hasCatalog = function () {
    return !!(catalog && selectedIntro && catalog.tracks && catalog.tracks.length);
  };

  M.supported = function () { return supported; };
  M.refreshTitleToggle = updateTitleToggle;
  M.enabled = enabled;
  M.backgroundPlaybackEnabled = backgroundPlaybackEnabled;
  M.catalog = function () { return catalog; };
  M.selectedIntro = function () { return selectedIntro; };
  M.banks = function () { return catalog ? (catalog.banks || []).slice() : []; };
  M.current = function () { return currentTrack; };
  M.currentBank = function () { return currentBankId ? banksById[currentBankId] || null : null; };
  M.isRepeating = function () { return repeatTrack; };
  M.isPaused = function () { return mode === 'game' && playbackPaused; };
  M.canPrevious = function () { return historyAt > 0; };
  M.playbackDiagnostics = function () { return playbackEvents.slice(); };

  M.bandwidthText = function () {
    if (!catalog || !catalog.tracks || !catalog.tracks.length) return '';
    const average = Math.round(catalog.tracks.reduce(function (sum, track) {
      return sum + track.bytes;
    }, 0) / catalog.tracks.length);
    if (FB.platform.isItch) {
      return FB.T(
        'Music downloads one song at a time and may use up to {total} over time in this itch release. The average song is {average}.',
        { total:M.formatBytes(catalog.totalBytes), average:M.formatBytes(average) }
      );
    }
    const bankBytes = (catalog.banks || []).map(function (bank) { return bank.bytes; });
    const low = bankBytes.length ? Math.min.apply(null, bankBytes) : 0;
    const high = bankBytes.length ? Math.max.apply(null, bankBytes) : 0;
    return FB.T(
      'Music downloads one song at a time. The average song is {average}; banks range from {low} to {high}; the complete soundtrack is {total}.',
      {
        average:M.formatBytes(average), low:M.formatBytes(low),
        high:M.formatBytes(high), total:M.formatBytes(catalog.totalBytes)
      }
    );
  };

  M.offerBootChoice = function (done) {
    const choice = document.getElementById('music-choice');
    const copy = document.getElementById('music-choice-copy');
    const play = document.getElementById('music-choice-play');
    const silent = document.getElementById('music-choice-silent');
    const p = prefs();
    if (!choice || !p || !M.hasCatalog() || !supported || p.musicChoice) {
      if (enabled()) M.showTitle();
      return false;
    }
    if (copy) copy.textContent = M.bandwidthText();
    choice.classList.remove('hidden');
    play.onclick = function () {
      choice.classList.add('hidden');
      M.setEnabled(true);
      done();
    };
    silent.onclick = function () {
      choice.classList.add('hidden');
      M.setEnabled(false);
      done();
    };
    return true;
  };

  function updateNowPlaying() {
    const button = document.getElementById('music-now-playing');
    const toggle = document.getElementById('music-now-playing-toggle');
    const title = document.getElementById('music-now-playing-title');
    if (!button || !title) return;
    const gameplayTrack = currentTrack && mode === 'game';
    const hidden = !gameplayTrack || !enabled();
    button.classList.toggle('hidden', hidden);
    if (toggle) toggle.classList.toggle('hidden', hidden);
    if (gameplayTrack) {
      title.textContent = currentTrack.title;
      button.setAttribute('aria-label', FB.T('Now playing: {song}. Open music controls.', {
        song:currentTrack.title
      }));
      if (toggle) {
        const label = FB.T(playbackPaused ? 'Play music' : 'Pause music');
        toggle.textContent = playbackPaused ? '▶' : '⏸';
        toggle.setAttribute('aria-label', label);
        toggle.setAttribute('aria-pressed', playbackPaused ? 'false' : 'true');
        toggle.title = label;
      }
    }
  }

  function armGesture() {
    if (gestureArmed || !enabled()) return;
    gestureArmed = true;
    const resume = function () {
      document.removeEventListener('pointerdown', resume, true);
      document.removeEventListener('touchstart', resume, true);
      document.removeEventListener('keydown', resume, true);
      gestureArmed = false;
      if (activeAudio >= 0 && audio[activeAudio].src) {
        resumeElement(audio[activeAudio]);
      } else if (mode === 'title') {
        M.showTitle(true);
      } else if (FB.state) {
        signature = '';
        M.sync(FB.state, true);
      }
    };
    document.addEventListener('pointerdown', resume, true);
    document.addEventListener('touchstart', resume, true);
    document.addEventListener('keydown', resume, true);
  }

  function resumeElement(element) {
    let result;
    if (!element) return;
    if (playbackIntended()) setMediaSessionState('playing');
    try { result = element.play(); } catch (error) {
      recordPlaybackEvent('play-rejected', element);
      lifecycleRecoveryPending = true;
      setMediaSessionState('paused');
      armGesture();
      return;
    }
    if (result && typeof result.catch === 'function') {
      result.then(function () {
        lifecycleRecoveryPending = false;
        if (playbackIntended()) setMediaSessionState('playing');
      }, function () {
        recordPlaybackEvent('play-rejected', element);
        lifecycleRecoveryPending = true;
        setMediaSessionState('paused');
        armGesture();
      });
    }
  }

  function recoverBackgroundPlayback(reason) {
    if (!backgroundPlaybackEnabled() || !enabled()) return false;
    if (!playbackIntended()) return false;
    if (reason !== 'pause') hiddenRecoveryAttempted = false;
    if (activeAudio >= 0 && audio[activeAudio].src) {
      const element = audio[activeAudio];
      if (element.paused || lifecycleRecoveryPending) {
        recordPlaybackEvent('recover-' + reason, element);
        resumeElement(element);
      } else {
        lifecycleRecoveryPending = false;
        setMediaSessionState('playing');
      }
      return true;
    }
    recordPlaybackEvent('reload-' + reason, null);
    lifecycleRecoveryPending = false;
    if (mode === 'title') {
      M.showTitle(true);
      return true;
    }
    if (mode === 'game' && FB.state) {
      signature = '';
      M.sync(FB.state, true);
      return true;
    }
    return false;
  }

  function pauseForBackground() {
    if (backgroundPlaybackEnabled()) return;
    if (backgroundPaused) return;
    backgroundPaused = true;
    resumeAfterBackground = !!(enabled() && currentTrack &&
      ((mode === 'title' && !titlePaused) ||
       (mode === 'game' && !playbackPaused)));
    if (!resumeAfterBackground) return;
    for (let i = 0; i < audio.length; i++) {
      if (audio[i].src) audio[i].pause();
    }
    setMediaSessionState('paused');
  }

  function resumeAfterFocus(ignoreFocus) {
    if ((!ignoreFocus && (document.hidden || !windowFocused)) || !backgroundPaused) return;
    backgroundPaused = false;
    const resume = resumeAfterBackground;
    resumeAfterBackground = false;
    if (!resume || !enabled()) return;
    if ((mode === 'title' && titlePaused) ||
        (mode === 'game' && playbackPaused)) return;
    if (activeAudio >= 0 && audio[activeAudio].src) {
      resumeElement(audio[activeAudio]);
    } else if (mode === 'title') {
      M.showTitle(true);
    } else if (FB.state) {
      signature = '';
      M.sync(FB.state, true);
    }
  }

  function stopAudio() {
    playToken++;
    clearPreparedTrack(true);
    for (let i = 0; i < audio.length; i++) {
      audio[i].pause();
      audio[i].removeAttribute('src');
      releaseAudioUrl(i);
      try { audio[i].load(); } catch (error) {}
    }
    activeAudio = -1;
    currentTrack = null;
    currentBankId = null;
    pendingBankId = null;
    signature = '';
    repeatTrack = false;
    playbackPaused = false;
    resumeAfterBackground = false;
    lifecycleRecoveryPending = false;
    hiddenRecoveryAttempted = false;
    updateNowPlaying();
    updateMediaSession(null);
  }

  M.setEnabled = function (value) {
    const p = prefs();
    if (!p) return;
    titlePaused = false;
    p.musicChoice = value ? 'on' : 'off';
    savePrefs();
    updateTitleToggle();
    if (!value) {
      stopAudio();
      return;
    }
    if (!supported || !M.hasCatalog()) return;
    signature = '';
    if (FB.state) M.sync(FB.state, true);
    else M.showTitle(true);
  };

  M.toggleTitlePlayback = function () {
    if (!initialized) M.init();
    if (mode !== 'title') return false;
    const p = prefs();
    if (!p) return false;
    if (!enabled()) {
      p.musicChoice = 'on';
      savePrefs();
      if (titlePaused && activeAudio >= 0 && audio[activeAudio].src && currentTrack &&
          currentTrack.kind === 'intro') {
        titlePaused = false;
        updateTitleToggle();
        if (backgroundPaused) resumeAfterBackground = true;
        else resumeElement(audio[activeAudio]);
      } else {
        titlePaused = false;
        updateTitleToggle();
        signature = '';
        M.showTitle(true);
      }
      return true;
    }
    titlePaused = true;
    p.musicChoice = 'off';
    savePrefs();
    if (activeAudio >= 0) audio[activeAudio].pause();
    setMediaSessionState('paused');
    updateTitleToggle();
    return true;
  };

  M.togglePlayback = function () {
    if (!initialized) M.init();
    if (mode !== 'game' || !enabled() || !currentTrack) return false;
    playbackPaused = !playbackPaused;
    if (playbackPaused) {
      for (let i = 0; i < audio.length; i++) {
        if (audio[i].src) audio[i].pause();
      }
      setMediaSessionState('paused');
    } else if (backgroundPaused) {
      resumeAfterBackground = true;
    } else if (activeAudio >= 0 && audio[activeAudio].src) {
      resumeElement(audio[activeAudio]);
    }
    updateNowPlaying();
    return true;
  };

  M.setBackgroundPlayback = function (value) {
    const p = prefs();
    if (!p) return false;
    p.musicBackgroundPlayback = !!value;
    savePrefs();
    if (p.musicBackgroundPlayback) {
      resumeAfterFocus(true);
      recoverBackgroundPlayback('preference');
    } else if (document.hidden || !windowFocused) {
      pauseForBackground();
    }
    return p.musicBackgroundPlayback;
  };

  M.setVolume = function (value) {
    const p = prefs();
    if (!p) return;
    p.musicVolume = FB.clamp(Number(value) || 0, 0, 1);
    savePrefs();
    if (activeAudio >= 0) audio[activeAudio].volume = p.musicVolume;
  };

  function fadeTo(nextIndex, oldIndex, token) {
    const start = Date.now();
    const volume = prefs() ? prefs().musicVolume : 0.55;
    function frame() {
      if (token !== playToken) return;
      const fraction = Math.min(1, (Date.now() - start) / CROSSFADE_MS);
      audio[nextIndex].volume = volume * fraction;
      if (oldIndex >= 0) audio[oldIndex].volume = volume * (1 - fraction);
      if (fraction < 1) {
        requestAnimationFrame(frame);
      } else if (oldIndex >= 0) {
        audio[oldIndex].pause();
        audio[oldIndex].removeAttribute('src');
        releaseAudioUrl(oldIndex);
      }
    }
    requestAnimationFrame(frame);
  }

  function loadTrack(track, callback) {
    if (FB.platform.isFile) { callback(null, track.src); return; }
    const url = trackUrl(track);

    function remember(response) {
      if (!response || !response.ok) {
        callback(new Error('Music request failed'));
        return;
      }
      response.blob().then(function (blob) {
        const objectUrl = URL.createObjectURL(blob);
        networkUnavailable = false;
        callback(null, objectUrl);
      }, callback);
    }

    if (!cacheAvailable()) {
      fetch(url, { credentials:'same-origin' }).then(remember, callback);
      return;
    }
    caches.open(MUSIC_CACHE).then(function (cache) {
      return cache.match(url).then(function (cached) {
        if (cached) { remember(cached); return; }
        return fetch(url, { credentials:'same-origin' }).then(function (response) {
          if (!response || !response.ok) return response;
          return cache.put(url, response.clone()).then(function () { return response; },
            function () { return response; });
        }).then(remember);
      });
    }).catch(function (error) {
      networkUnavailable = true;
      callback(error);
    });
  }

  function recordHistory(track, fromHistory) {
    if (fromHistory || mode !== 'game') return;
    if (historyAt < history.length - 1) history = history.slice(0, historyAt + 1);
    if (!history.length || history[history.length - 1] !== track.id) {
      history.push(track.id);
      if (history.length > HISTORY_LIMIT) history.shift();
    }
    historyAt = history.length - 1;
  }

  function playTrack(track, options) {
    options = options || {};
    if (!track || failedTracks[track.id] || !enabled()) return false;
    const token = ++playToken;
    const readyUrl = takePreparedUrl(track);
    if (!readyUrl) clearPreparedTrack(false);
    currentTrack = track;
    repeatTrack = options.keepRepeat ? repeatTrack : false;
    recordHistory(track, !!options.fromHistory);
    updateNowPlaying();
    updateMediaSession(track);
    if (playbackIntended()) setMediaSessionState('playing');
    const loaded = function (error, url) {
      if (token !== playToken) {
        if (!error) releasePreparedUrl(url);
        return;
      }
      if (error) {
        recordPlaybackEvent('load-error', activeAudio >= 0 ? audio[activeAudio] : null);
        failedTracks[track.id] = true;
        networkUnavailable = true;
        currentTrack = null;
        updateNowPlaying();
        updateMediaSession(null);
        if (!warnedUnavailable && FB.ui && FB.ui.toast) {
          warnedUnavailable = true;
          FB.ui.toast('Music is unavailable. Download an offline bank or reconnect to continue listening.');
        }
        if (FB.platform.isPlay && FB.state) {
          signature = '';
          M.sync(FB.state, true);
        } else {
          advanceAfterTrack();
        }
        return;
      }
      const nextIndex = activeAudio === 0 ? 1 : 0;
      const oldIndex = activeAudio;
      const next = audio[nextIndex];
      const crossfade = oldIndex >= 0 && !options.noCrossfade && !document.hidden &&
        !audio[oldIndex].ended;
      next.pause();
      releaseAudioUrl(nextIndex);
      next.src = url;
      if (/^blob:/.test(url || '')) audioObjectUrls[nextIndex] = url;
      next.currentTime = 0;
      next.loop = nativeLoopEnabled(track);
      next.volume = crossfade ? 0 : (prefs() ? prefs().musicVolume : 0.55);
      activeAudio = nextIndex;
      if (mode === 'title' && titlePaused && track.kind === 'intro') {
        setMediaSessionState('paused');
        updateTitleToggle();
        return;
      }
      if (mode === 'game' && playbackPaused) {
        if (oldIndex >= 0) {
          audio[oldIndex].pause();
          audio[oldIndex].removeAttribute('src');
          releaseAudioUrl(oldIndex);
        }
        setMediaSessionState('paused');
        updateNowPlaying();
        return;
      }
      if (backgroundPaused) {
        resumeAfterBackground = true;
        if (oldIndex >= 0) {
          audio[oldIndex].pause();
          audio[oldIndex].removeAttribute('src');
          releaseAudioUrl(oldIndex);
        }
        setMediaSessionState('paused');
        updateNowPlaying();
        return;
      }
      setMediaSessionState('playing');
      const result = next.play();
      prepareUpcomingTrack();
      const finishTransition = function () {
        if (oldIndex < 0) return;
        if (crossfade) {
          fadeTo(nextIndex, oldIndex, token);
          return;
        }
        audio[oldIndex].pause();
        audio[oldIndex].removeAttribute('src');
        releaseAudioUrl(oldIndex);
      };
      if (result && typeof result.then === 'function') {
        result.then(function () {
          if (token !== playToken) return;
          lifecycleRecoveryPending = false;
          setMediaSessionState('playing');
          finishTransition();
        }, function () {
          recordPlaybackEvent('play-rejected', next);
          lifecycleRecoveryPending = true;
          setMediaSessionState('paused');
          armGesture();
        });
      } else {
        finishTransition();
      }
    };
    if (readyUrl) loaded(null, readyUrl);
    else loadTrack(track, loaded);
    return true;
  }

  function currentCharacter(state) {
    return state && state.player ? state.chars[state.player.charId] : null;
  }

  function roleFor(state) {
    const player = state.player;
    const realmAtWar = FB.playerRealmAtWar && state.realms &&
      FB.playerRealmAtWar(state);
    if (realmAtWar || player.war || player.greatHolyWar || player.profession === 'soldier' ||
        (player.flags && player.flags.on_campaign)) return 'war';
    if (player.tier >= 3) return 'court';
    return 'folk';
  }

  function faithCandidates(religion, state) {
    const candidates = [];
    function add(value) {
      if (value && candidates.indexOf(value) < 0) candidates.push(value);
    }
    add(religion);
    if (FB.faithLineage) FB.faithLineage(religion, state).forEach(add);
    if (FB.faithGroup) add(FB.faithGroup(religion, state));
    return candidates;
  }

  function findBank(state, role) {
    const me = currentCharacter(state);
    if (!me) return null;
    const faiths = faithCandidates(me.religion, state);
    const cultures = [me.culture, 'all'];
    const roles = role === 'folk' ? ['folk'] : [role, 'folk'];
    for (let r = 0; r < roles.length; r++) {
      for (let c = 0; c < cultures.length; c++) {
        for (let f = 0; f < faiths.length; f++) {
          const id = faiths[f] + '/' + cultures[c] + '/' + roles[r];
          if (banksById[id]) return banksById[id];
        }
        const allFaith = 'all/' + cultures[c] + '/' + roles[r];
        if (banksById[allFaith]) return banksById[allFaith];
      }
      const group = FB.faithGroup ? FB.faithGroup(me.religion, state) : '';
      const fallback = group === 'jewish' || group === 'zoroastrian'
        ? 'muslim' : (group || 'christian');
      const fallbackId = fallback + '/all/' + roles[r];
      if (banksById[fallbackId]) return banksById[fallbackId];
      const christian = 'christian/all/' + roles[r];
      if (banksById[christian]) return banksById[christian];
    }
    for (let i = 0; i < (catalog.banks || []).length; i++) {
      if (catalog.banks[i].role === role) return catalog.banks[i];
    }
    return (catalog.banks || [])[0] || null;
  }

  M.resolveBank = function (state) {
    return state ? findBank(state, roleFor(state)) : null;
  };

  function downloadedBanks() {
    const p = prefs();
    return p && p.musicOfflineBanks && typeof p.musicOfflineBanks === 'object'
      ? p.musicOfflineBanks : {};
  }

  function offlineBank(desired) {
    const downloaded = downloadedBanks();
    if (desired && downloaded[desired.id]) return desired;
    const p = prefs();
    if (p && p.musicOfflineFallback && downloaded[p.musicOfflineFallback] &&
        banksById[p.musicOfflineFallback]) return banksById[p.musicOfflineFallback];
    for (const id in downloaded) {
      if (downloaded[id] && banksById[id]) return banksById[id];
    }
    return null;
  }

  function shuffle(list, scope) {
    const out = list.slice();
    if (!out.length) return out;
    FB.withSeed(scope, function () {
      for (let i = out.length - 1; i > 0; i--) {
        const j = FB.ri(0, i);
        const value = out[i]; out[i] = out[j]; out[j] = value;
      }
    });
    for (let i = 1; i < out.length; i++) {
      if (out[i] === out[i - 1]) {
        for (let j = i + 1; j < out.length; j++) {
          if (out[j] !== out[i]) {
            const value = out[i]; out[i] = out[j]; out[j] = value;
            break;
          }
        }
      }
    }
    return out;
  }

  function rebuildDeck(bankId) {
    const p = prefs();
    const preferred = p && p.musicPreferred ? p.musicPreferred : {};
    let ids;
    if (bankId === '__all__') {
      ids = (catalog.tracks || []).map(function (track) { return track.id; });
    } else {
      const bank = banksById[bankId];
      ids = bank ? bank.trackIds.slice() : [];
    }
    const weighted = [];
    const availableCount = ids.filter(function (id) { return !failedTracks[id]; }).length;
    ids.forEach(function (id) {
      if (failedTracks[id]) return;
      weighted.push(id);
      if (preferred[id] && availableCount > 1) weighted.push(id, id);
    });
    const seed = FB.state && FB.state.seed ? FB.state.seed : 'menu';
    deck = shuffle(weighted, 'music:' + seed + ':' + bankId + ':' + deckCycle++);
    if (currentTrack && deck.length > 1 && deck[0] === currentTrack.id) {
      const first = deck.shift();
      deck.push(first);
    }
    deckAt = 0;
  }

  function nextDeckTrack() {
    if (!deck.length || deckAt >= deck.length) rebuildDeck(currentBankId);
    let attempts = 0;
    while (deck.length && attempts <= deck.length) {
      if (deckAt >= deck.length) rebuildDeck(currentBankId);
      const track = tracksById[deck[deckAt++]];
      attempts++;
      if (track && !failedTracks[track.id] &&
          (!currentTrack || track.id !== currentTrack.id || deck.length === 1)) return track;
    }
    return null;
  }

  function playFromBank(bankId, options) {
    clearPreparedTrack(true);
    currentBankId = bankId;
    pendingBankId = null;
    rebuildDeck(currentBankId);
    const next = nextDeckTrack();
    return next ? playTrack(next, options) : false;
  }

  function advanceAfterTrack(options) {
    if (pendingBankId) return playFromBank(pendingBankId, options);
    return M.next(options);
  }

  M.sync = function (state, force) {
    if (!initialized) M.init();
    if (state && titlePaused) {
      titlePaused = false;
      stopAudio();
    }
    updateTitleToggle();
    if (!enabled() || !supported || !M.hasCatalog() || !state) return;
    const enteringGame = mode !== 'game';
    mode = 'game';
    let bank;
    if (FB.game && FB.game.observe) {
      bank = { id:'__all__' };
    } else {
      bank = M.resolveBank(state);
    }
    if (!bank) return;
    if (FB.platform.isPlay && (networkUnavailable || navigator.onLine === false)) {
      const fallback = offlineBank(bank.id === '__all__' ? null : bank);
      if (!fallback) return;
      bank = fallback;
    }
    const me = currentCharacter(state);
    const nextSignature = [bank.id, me ? me.id : '', roleFor(state),
      me ? me.religion : '', me ? me.culture : ''].join('|');
    if (!force && signature === nextSignature && currentTrack) return;
    signature = nextSignature;
    if (!force && !enteringGame && currentTrack) {
      pendingBankId = bank.id === currentBankId ? null : bank.id;
      return;
    }
    if (enteringGame && activeAudio >= 0) audio[activeAudio].loop = false;
    playFromBank(bank.id, enteringGame ? { noCrossfade:true } : null);
  };

  M.showTitle = function (force) {
    if (!initialized) M.init();
    clearPreparedTrack(true);
    updateTitleToggle();
    mode = 'title';
    playbackPaused = false;
    signature = 'title';
    currentBankId = null;
    pendingBankId = null;
    repeatTrack = false;
    history = [];
    historyAt = -1;
    updateNowPlaying();
    if (!enabled() || titlePaused || !supported || !selectedIntro) return;
    if (!force && currentTrack && currentTrack.id === selectedIntro.id) return;
    playTrack(selectedIntro);
  };

  M.next = function (options) {
    if (!enabled() || mode !== 'game') return false;
    repeatTrack = false;
    if (pendingBankId) return playFromBank(pendingBankId, options);
    if (historyAt >= 0 && historyAt < history.length - 1) {
      historyAt++;
      options = options || {};
      options.fromHistory = true;
      return playTrack(tracksById[history[historyAt]], options);
    }
    const next = queuedTrack || nextDeckTrack();
    queuedTrack = null;
    return next ? playTrack(next, options) : false;
  };

  M.previous = function () {
    if (!enabled() || mode !== 'game' || historyAt <= 0) return false;
    repeatTrack = false;
    historyAt--;
    return playTrack(tracksById[history[historyAt]], { fromHistory:true });
  };

  M.setRepeat = function (value) {
    repeatTrack = !!value;
    if (activeAudio >= 0 && currentTrack) {
      audio[activeAudio].loop = nativeLoopEnabled(currentTrack);
    }
    if (!repeatTrack) prepareUpcomingTrack();
    return repeatTrack;
  };

  M.isPreferred = function (id) {
    const p = prefs();
    return !!(p && p.musicPreferred && p.musicPreferred[id]);
  };

  M.togglePreferred = function (id) {
    const p = prefs();
    if (!p || !tracksById[id]) return false;
    p.musicPreferred = p.musicPreferred || {};
    if (p.musicPreferred[id]) delete p.musicPreferred[id];
    else p.musicPreferred[id] = true;
    savePrefs();
    clearPreparedTrack(true);
    rebuildDeck(currentBankId || '__all__');
    prepareUpcomingTrack();
    return !!p.musicPreferred[id];
  };

  M.rating = function (id) {
    const p = prefs();
    return p && p.musicRatings ? Number(p.musicRatings[id]) || 0 : 0;
  };

  M.rate = function (id, value) {
    if (!FB.platform.isPlay || !tracksById[id] || (value !== 1 && value !== -1)) return false;
    const p = prefs();
    if (!p) return false;
    p.musicRatings = p.musicRatings || {};
    if (p.musicRatings[id] === value) return false;
    p.musicRatings[id] = value;
    savePrefs();
    const track = tracksById[id];
    const bank = currentBankId ? banksById[currentBankId] : null;
    if (FB.trackTelemetry) {
      FB.trackTelemetry('music-rating', {
        track_id:id,
        track_title:track.title,
        rating:value > 0 ? 'up' : 'down',
        music_bank:bank ? bank.id : track.bankId,
        music_role:bank ? bank.role : track.role
      });
    }
    return true;
  };

  M.isBankDownloaded = function (id) { return !!downloadedBanks()[id]; };

  M.useOfflineBank = function (id) {
    const p = prefs();
    if (!p || !M.isBankDownloaded(id)) return false;
    p.musicOfflineFallback = id;
    savePrefs();
    return true;
  };

  function cacheContains(track) {
    if (!cacheAvailable()) return Promise.resolve(false);
    return caches.open(MUSIC_CACHE).then(function (cache) {
      return cache.match(trackUrl(track)).then(function (response) { return !!response; });
    }, function () { return false; });
  }

  M.isTrackCached = function (track, callback) {
    if (!track) { callback(false); return; }
    if (FB.platform.isFile) {
      callback(true); return;
    }
    cacheContains(track).then(callback, function () { callback(false); });
  };

  function ensureCached(track) {
    if (!cacheAvailable()) return Promise.reject(new Error('Offline music storage is unavailable'));
    const url = trackUrl(track);
    return caches.open(MUSIC_CACHE).then(function (cache) {
      return cache.match(url).then(function (cached) {
        if (cached) return false;
        return fetch(url, { credentials:'same-origin' }).then(function (response) {
          if (!response || !response.ok) throw new Error('Could not download ' + track.title);
          return cache.put(url, response.clone()).then(function () { return true; });
        });
      });
    });
  }

  function markDownloaded(bankIds, all) {
    const p = prefs();
    if (!p) return;
    p.musicOfflineBanks = p.musicOfflineBanks || {};
    bankIds.forEach(function (id) { p.musicOfflineBanks[id] = true; });
    if (bankIds.length) p.musicOfflineFallback = bankIds[bankIds.length - 1];
    p.musicOfflineAll = !!all;
    savePrefs();
  }

  function downloadRecords(records, bankIds, all, progress, done) {
    const token = ++downloadToken;
    let index = 0;
    let bytes = 0;
    const totalBytes = records.reduce(function (sum, track) { return sum + track.bytes; }, 0);
    function step() {
      if (token !== downloadToken) { done(new Error('Download cancelled')); return; }
      if (index >= records.length) {
        markDownloaded(bankIds, all);
        done(null);
        return;
      }
      const track = records[index];
      ensureCached(track).then(function () {
        index++;
        bytes += track.bytes;
        if (progress) progress(index, records.length, bytes, totalBytes);
        step();
      }, function (error) { done(error); });
    }
    if (progress) progress(0, records.length, 0, totalBytes);
    step();
  }

  M.downloadBank = function (id, progress, done) {
    const bank = banksById[id];
    if (!bank) { done(new Error('Unknown music bank')); return; }
    const records = bank.trackIds.map(function (trackId) { return tracksById[trackId]; });
    downloadRecords(records, [id], false, progress, done);
  };

  M.downloadAll = function (progress, done) {
    const records = introTracks().concat(catalog.tracks || []);
    downloadRecords(records, (catalog.banks || []).map(function (bank) { return bank.id; }),
      true, progress, done);
  };

  M.cancelDownload = function () { downloadToken++; };

  function removeRecords(records, done) {
    if (!cacheAvailable()) { done(); return; }
    caches.open(MUSIC_CACHE).then(function (cache) {
      return Promise.all(records.map(function (track) { return cache.delete(trackUrl(track)); }));
    }).then(done, done);
  }

  M.removeBank = function (id, done) {
    const bank = banksById[id];
    if (!bank) { done(); return; }
    const downloaded = downloadedBanks();
    const retainedTracks = {};
    for (const otherId in downloaded) {
      if (otherId === id || !downloaded[otherId] || !banksById[otherId]) continue;
      banksById[otherId].trackIds.forEach(function (trackId) {
        retainedTracks[trackId] = true;
      });
    }
    const records = bank.trackIds.filter(function (trackId) {
      return !retainedTracks[trackId];
    }).map(function (trackId) { return tracksById[trackId]; });
    removeRecords(records, function () {
      const p = prefs();
      if (p && p.musicOfflineBanks) delete p.musicOfflineBanks[id];
      if (p && p.musicOfflineFallback === id) p.musicOfflineFallback = null;
      if (p) p.musicOfflineAll = false;
      savePrefs();
      done();
    });
  };

  M.removeAll = function (done) {
    if (!cacheAvailable()) { done(); return; }
    caches.delete(MUSIC_CACHE).then(function () {
      const p = prefs();
      if (p) {
        p.musicOfflineBanks = {};
        p.musicOfflineFallback = null;
        p.musicOfflineAll = false;
        savePrefs();
      }
      done();
    }, done);
  };

  function validateOfflineMarkers() {
    const p = prefs();
    if (!p || !p.musicOfflineBanks || !cacheAvailable()) return;
    const ids = Object.keys(p.musicOfflineBanks).filter(function (id) {
      return p.musicOfflineBanks[id] && banksById[id];
    });
    Promise.all(ids.map(function (id) {
      const bank = banksById[id];
      return Promise.all(bank.trackIds.map(function (trackId) {
        return cacheContains(tracksById[trackId]);
      })).then(function (values) {
        if (values.some(function (value) { return !value; })) delete p.musicOfflineBanks[id];
      });
    })).then(function () {
      if (p.musicOfflineFallback && !p.musicOfflineBanks[p.musicOfflineFallback]) {
        p.musicOfflineFallback = null;
      }
      if (p.musicOfflineAll && (catalog.banks || []).some(function (bank) {
        return !p.musicOfflineBanks[bank.id];
      })) p.musicOfflineAll = false;
      savePrefs();
    });
  }

  M.storageSummary = function (callback) {
    if (!navigator.storage || typeof navigator.storage.estimate !== 'function') {
      callback(null); return;
    }
    navigator.storage.estimate().then(function (estimate) {
      callback({ usage:estimate.usage || 0, quota:estimate.quota || 0 });
    }, function () { callback(null); });
  };

  M.requestPersistentStorage = function () {
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      navigator.storage.persist().then(function () {}, function () {});
    }
  };
})();
