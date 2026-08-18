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
     an autoresolve chain, a whole fast-forward) repaints the panels once,
     on the next animation frame. */
  let refreshQueued = false;
  let refreshDeferredForFastForward = false;
  UI.refresh = function () {
    if (FB.game && FB.game.fastForwarding) {
      refreshDeferredForFastForward = true;
      return;
    }
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(function () {
      refreshQueued = false;
      if (FB.game && FB.game.fastForwarding) {
        refreshDeferredForFastForward = true;
        return;
      }
      if (FB.state && FB.tutorialCheck) FB.tutorialCheck(FB.state);
      if (FB.state && FB.music) FB.music.sync(FB.state);
      refreshNow();
      if (UI.maybeShowCoachmark) UI.maybeShowCoachmark();
    });
  };
  UI.flushFastForwardRefresh = function () {
    if (!refreshDeferredForFastForward && refreshQueued) return;
    refreshDeferredForFastForward = false;
    UI.refresh();
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

  SH.portraitKey = '';
  function refreshNow() {
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
      renderActiveTab();
      return;
    }
    const me = s.chars[s.player.charId];
    $('tb-name').textContent = FB.playerPope && FB.playerPope(s)
      ? me.papalName || me.name : FB.fullName(me);
    // The portrait's target stamp makes this call a no-op while unchanged;
    // the separate crest key avoids redrawing heraldry on ordinary refreshes.
    const pk = FB.characterVisualKey(s, me);
    if (pk !== SH.portraitKey) {
      SH.portraitKey = pk;
      FB.drawCrest($('crest'), me.dyn || me.name);
    }
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
    $('tb-gold').innerHTML = esc(coinIcon) + (coinIcon === '💰' ? ' ' : '') + '<span class="mono">' +
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
    $('btn-auto').innerHTML = (FB.isTouch ? '' : '<span class="keyhint">Z</span> ') + '⚙' +
      (FB.game.auto && (FB.game.auto.minor || FB.game.auto.major || FB.game.auto.war || FB.game.auto.all ||
        (autoAccess.hosts && FB.game.auto.hosts &&
          FB.game.auto.hosts !== 'manual') ||
        (autoAccess.build && FB.game.auto.build) ||
        (autoAccess.research && FB.game.auto.research)) ? '✓' : '');
    renderActiveTab();
  }

  /* ===== shared exports (bound by the later UI files) ===== */
  SH.fmtAmt = fmtAmt;
  SH.statBreakdownHtml = statBreakdownHtml;
})();
