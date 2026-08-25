/* Fallowborn — UI: top bar refresh: stats, portrait, date, pause/skip controls (split from ui.js). Loads after
   ui_misc.js; shares internals through FB.ui._shared. */
/* Contents: top bar & panels */
window.FB = window.FB || {};

(function () {
  'use strict';

  const UI = FB.ui;
  const SH = UI._shared;
  const $ = SH.$;
  const automationAccess = SH.automationAccess;
  const esc = SH.esc;
  const renderActiveTab = SH.renderActiveTab;

  /* ================= top bar & panels ================= */
  /* Refresh requests coalesce: a burst of calls in one JS turn (a day tick,
     an autoresolve chain, a whole fast-forward) updates on the next animation
     frame. Natural ticks may refresh only the lightweight chrome. */
  let refreshQueued = false;
  let queuedRefreshKind = 0; // 1 = natural live tick, 2 = exact/player-driven
  let refreshDeferredForFastForward = false;
  let refreshDeferredForMapInteraction = 0;
  function mapInteractionActive() {
    return !!(FB.map && FB.map.isInteracting && FB.map.isInteracting());
  }
  UI.refresh = function (options) {
    const refreshKind = options && options.liveTick ? 1 : 2;
    /* Mark Deeds stale at request time, before coalescing or deferral, so a
       tab click cannot reuse it while a state-changing refresh is pending. */
    if (SH.markActionsDirty) SH.markActionsDirty();
    if (FB.game && FB.game.fastForwarding) {
      refreshDeferredForFastForward = true;
      return;
    }
    if (mapInteractionActive()) {
      if (refreshKind > refreshDeferredForMapInteraction) {
        refreshDeferredForMapInteraction = refreshKind;
      }
      return;
    }
    if (refreshKind > queuedRefreshKind) queuedRefreshKind = refreshKind;
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(function () {
      refreshQueued = false;
      const runKind = queuedRefreshKind;
      queuedRefreshKind = 0;
      if (FB.game && FB.game.fastForwarding) {
        refreshDeferredForFastForward = true;
        return;
      }
      if (mapInteractionActive()) {
        if (runKind > refreshDeferredForMapInteraction) {
          refreshDeferredForMapInteraction = runKind;
        }
        return;
      }
      if (FB.state && FB.tutorialCheck) FB.tutorialCheck(FB.state);
      if (FB.state && FB.music) FB.music.sync(FB.state);
      refreshNow(runKind === 1);
      if (UI.refreshCoachmarkTarget) UI.refreshCoachmarkTarget();
      if (UI.maybeShowCoachmark) UI.maybeShowCoachmark();
    });
  };
  UI.flushFastForwardRefresh = function (options) {
    if (!refreshDeferredForFastForward && refreshQueued) return;
    refreshDeferredForFastForward = false;
    /* Fast-forward completion deliberately supplies a live-tick refresh: the
       visible catalogue/panel stays mounted while chrome catches up. Other
       callers retain the exact-refresh default. */
    UI.refresh(options);
  };
  UI.flushMapInteractionRefresh = function () {
    if (!refreshDeferredForMapInteraction) return;
    const refreshKind = refreshDeferredForMapInteraction;
    refreshDeferredForMapInteraction = 0;
    UI.refresh(refreshKind === 1 ? { liveTick:true } : undefined);
  };

  /* last season's measured net change, as a small ± beside a topbar stat;
     tiny drifts keep one decimal so a slow trickle does not read as +0 */
  function netBadge(v, money) {
    if (v === undefined || v === null) return '';
    const r = Math.abs(v) < 10 ? Math.round(v * 10) / 10 : Math.round(v);
    if (!r) return '';
    const value = money ? FB.money(r, { omitPrimarySymbol:true }) : String(r);
    return ' <span class="net ' + (r > 0 ? 'op-good' : 'op-bad') + '">' +
      (r > 0 ? '+' : '') + esc(value) + '</span>';
  }

  /* a source amount in the breakdown: same rounding as the net badge */
  function fmtAmt(v, money) {
    const r = Math.abs(v) < 10 ? Math.round(v * 10) / 10 : Math.round(v);
    return (r > 0 ? '+' : '') + (money ? FB.money(r) : r);
  }

  /* the topbar stat breakdown (hover on desktop, tap for the modal): what
     gold/prestige/piety the player's station brings in each season, source
     by source — focus, rents, dues, buildings, household, treasures, upkeep */
  function statBreakdownHtml(stat) {
    const bd = FB.incomeBreakdown(FB.state)[stat];
    let h = '';
    for (const ln of bd.lines) {
      h += '<div class="bd-row"><span>' + esc(ln.label) + '</span>' +
        '<span class="bd-amt ' + (ln.amount > 0 ? 'op-good' : 'op-bad') + '">' +
        esc(fmtAmt(ln.amount, stat === 'gold')) + '</span></div>';
    }
    if (!bd.lines.length) {
      h += '<div class="bd-note">' +
        esc(FB.T('No steady income yet.')) + '</div>';
    } else {
      h += '<div class="bd-row bd-total"><span>' + esc(FB.T('Each season')) + '</span>' +
        '<span class="bd-amt ' + (bd.total > 0 ? 'op-good' : bd.total < 0 ? 'op-bad' : '') + '">' +
        esc(fmtAmt(bd.total, stat === 'gold')) + '</span></div>';
    }
    if (stat === 'gold' && bd.coinAdjustment !== undefined) {
      h += '<div class="bd-row"><span>' + esc(FB.T('Coin and prices this year')) + '</span>' +
        '<span class="bd-amt ' + (bd.coinAdjustment > 0 ? 'op-good' :
          bd.coinAdjustment < 0 ? 'op-bad' : '') + '">' +
        esc(fmtAmt(bd.coinAdjustment, true)) + '</span></div>';
    }
    if (stat === 'gold' && FB.state.player.gold < -0.0001) {
      h += '<div class="bd-note op-bad">' + esc(FB.T(
        'Cash shortfall: future gold first brings the purse back to zero. This is not a signed loan and adds no interest or creditor claim.')) + '</div>';
    }
    h += '<div class="bd-note">' + esc(FB.T(
      'The ± beside the stat is last season’s real change — events and deeds included.')) + '</div>';
    if (!FB.game.uiPrefs || !FB.game.uiPrefs.hideBeginnerHints) {
      // one beginner teaching line per stat — the shared renderer feeds both
      // the desktop hover tooltip and the mobile tap sheet
      const teach = {
        gold:'Money pays for land, enterprises, gifts — and freedom.',
        prestige:'Prestige legitimizes advancement: freedom, a manor, a title.',
        piety:'Piety opens the church’s roads — blessings, offices, good standing.'
      }[stat];
      if (teach) h += '<div class="bd-note">🌱 ' + esc(FB.T(teach)) + '</div>';
    }
    return h;
  }

  SH.crestKey = '';
  function refreshNow(liveTick) {
    const s = FB.state;
    if (!s || s.player.dead) return;
    // the fast-forward button's F hotkey badge (desktop only) — rendered every
    // refresh so it holds in both observe and normal modes and in every locale
    $('btn-skip').innerHTML = (FB.isTouch ? '' : '<span class="keyhint">F</span> ') + '▶▶';
    const dd = (s.date.day < 10 ? '\u00A0' : '') + s.date.day; // fixed 2-char day (nbsp — a plain space collapses in HTML)
    /* observe mode: no face, no purse — a nameless watcher and the date */
    if (FB.game.observe) {
      $('tb-name').textContent = FB.T('👁 Observing');
      $('tb-title').textContent = FB.T('the realms play out on their own');
      $('tb-date').innerHTML = '<span class="mono">' + esc(FB.T('{season} {day} · {year} AD', {
        season: FB.seasonName(s.date.season), day: dd, year: s.date.year
      })) + '</span>';
      $('btn-endturn').innerHTML = (FB.isTouch ? '' : '<span class="keyhint">Space</span> ') +
        '<span class="pp">' + esc(FB.T(FB.game.paused ? '▶ Play' : '❚❚ Pause')) + '</span>';
      renderActiveTab(liveTick ? { liveTick:true } : undefined);
      return;
    }
    const me = s.chars[s.player.charId];
    $('tb-name').textContent = FB.playerPope && FB.playerPope(s)
      ? me.papalName || me.name : FB.fullName(me);
    // The portrait's target stamp makes this call a no-op while unchanged;
    // the separate crest key avoids redrawing heraldry on ordinary refreshes.
    const crestKey = me.dyn || me.name;
    if (crestKey !== SH.crestKey) {
      SH.crestKey = crestKey;
      FB.drawCrest($('crest'), me.dyn || me.name);
    }
    /* paintPortrait already derives and checks its visual key. Calling
       characterVisualKey first duplicated the full portrait descriptor on
       every live day even when the retained canvas was already current. */
    FB.paintPortrait($('tb-portrait'), me, s.date.year, {
      state:s, profession:s.player.profession, tier:s.player.tier,
      ill:!!s.player.flags.ill
    });
    const pr = FB.world.byId[s.player.provinceId];
    $('tb-title').textContent = FB.styledTitle(s) + ' · ' + (pr ? FB.L(pr.name) : '?');
    const dateStr = FB.T('{season} {day} · {year} AD', {
      season: FB.seasonName(s.date.season), day: dd, year: s.date.year
    });
    const net = s.seasonNet || {};
    const coinIcon = FB.money(0, { style:'icon' });
    $('tb-gold').innerHTML = esc(coinIcon) + (coinIcon === '💰' ? ' ' : '') + '<span class="mono' +
      (s.player.gold < -0.0001 ? ' op-bad' : '') + '">' +
      esc(FB.money(s.player.gold, { omitPrimarySymbol:true })) + '</span>' +
      netBadge(net.gold, true);
    $('tb-gold').setAttribute('aria-label', FB.T('{label}: {amount}', {
      label:FB.currencyLabel(), amount:FB.money(s.player.gold, { style:'long' })
    }));
    $('tb-prestige').innerHTML = '⭐ <span class="mono">' + Math.floor(s.player.prestige) + '</span>' + netBadge(net.prestige);
    $('tb-piety').innerHTML = FB.religionOf(me.religion, s).icon + ' <span class="mono">' + Math.floor(s.player.piety) + '</span>' + netBadge(net.piety);
    $('tb-health').innerHTML = '❤️ <span class="mono">' + Math.round(me.health) + '</span>';
    $('tb-date').innerHTML = '<span class="mono">' + dateStr + '</span>';
    const kh = FB.isTouch ? '' : '<span class="keyhint">Space</span> ';
    $('btn-endturn').innerHTML = kh + '<span class="pp">' +
      esc(FB.T(FB.game.paused ? '▶ Play' : '❚❚ Pause')) + '</span>';
    const autoAccess = automationAccess(s);
    $('btn-auto').innerHTML = (FB.isTouch ? '' : '<span class="keyhint">V</span> ') + '⚙' +
      (FB.game.auto && (FB.game.auto.minor || FB.game.auto.major || FB.game.auto.war || FB.game.auto.all ||
        (autoAccess.hosts && FB.game.auto.hosts &&
          FB.game.auto.hosts !== 'manual') ||
        (autoAccess.build && FB.game.auto.build) ||
        (autoAccess.research && FB.game.auto.research)) ? '✓' : '');
    renderActiveTab(liveTick ? { liveTick:true } : undefined);
  }

  /* ===== shared exports (bound by the later UI files) ===== */
  SH.fmtAmt = fmtAmt;
  SH.statBreakdownHtml = statBreakdownHtml;
})();
