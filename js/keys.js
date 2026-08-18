/* Fallowborn — desktop keyboard controls.
   Arrows pan · Shift+arrows jump to a neighboring province · PgUp/PgDn zoom ·
   +/- game speed (zoom on the start-picker map) · H home · Enter select
   province at screen center · 1-9 pick focuses / deeds / event options /
   dialog items, Shift+1-9 reaches items 10-18 (physical keys, any layout) ·
   Space or E play/pause · F skip to the next happening ·
   Z autoresolve settings · D/S/K/L/N/C open Deeds/Self/Kin/Land/Network/Chronicle
   panels · configurable unused letters fire semantic action bindings ·
   [ ] cycle panels · Esc menu / back / close dialog. */
window.FB = window.FB || {};

(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  const PAN = 48; // screen px per keypress

  function gameVisible() { return !$('game').classList.contains('hidden'); }
  function eventOpen() { return !$('eventmodal').classList.contains('hidden'); }
  function genOpen() { return !$('genmodal').classList.contains('hidden'); }
  function travelOpen() {
    return FB.ui && FB.ui.travelPickerOpen && FB.ui.travelPickerOpen();
  }
  function raidOpen() {
    return FB.ui && FB.ui.raidPickerOpen && FB.ui.raidPickerOpen();
  }

  function clickNth(sel, n) {
    const nodes = document.querySelectorAll(sel);
    const visibleModalActions = sel.indexOf('#gm-body') === 0;
    const btns = visibleModalActions
      ? Array.prototype.filter.call(nodes, function (node) {
        return !node.hidden && node.getClientRects().length > 0;
      })
      : nodes;
    if (n >= 0 && n < btns.length && !btns[n].disabled) btns[n].click();
  }

  function modalFocusable() {
    const modal = $('genmodal');
    if (!modal) return [];
    const nodes = modal.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), ' +
      '[tabindex]:not([tabindex="-1"])');
    return Array.prototype.filter.call(nodes, function (node) {
      return !node.hidden && node.getClientRects().length > 0;
    });
  }

  function containModalTab(e) {
    const modal = $('genmodal');
    const controls = modalFocusable();
    if (!controls.length) {
      e.preventDefault();
      return;
    }
    const first = controls[0], last = controls[controls.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === modal ||
        !modal.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || active === modal ||
        !modal.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  }

  function eventFocusable() {
    const modal = $('eventmodal');
    if (!modal) return [];
    const nodes = modal.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), ' +
      '[tabindex]:not([tabindex="-1"])');
    return Array.prototype.filter.call(nodes, function (node) {
      return !node.hidden && node.getClientRects().length > 0;
    });
  }

  function containEventTab(e) {
    const modal = $('eventmodal');
    const controls = eventFocusable();
    if (!controls.length) {
      e.preventDefault();
      return;
    }
    const first = controls[0], last = controls[controls.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === modal ||
        !modal.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || active === modal ||
        !modal.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  }

  function centerProvince() {
    const M = FB.map;
    if (!M || !M.canvas || !FB.world) return null;
    const wx = M.viewX + M.canvas.width / 2 / M.zoom;
    const wy = M.viewY + M.canvas.height / 2 / M.zoom;
    return FB.provinceAtGrid(wx, wy);
  }

  function currentPid() {
    if (FB.game && FB.game.pickMode && FB.game.pending && FB.game.pending.provinceId) {
      return FB.game.pending.provinceId;
    }
    if (FB.map && FB.map.selected) return FB.map.selected;
    if (FB.state) return FB.state.player.provinceId;
    const pr = centerProvince();
    return pr ? pr.id : null;
  }

  /* Shift+arrow: hop to the adjacent province that best matches the direction */
  function moveSelection(dx, dy) {
    const pid = currentPid();
    if (!pid || !FB.world) return;
    const cur = FB.world.byId[pid];
    if (!cur) return;
    let best = null, bs = 0.3;
    for (const nb in (FB.world.adj[pid] || {})) {
      const p2 = FB.world.byId[nb];
      if (!p2 || p2.wasteland) continue;
      const vx = p2.cx - cur.cx, vy = p2.cy - cur.cy;
      const len = Math.hypot(vx, vy) || 1;
      const dot = (vx * dx + vy * dy) / len;
      if (dot > bs) { bs = dot; best = p2; }
    }
    if (best) {
      if (FB.map.onTap) FB.map.onTap(best);
      FB.map.centerOn(best.id, FB.map.zoom);
    }
  }

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) {
      if (e.key === 'Enter' && t.id === 'cg-name') { e.preventDefault(); $('btn-cg-start').click(); }
      if (e.key === 'Enter' && t.id === 'ev-name') { e.preventDefault(); clickNth('#ev-options .evopt', 0); }
      return;
    }
    const onButton = t && t.tagName === 'BUTTON';
    const k = e.key;
    /* 1-9 hotkeys by PHYSICAL key (number row or numpad, any layout, any
       NumLock state); holding Shift reaches list items 10-18 (⇧1-⇧9). */
    let digit = 0;
    if (e.code && e.code.length === 6 && e.code.indexOf('Digit') === 0) digit = +e.code.charAt(5) || 0;
    else if (e.code && e.code.length === 7 && e.code.indexOf('Numpad') === 0) digit = +e.code.charAt(6) || 0;
    if (!digit && k >= '1' && k <= '9') digit = +k;
    const slot = digit ? digit - 1 + (e.shiftKey ? 9 : 0) : -1;

    /* ---- event modal first: it demands a choice ---- */
    if (eventOpen()) {
      if (k === 'Tab') containEventTab(e);
      else if (digit) { e.preventDefault(); clickNth('#ev-options .evopt', slot); }
      return; // Enter/Space act natively on the focused control
    }

    /* ---- generic dialog (menu, war targets, heirs, saves...) ---- */
    if (genOpen()) {
      if (k === 'Escape') {
        if (FB.ui._gmDismiss) { e.preventDefault(); FB.ui.closeModal(); }
      } else if (k === 'Tab') {
        containModalTab(e);
      } else if (digit) {
        e.preventDefault();
        clickNth('#gm-body .actionbtn, #gm-body .settcard-raise', slot);
      }
      return;
    }

    /* ---- full-screen menus without the map ---- */
    if (!gameVisible()) {
      if (k === 'Escape') {
        if (!$('newgame').classList.contains('hidden')) $('btn-ng-back').click();
        else if (!$('chargen').classList.contains('hidden')) $('btn-cg-back').click();
      }
      return;
    }

    if (travelOpen()) {
      if (k === 'Escape') {
        e.preventDefault();
        FB.ui.cancelTravelPicker();
        return;
      }
      if (digit) {
        e.preventDefault();
        clickNth('#travel-destination-list .travel-destination', slot);
        return;
      }
      if (k === ' ' || k === 'e' || k === 'E' || k === 'f' || k === 'F') {
        e.preventDefault();
        return;
      }
    }

    if (raidOpen()) {
      if (k === 'Escape') {
        e.preventDefault();
        FB.ui.closeRaidMapPicker(false);
        return;
      }
      if (k === ' ' || k === 'e' || k === 'E' || k === 'f' || k === 'F') {
        e.preventDefault();
        return;
      }
    }

    if (FB.game && FB.game.pickMode && k === 'Escape') { $('btn-pick-back').click(); return; }

    /* User bindings are semantic deed/focus targets. Digits never enter this
       path, so positional modal navigation keeps its independent meaning. */
    if (!travelOpen() && !raidOpen() && !(FB.game && FB.game.pickMode) &&
        !e.shiftKey && !e.repeat && FB.ui && FB.ui.runActionShortcut &&
        FB.ui.runActionShortcut(k)) {
      e.preventDefault();
      return;
    }

    /* ---- map & game keys ---- */
    const M = FB.map;
    if (!M || !M.canvas) return;
    /* numpad digits pick deeds even when NumLock routes them to nav keys */
    if (digit && e.code && e.code.indexOf('Numpad') === 0 &&
      FB.state && $('tab-actions').classList.contains('active')) {
      e.preventDefault();
      clickNth('#tab-actions .actionbtn', slot);
      return;
    }
    switch (k) {
      case 'ArrowUp':
        e.preventDefault();
        if (e.shiftKey) moveSelection(0, -1); else M.panBy(0, -PAN);
        return;
      case 'ArrowDown':
        e.preventDefault();
        if (e.shiftKey) moveSelection(0, 1); else M.panBy(0, PAN);
        return;
      case 'ArrowLeft':
        e.preventDefault();
        if (e.shiftKey) moveSelection(-1, 0); else M.panBy(-PAN, 0);
        return;
      case 'ArrowRight':
        e.preventDefault();
        if (e.shiftKey) moveSelection(1, 0); else M.panBy(PAN, 0);
        return;
      case 'd': case 'D': if (FB.state) FB.ui.showTab('actions'); return;
      case 's': case 'S': if (FB.state) FB.ui.showTab('char'); return;
      case 'k': case 'K': if (FB.state) FB.ui.showTab('family'); return;
      case 'l': case 'L': if (FB.state) FB.ui.showTab('prov'); return;
      case 'n': case 'N': if (FB.state) FB.ui.showTab('network'); return;
      case 'c': case 'C': if (FB.state) FB.ui.showTab('log'); return;
      case '+': case '=':
        e.preventDefault();
        if (FB.state) FB.game.setSpeed(1); else M.zoomIn();
        return;
      case '-': case '_':
        e.preventDefault();
        if (FB.state) FB.game.setSpeed(-1); else M.zoomOut();
        return;
      case 'PageUp': e.preventDefault(); M.zoomIn(); return;
      case 'PageDown': e.preventDefault(); M.zoomOut(); return;
      case 'z': case 'Z':
        if (FB.state && !FB.ui.eventsBusy()) FB.ui.showAutoResolve();
        return;
      case 'h': case 'H': case 'Home':
        if (FB.state && FB.game.observe) M.fitView(); // no home — the whole board
        else if (FB.state) M.centerOn(FB.state.player.provinceId, 2.2);
        return;
      case 'r': case 'R':
        if (FB.state) FB.ui.cycleMapMode();
        return;
      case 'Enter': {
        if (onButton) return; // let the focused button click natively
        const pr = centerProvince();
        if (pr && M.onTap) M.onTap(pr);
        return;
      }
      case ' ':
        if (onButton) return; // native button activation
        e.preventDefault();
        if (e.repeat) return; // a held key must not flicker pause
        if (FB.state && !FB.ui.eventsBusy()) FB.game.togglePause();
        return;
      case 'e': case 'E':
        e.preventDefault();
        if (e.repeat) return;
        if (FB.state && !FB.ui.eventsBusy()) FB.game.togglePause();
        return;
      case 'f': case 'F':
        e.preventDefault();
        // hold-to-fast-forward: key auto-repeat keeps skipping ahead (unlike the
        // Space/E pause toggles, a repeated one-way skip is harmless and useful).
        if (FB.state && !FB.ui.eventsBusy() && !FB.game.fastForwarding) {
          FB.game.setPaused(true);
          FB.game.skipAhead();
        }
        return;
      case '?': case '/':
        if (FB.state && FB.ui.toggleFindOverlay && !FB.ui.eventsBusy()) {
          e.preventDefault();
          FB.ui.toggleFindOverlay();
        }
        return;
      case '[': if (FB.state) FB.ui.cycleTab(-1); return;
      case ']': if (FB.state) FB.ui.cycleTab(1); return;
      case 'Escape': case 'm': case 'M':
        if (FB.state && k === 'Escape' && FB.ui.isFindOverlayOpen && FB.ui.isFindOverlayOpen()) {
          FB.ui.setFindOverlay(false);
          return;
        }
        if (FB.state && k === 'Escape' && FB.ui.isMusicOverlayOpen && FB.ui.isMusicOverlayOpen()) {
          FB.ui.setMusicOverlay(false);
          return;
        }
        if (FB.state && k === 'Escape' && FB.selectedArmy && FB.selectedArmy(FB.state)) {
          FB.selectArmy(null); // let go of the host before the menu
          if (FB.map) FB.map.request();
          return;
        }
        if (FB.state) FB.ui.showMenu();
        return;
      default:
        if (digit && FB.state && $('tab-actions').classList.contains('active')) {
          clickNth('#tab-actions .actionbtn', slot);
        }
    }
  });
})();
