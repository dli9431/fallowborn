/* Fallowborn — UI: screens, panels, modals, event display */
window.FB = window.FB || {};

(function () {
  'use strict';

  const UI = {};
  FB.ui = UI;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return FB.esc(s); }
  function dt(s, kind, id, def, path, ctx) {
    return FB.dataText(s, s.player.charId, kind, id, def, path, ctx || {});
  }
  function cultureName(s, id) {
    const def = FB.cultureOf(id);
    return dt(s, 'culture', id, def, 'name');
  }
  function religionName(s, id) {
    const def = FB.religionOf(id);
    return dt(s, 'religion', id, def, 'name');
  }
  const TERRAIN_NAMES = {
    farmland: 'farmland', forest: 'forest', hills: 'hills', mountains: 'mountains',
    desert: 'desert', steppe: 'steppe', marsh: 'marsh', tundra: 'tundra'
  };
  function terrainName(id) {
    const source = TERRAIN_NAMES[id] || id;
    return FB.renderKey('terrain.' + id + '.default', { text: source }, {});
  }
  FB.terrainName = terrainName;
  function settlementKindName(id) {
    const source = id === 'city' ? 'city' : (id === 'town' ? 'town' : 'village');
    return FB.renderKey('settlement.' + source + '.default', { text: source }, {});
  }
  function rarityName(id) {
    const source = id === 'famed' ? 'famed' : (id === 'fine' ? 'fine' : 'common');
    return FB.renderKey('rarity.' + source + '.default', { text: source }, {});
  }
  const ROLE_NAMES = {
    lord: 'Lord', priest: 'Priest', friend: 'Friend', rival: 'Rival',
    notable: 'Notable', suitor: 'Suitor', match: 'Match', kinspouse: 'Kin by marriage',
    spouse: 'Spouse', tutor: 'Tutor', parent: 'Parent', sibling: 'Sibling'
  };
  function roleName(role) {
    return FB.T(ROLE_NAMES[role] || role);
  }
  function epithetText(s, c) {
    if (c.epithetMsg) {
      return FB.renderMessage(c.epithetMsg, {
        state: s, viewer: s.player.charId
      });
    }
    return c.epithet ? FB.L(c.epithet) : '';
  }
  function countyCountText(s, count) {
    return FB.renderMessage(FB.msg('fx.ui.counties', {
      forms: {
        select: 'plural', param: 'count', cases: {
          one: '{count} county',
          other: '{count} counties'
        }
      }
    }, { count: count }), { state: s, viewer: s.player.charId });
  }
  function menText(s, count) {
    return FB.renderMessage(FB.msg('fx.ui.men', {
      forms: {
        select: 'plural', param: 'count', cases: {
          one: '{count} man',
          other: '{count} men'
        }
      }
    }, { count: count }), { state: s, viewer: s.player.charId });
  }

  /* localization chokepoints: a labeled stat row and a panel header. Each wraps
     its (translatable) label through FB.T once, so every row/header is covered at
     a single site rather than per literal. The value is caller-controlled HTML
     and is passed through untouched. */
  function kv(label, value) {
    return '<div class="kv"><span>' + esc(FB.T(label)) + '</span><b>' + value + '</b></div>';
  }
  function panelh(title) {
    return '<div class="panelh">' + esc(FB.T(title)) + '</div>';
  }

  let eventOpen = false;
  let pendingEvents = [];

  /* ================= screens ================= */
  UI.showScreen = function (id) {
    for (const sid of ['loading', 'title', 'newgame', 'pickprov', 'chargen']) {
      const el = $(sid);
      el.classList.toggle('hidden', sid !== id);
      el.classList.remove('asbar');
    }
    $('game').classList.toggle('hidden', id !== null);
    if (id && id !== 'loading') {
      setTimeout(function () {
        const scr = $(id);
        if (scr.classList.contains('hidden')) return;
        const b = scr.querySelector('input[type=text], button:not(:disabled):not(.hidden)');
        if (b) b.focus();
      }, 0);
    }
  };

  UI.showGame = function () {
    UI.showScreen(null);
    portraitKey = ''; // a new life or loaded save must never keep the old face
    logRenderedTail = null; logRenderedLen = -1;
    FB.map.resize();
    FB.map.request();
  };

  /* ================= toasts (tap one to dismiss it) ================= */
  UI.toast = function (text, params) {
    const box = $('toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = FB.T(text, params);
    el.title = FB.T('Dismiss');
    el.addEventListener('click', function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    box.appendChild(el);
    while (box.children.length > 5) box.removeChild(box.firstChild);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 6000);
  };
  UI.toastMessage = function (message, legacyText) {
    const box = $('toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message ? FB.renderMessage(message, {
      state: FB.state,
      viewer: FB.state && FB.state.player ? FB.state.player.charId : null
    }) : (legacyText || '');
    el.title = FB.T('Dismiss');
    el.addEventListener('click', function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    box.appendChild(el);
    while (box.children.length > 5) box.removeChild(box.firstChild);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 6000);
  };

  /* ================= map politics hookup ================= */
  /* Rebuilding the map base image is the priciest paint in the game, and one
     world tick can transfer several provinces — coalesce to a single rebuild
     on the next frame (before the render: rAF callbacks run in queue order). */
  let mapDirtyQueued = false;
  UI.mapDirty = function () {
    if (mapDirtyQueued) return;
    mapDirtyQueued = true;
    requestAnimationFrame(function () {
      mapDirtyQueued = false;
      mapDirtyNow();
    });
  };
  function mapDirtyNow() {
    const s = FB.state;
    if (!s || !FB.map.base) return;
    const caps = [];
    for (const id in s.realms) {
      const r = s.realms[id];
      if (r.alive && !r.liege) caps.push(r.capital); // sovereign capitals only
    }
    FB.map.setOwnerFns(
      function (pid) { return s.owner[pid]; },
      function (rid) { return s.realms[rid] ? s.realms[rid].color : '#777777'; },
      caps,
      function (pid) { return s.holder ? s.holder[pid] : s.owner[pid]; }
    );
    FB.map.buildBase();
    FB.map.select(FB.map.selected, mapGroupOf); // realm highlight tracks conquests
    FB.map.request();
  }

  /* ================= top bar & panels ================= */
  /* Refresh requests coalesce: a burst of calls in one JS turn (a day tick,
     an autoresolve chain, a whole fast-forward) repaints the panels once,
     on the next animation frame. */
  let refreshQueued = false;
  UI.refresh = function () {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(function () {
      refreshQueued = false;
      refreshNow();
    });
  };

  /* last season's measured net change, as a small ± beside a topbar stat;
     tiny drifts keep one decimal so a slow trickle does not read as +0 */
  function netBadge(v) {
    if (v === undefined || v === null) return '';
    const r = Math.abs(v) < 10 ? Math.round(v * 10) / 10 : Math.round(v);
    if (!r) return '';
    return ' <span class="net ' + (r > 0 ? 'op-good' : 'op-bad') + '">' + (r > 0 ? '+' : '') + r + '</span>';
  }

  let portraitKey = '';
  function refreshNow() {
    const s = FB.state;
    if (!s || s.player.dead) return;
    const dd = (s.date.day < 10 ? '\u00A0' : '') + s.date.day; // fixed 2-char day (nbsp — a plain space collapses in HTML)
    /* observe mode: no face, no purse — a nameless watcher and the date */
    if (FB.game.observe) {
      $('tb-name').textContent = FB.T('👁 Observing');
      $('tb-title').textContent = FB.T('the realms play out on their own');
      $('tb-date').innerHTML = '<span class="mono">' + esc(FB.T('{season} {day} · {year} AD', {
        season: FB.seasonName(s.date.season), day: dd, year: s.date.year
      })) + '</span>';
      $('btn-endturn').innerHTML = (FB.isTouch ? '' : '<span class="keyhint">Space</span> ') +
        '<span class="pp">' + esc(FB.T(FB.game.paused ? '▶ Play' : '❚❚ Pause')) +
        '</span><span class="mono">' + esc(FB.T('{season} {day}', {
          season: FB.seasonName(s.date.season), day: dd
        })) + '</span>';
      renderActiveTab();
      return;
    }
    const me = s.chars[s.player.charId];
    $('tb-name').textContent = FB.fullName(me);
    // the topbar portrait and crest change rarely; repaint only when
    // something they draw from has moved
    const pk = me.id + '|' + (me.dyn || me.name) + '|' + s.date.year + '|' +
      s.player.profession + '|' + s.player.tier + '|' + me.traits.join(',');
    if (pk !== portraitKey) {
      portraitKey = pk;
      FB.paintPortrait($('tb-portrait'), me, s.date.year, { profession: s.player.profession, tier: s.player.tier });
      FB.drawCrest($('crest'), me.dyn || me.name);
    }
    const pr = FB.world.byId[s.player.provinceId];
    $('tb-title').textContent = FB.styledTitle(s) + ' · ' + (pr ? pr.name : '?');
    const dateStr = FB.T('{season} {day} · {year} AD', {
      season: FB.seasonName(s.date.season), day: dd, year: s.date.year
    });
    const net = s.seasonNet || {};
    $('tb-gold').innerHTML = '💰 <span class="mono">' + Math.floor(s.player.gold) + '</span>' + netBadge(net.gold);
    $('tb-prestige').innerHTML = '⭐ <span class="mono">' + Math.floor(s.player.prestige) + '</span>' + netBadge(net.prestige);
    $('tb-piety').innerHTML = FB.religionOf(me.religion).icon + ' <span class="mono">' + Math.floor(s.player.piety) + '</span>' + netBadge(net.piety);
    $('tb-health').innerHTML = '❤️ <span class="mono">' + Math.round(me.health) + '</span>';
    $('tb-date').innerHTML = '<span class="mono">' + dateStr + '</span>';
    const kh = FB.isTouch ? '' : '<span class="keyhint">Space</span> ';
    $('btn-endturn').innerHTML = kh + '<span class="pp">' +
      esc(FB.T(FB.game.paused ? '▶ Play' : '❚❚ Pause')) +
      '</span><span class="mono">' + esc(FB.T('{season} {day}', {
        season: FB.seasonName(s.date.season), day: dd
      })) + '</span>';
    $('btn-auto').innerHTML = (FB.isTouch ? '' : '<span class="keyhint">Z</span> ') + '⚙' +
      (FB.game.auto && FB.game.auto.on ? '✓' : '');
    renderActiveTab();
  }

  /* hotkey badge for the Nth list item: 1-9, then ⇧1-⇧9 */
  function hintFor(n) {
    if (FB.isTouch) return '';
    if (n < 9) return '<span class="keyhint">' + (n + 1) + '</span>';
    if (n < 18) return '<span class="keyhint">⇧' + (n - 8) + '</span>';
    return '';
  }
  UI.hintFor = hintFor;

  let activeTab = 'actions';    // right panel: actions | prov | log
  let activeLeftTab = 'char';   // left panel: char | family (Self open by default)
  const LEFT_TABS = ['char', 'family'];

  function renderActiveTab() {
    if (FB.game && FB.game.observe) { // a watcher needs only the land and the chronicle
      if (activeTab === 'prov') renderProv(); else renderLog();
      return;
    }
    // on phones Self/Kin is a closed drawer most of the time (display:none →
    // offsetParent null): skip its rebuild and portrait repaints while it
    // cannot be seen — setTab renders it the moment it opens
    if ($('leftbody').offsetParent !== null) {
      if (activeLeftTab === 'char') renderChar(); else renderFamily();
    }
    if (activeTab === 'actions') renderActions();
    else if (activeTab === 'prov') renderProv();
    else renderLog();
  }

  function renderActions() {
    const s = FB.state, box = $('tab-actions');
    let h = '';
    if (s.player.war) {
      const w = s.player.war;
      const en = s.realms[w.enemy];
      const warSummary = FB.T('⚔ At war with {enemy} — victories: {wins}; defeats: {losses} · {status} · battle odds ~{odds}%', {
        enemy: en ? en.name : '?',
        wins: w.wins,
        losses: w.losses,
        status: FB.warStateText(s, s.player.charId),
        odds: Math.round(FB.namedChance(s, 'war_battle') * 100)
      });
      h += '<div class="progressnote warnote">' + esc(warSummary) + '</div>';
    }
    const hl = FB.holdingList(s);
    if (hl.length) {
      const hg = FB.holdingBonus(s, 'gold');
      h += '<div class="progressnote">🏠 ' + hl.map(function (id) {
        const d = FBDATA.holdings[id];
        return d ? d.icon : '?';
      }).join('') + (hg ? ' · ' + esc(FB.T('+{amount} gold/season',
        { amount: Math.round(hg * 10) / 10 })) : '') + '</div>';
    }
    if (s.player.tier >= 3) {
      const lg = s.player.liege && s.player.liege !== 'player' && s.realms[s.player.liege];
      h += '<div class="progressnote">' + esc(FB.T('💰 Seasonal revenue ~{gold} gold · 🛡 levy ~{men} men', {
        gold: FB.playerTax(s), men: FB.playerLevy(s)
      })) + (lg ? ' · ' + esc(FB.T('vassal of')) +
        ' <span class="linklike" data-liege="' + esc(s.player.liege) +
        '" title="' + esc(FB.T('See your liege’s sheet')) + '">' + esc(lg.name) + '</span>' :
        ' · ' + esc(FB.T('independent'))) + '</div>';
      const parts = [];
      for (const bp of FB.demesne(s)) {
        const blt = FB.builtIn(s, bp);
        if (blt.length) {
          parts.push(esc(FB.world.byId[bp].name) + ' ' + blt.map(function (id) {
            const d = FBDATA.buildings[id];
            return d ? d.icon : '?';
          }).join(''));
        }
      }
      if (parts.length) h += '<div class="progressnote">🏗 ' + parts.join(' · ') + '</div>';
      const tk = FB.techList(s);
      h += '<div class="progressnote">' + esc(FB.T('📜 Scholarship {amount}',
        { amount: Math.floor(s.player.research || 0) })) +
        (tk.length ? ' · ' + tk.map(function (id) {
          const d = FBDATA.tech[id];
          return d ? d.icon : '?';
        }).join('') : '') + '</div>';
    }
    h += nextStepHint(s);
    box.innerHTML = h;
    let n = 0; // shared 1-9 hotkey numbering across both lists

    const fh = document.createElement('div');
    fh.className = 'panelh';
    fh.textContent = FB.T('Focus — pursued every day until changed');
    box.appendChild(fh);
    for (const f of FB.listFocuses(s)) {
      const cur = s.player.focus === f.id;
      const btn = document.createElement('button');
      btn.className = 'actionbtn' + (cur ? ' focused' : '');
      btn.innerHTML = hintFor(n) +
        (cur ? '◉ ' : '○ ') + esc(dt(s, 'focus', f.id, f, 'label')) +
        '<span class="adesc">' + esc(FB.translateKnown(f.desc(s))) + '</span>';
      (function (id) {
        btn.addEventListener('click', function () { FB.setFocus(FB.state, id); });
      })(f.id);
      box.appendChild(btn);
      n++;
    }

    const ih = document.createElement('div');
    ih.className = 'panelh';
    ih.textContent = FB.T('Deeds — done at once (each spends the day)');
    box.appendChild(ih);
    for (const item of FB.listInstants(s)) {
      const btn = document.createElement('button');
      btn.className = 'actionbtn';
      btn.disabled = !item.can;
      const label = dt(s, 'action', item.a.id, item.a, 'label');
      btn.innerHTML = hintFor(n) +
        esc(label) + '<span class="adesc">' +
        esc(FB.translateKnown(item.can ? item.a.desc(s) : item.reason)) + '</span>';
      (function (id) {
        btn.addEventListener('click', function () { FB.runInstant(FB.state, id); });
      })(item.a.id);
      box.appendChild(btn);
      n++;
    }
    FB.localizeTree(box);
  }

  function nextStepHint(s) {
    if (s.player.tier === 0) {
      return '<div class="progressnote">🧭 ' + esc(FB.T(
        'Path: save {gold} gold (or win your lord’s favor) to buy freedom.',
        { gold: FBDATA.balance.freedomCost })) + '</div>';
    }
    if (s.player.tier === 1) {
      return '<div class="progressnote">🧭 ' + esc(FB.T(
        'Path: prosper, buy land, and a manor ({gold} gold + {prestige} prestige) to join the gentry. Soldiering and the church offer other roads.',
        { gold: FBDATA.balance.manorCost, prestige: FBDATA.balance.manorPrestige })) + '</div>';
    }
    const tips = {
      2: 'Path: serve your lord, win renown (250+ prestige, lord’s favor 40+), and petition for a barony.',
      3: 'Path: petition your liege for a county — or declare independence and take one.',
      4: 'Path: hold the majority of a de jure duchy (petition, inherit, or conquer) to be styled duke.',
      5: 'Path: hold the majority of a de jure kingdom and win independence to be crowned king.',
      6: 'Path: hold the majority of two kingdoms of one empire to be crowned emperor.',
      7: 'You stand at the summit of the world.'
    };
    return '<div class="progressnote">🧭 ' + esc(FB.T(tips[s.player.tier] || '')) + '</div>';
  }

  function skillBars(c) {
    let h = '';
    const soft = FBDATA.balance.skillSoftCap || 20;
    for (const k of FB.SKILLS) {
      const v = FB.skillOf(c, k);
      // the bar fills to the soft cap; past it the number keeps climbing and
      // the bar turns bright to mark mastery beyond the old ceiling
      h += '<div class="skillrow"><span style="width:86px">' + esc(FB.skillName(k)) + '</span>' +
        '<span class="bar"><i' + (v > soft ? ' class="over"' : '') + ' style="width:' +
        Math.min(100, v / soft * 100) + '%"></i></span><span class="num">' + v + '</span></div>';
    }
    return h;
  }
  function traitChips(c) {
    let h = '';
    for (const t of c.traits) {
      const tr = FBDATA.traits[t];
      if (tr) h += '<span class="traitchip" data-trait="' + t + '">' + tr.icon + ' ' +
        esc(dt(FB.state, 'trait', t, tr, 'name')) + '</span>';
    }
    return h || '<span class="cmeta">' + esc(FB.T('No notable traits.')) + '</span>';
  }

  function healthWord(hp) {
    return FB.T(hp >= 9 ? 'Hale' : hp >= 7 ? 'Worn' : hp >= 5 ? 'Wounded' :
      hp >= 3 ? 'Grievously wounded' : 'At death’s door');
  }

  /* the named wounds & sicknesses the player carries (see FBDATA.ailments) */
  function ailmentChips(s, me) {
    const ails = FB.ailmentsOf(me);
    if (!ails.length && !s.player.flags.ill) return '';
    let h = '';
    for (const a of ails) {
      h += '<span class="traitchip" data-ailment="' + a.id + '">' + a.def.icon + ' ' +
        esc(dt(s, 'ailment', a.id, a.def, 'name')) + '</span>';
    }
    // saves from before named ailments know only the bare flag
    if (s.player.flags.ill && !FB.hasAilmentKind(me, 'sickness')) {
      h += '<span class="traitchip" data-ailment="ill">🤒 ' + esc(FB.T('Ill')) + '</span>';
    }
    return '<div class="kv"><span>' + esc(FB.T('Ailments')) + '</span></div>' + h;
  }

  /* the 🎓 upbringing summary line, shared by the Self tab and character sheets */
  function upbringingNote(s, c) {
    const focusName = (c.edu && c.edu.focus) ? FB.skillName(c.edu.focus) : FB.T('none chosen');
    let tutorName = FB.T('no tutor');
    if (c.edu && c.edu.tutorId === 'self') tutorName = FB.T('you yourself');
    else if (c.edu && c.edu.tutorId && s.chars[c.edu.tutorId] && !s.chars[c.edu.tutorId].dead) {
      tutorName = s.chars[c.edu.tutorId].name;
    }
    return '<div class="progressnote">' + esc(FB.T('🎓 Upbringing — focus: {focus} · tutor: {tutor}', {
      focus: focusName, tutor: tutorName
    })) + (FB.ageOf(c, s.date.year) < 6 ? ' <span class="cmeta">' +
      esc(FB.T('(lessons begin at age 6)')) + '</span>' : '') + '</div>';
  }

  function itemChips(s) {
    const ids = FB.itemList(s);
    if (!ids.length) return '<span class="cmeta">' + esc(FB.T('Nothing of note.')) + '</span>';
    let h = '';
    for (const id of ids) {
      const it = FBDATA.items[id];
      if (it) {
        h += '<span class="traitchip" data-item="' + esc(id) + '">' +
          it.icon + ' ' + esc(dt(s, 'item', id, it, 'name')) + '</span>';
      }
    }
    return h + '<div class="cmeta" style="font-size:12px;margin-top:2px">' +
      esc(FB.T('Tap a treasure to see its powers — or to sell or gift it.')) + '</div>';
  }

  /* the player's held titles (tier 3+): high dignities as rows, counties compact */
  function titleRows(s) {
    const t = FB.playerTitles(s);
    if (!t.high.length && !t.counties.length) return '';
    let h = panelh('Titles');
    for (const e of t.high) {
      h += '<div class="kv"><span>' + esc(FB.T(e.d)) + '</span><b>' +
        esc(e.titleData ? FB.renderTitleSnapshot(e.titleData) : FB.L(e.t || '')) +
        '</b></div>';
    }
    if (t.counties.length) {
      const names = [];
      for (const pid of t.counties) {
        const pr = FB.world.byId[pid];
        if (pr) names.push(pr.name);
      }
      h += '<div class="kv"><span>' + esc(FB.T('Counties ({count})',
        { count: t.counties.length })) + '</span><b>' + esc(names.join(' · ')) + '</b></div>';
    }
    return h;
  }

  function renderChar() {
    const s = FB.state, me = s.chars[s.player.charId];
    const rel = FB.religionOf(me.religion), cul = FB.cultureOf(me.culture);
    let h =
      '<canvas id="selfportrait" class="pface" data-cid="' + me.id + '" width="72" height="82"></canvas>' +
      '<div class="panelh">' + esc(FB.fullName(me)) + '</div>' +
      kv('Rank', esc(FB.styledTitle(s))) +
      kv('Age', FB.ageOf(me, s.date.year)) +
      kv('Culture', esc(cultureName(s, me.culture))) +
      kv('Faith', rel.icon + ' ' + esc(religionName(s, me.religion))) +
      kv('Health', Math.round(me.health) + ' / 10 · ' + healthWord(me.health)) +
      ailmentChips(s, me) +
      kv('Reputation among the folk', Math.round(s.player.pop)) +
      (s.player.liege ? kv('Liege’s favor', Math.round(s.player.liegeOp || 0)) : '') +
      titleRows(s) +
      panelh('Skills') + skillBars(me) +
      panelh('Traits') + traitChips(me) +
      panelh('Possessions') + itemChips(s) +
      panelh('Dynasty') +
      kv('House', esc(me.dyn || '—')) +
      kv('Generation', (s.generation || 1));
    if (FB.ageOf(me, s.date.year) < 16) {
      h += panelh('Upbringing') + upbringingNote(s, me) +
        '<button class="actionbtn" id="self-edufocus">🎓 Choose your education focus…' +
        '<span class="adesc">Direct your formative years toward one art.</span></button>' +
        '<button class="actionbtn" id="self-tutor">🧑‍🏫 Choose a tutor…' +
        '<span class="adesc">A skilled teacher shapes you faster — and leaves their mark.</span></button>';
    }
    $('tab-char').innerHTML = h;
    FB.localizeTree($('tab-char'));
    FB.paintFaces($('tab-char'), s);
    const sef = $('self-edufocus');
    if (sef) sef.addEventListener('click', function () { UI.showEduFocus(me.id); });
    const stu = $('self-tutor');
    if (stu) stu.addEventListener('click', function () { UI.showTutorPick(me.id); });
  }

  function charRow(s, c, meta, stats) {
    const op = Math.round(c.opinion);
    let mid = '<span class="cname">' + esc(FB.fullName(c)) + '</span><br><span class="cmeta">' + esc(meta) + '</span>';
    if (stats) {
      let sk = '';
      for (const k of FB.SKILLS) {
        sk += '<span title="' + esc(FB.skillName(k)) + '">' +
          FB.SKILL_ICONS[k] + FB.skillOf(c, k) + '</span> ';
      }
      mid += '<br><span class="cmeta">' + sk.trim() + '</span>';
    }
    return '<div class="charrow" data-cid="' + c.id + '" title="' +
      esc(FB.T('See their sheet and your dealings with them')) + '">' +
      FB.faceTag(c, 36, 42) +
      '<span>' + mid + '</span>' +
      '<span class="cop ' + FB.opClass(op) + '">' + (op > 0 ? '+' : '') + op + '</span></div>';
  }

  function relationText(s, c) {
    const me = s.chars[s.player.charId];
    if (c.id === me.spouseId) return FB.T('Your spouse');
    if (me.fatherId === c.id) return FB.T('Your father');
    if (me.motherId === c.id) return FB.T('Your mother');
    if (me.childrenIds.indexOf(c.id) >= 0) return FB.T('Your child');
    if ((c.role === 'sibling' && c.dyn === me.dyn) ||
      (me.fatherId && me.fatherId === c.fatherId) ||
      (me.motherId && me.motherId === c.motherId)) return FB.T('Your sibling');
    if (s.player.courtingId === c.id) return FB.T('Courting');
    if (s.roles.lord === c.id) return FB.T('Your lord');
    if (s.roles.priest === c.id) {
      return FB.T('Your {cleric}', { cleric: FB.holyWord(me.religion) });
    }
    if (s.roles.friend === c.id) return FB.T('Your friend');
    if (s.roles.rival === c.id) return FB.T('Your rival');
    return null;
  }
  function maritalText(s, c) {
    return FB.T(FB.spouseOf(s, c) ? 'Married' : 'Unwed');
  }

  /* why the marriage path is closed for this character (null = no note needed) */
  function courtBlockReason(s, c) {
    const me = s.chars[s.player.charId];
    const y = s.date.year;
    if (c.id === me.spouseId || c.spouseId === me.id) {
      return FB.T(c.sex === 'f'
        ? 'they are already your wedded wife.'
        : 'they are already your wedded husband.');
    }
    if (me.childrenIds.indexOf(c.id) >= 0 || (c.childrenIds && c.childrenIds.indexOf(me.id) >= 0) ||
      (me.fatherId && me.fatherId === c.fatherId) || (me.motherId && me.motherId === c.motherId) ||
      (c.role === 'sibling' && c.dyn === me.dyn)) return FB.T('they are too close in blood.');
    const krel = FB.kinOf(s).byId[c.id];
    if (krel && krel !== 'Cousin') return FB.T('they are too close in blood.');
    if (c.sex === me.sex) return null;
    if (FB.ageOf(c, y) < 16) return FB.T('they are not yet of age.');
    if (FB.ageOf(me, y) < 16) return FB.T('you are not yet of age.');
    const mySp = FB.spouseOf(s, me);
    if (mySp && !FB.canWed(s)) {
      return me.sex === 'm' && FB.marriageDoctrine(me.religion).wives > 1 ?
        FB.T('your faith permits no more wives.') :
        FB.T('you are already wed to {name}.', { name: mySp.name });
    }
    if (FB.spouseOf(s, c)) return FB.T('they are wed to another.');
    if (c.betrothedId) return FB.T('they are pledged to another.');
    if (FB.stationOf(c) - FB.playerStation(s) >= 3) {
      return FB.T('they stand far above your station.');
    }
    if (s.player.profession === 'monk' && FB.religionOf(me.religion).group !== 'muslim') {
      return FB.T('your vows forbid it.');
    }
    return null;
  }

  /* whose banner a character marches under: home county, the realm holding
     it, and that realm's coat of arms (the same seed the liege sheet uses) */
  function homeLineHtml(s, c) {
    const pid = FB.homeOf(s, c);
    const pr = pid && FB.world.byId[pid];
    if (!pr) return '';
    const hid = (s.holder && s.holder[pid]) || s.owner[pid];
    let crest = '';
    const parts = [FB.T('of {province}', { province: pr.name })];
    if (hid === 'player') {
      const me = s.chars[s.player.charId];
      crest = FB.crestTag(me.dyn || me.name, 14, 16);
      parts.push((s.realms.player && s.realms.player.alive)
        ? s.realms.player.name : FB.T('your lands'));
      const lr = s.player.liege && s.realms[s.player.liege];
      if (lr) parts.push(FB.T('sworn to {realm}', { realm: lr.name }));
    } else if (hid && s.realms[hid] && s.realms[hid].alive) {
      const r = s.realms[hid];
      crest = FB.crestTag(hid, 14, 16);
      parts.push(r.name);
      if (r.liege === 'player') parts.push(FB.T('sworn to you'));
      else if (r.liege && s.realms[r.liege]) {
        parts.push(FB.T('sworn to {realm}', { realm: s.realms[r.liege].name }));
      }
    }
    return '<div class="ccmeta">' + crest + esc(parts.join(' · ')) + '</div>';
  }

  UI.charCardHtml = function (s, c, clickable) {
    const rel = FB.religionOf(c.religion), cul = FB.cultureOf(c.culture);
    const house = c.dyn ? FB.crestTag(c.dyn, 18, 21) : ''; // a house bears arms
    let sk = '';
    for (const k of FB.SKILLS) sk += FB.skillName(k) + ' ' + FB.skillOf(c, k) + ' · ';
    sk = sk.slice(0, -3);
    let tr = '';
    for (const t of c.traits) {
      const td = FBDATA.traits[t];
      if (td) tr += '<span class="traitchip" data-trait="' + t + '">' + td.icon + ' ' +
        esc(dt(s, 'trait', t, td, 'name')) + '</span>';
    }
    // treasures the player has gifted them, worn where callers can see
    let itc = '';
    if (c.items && c.items.length && c.id !== s.player.charId) {
      for (const iid of c.items) {
        const idf = FBDATA.items[iid];
        if (idf) itc += '<span class="traitchip" data-itemview="' + esc(iid) + '">' + idf.icon + ' ' +
          esc(dt(s, 'item', iid, idf, 'name')) + '</span>';
      }
    }
    // the dead are remembered, not met: dates and deeds, no dealings
    if (c.dead) {
      const life = c.died !== undefined ?
        FB.T('† {born}–{died} (aged {age})',
          { born: c.born, died: c.died, age: c.died - c.born }) :
        FB.T('† born {year}', { year: c.born });
      return '<div class="charcard">' + FB.faceTag(c, 56, 64) +
        '<div><div class="ccname">' + esc(FB.fullName(c)) + house + '</div>' +
        '<div class="ccmeta">' + (epithetText(s, c) ? esc(epithetText(s, c)) + ' · ' : '') +
        esc(FB.T(c.sex === 'f' ? 'Woman' : 'Man')) +
        (c.station !== undefined && c.station !== null ? ' · ' + esc(FB.stationName(FB.stationOf(c))) : '') +
        ' · ' + esc(cultureName(s, c.culture)) + ' · ' + rel.icon + ' ' +
        esc(religionName(s, c.religion)) + '</div>' +
        homeLineHtml(s, c) +
        '<div class="ccmeta">' + (relationText(s, c) ? esc(relationText(s, c)) + ' · ' : '') + life + '</div>' +
        '<div class="ccskills">' + esc(sk) + '</div>' +
        '<div>' + (tr || '<span class="cmeta">' + esc(FB.T('No notable traits.')) + '</span>') + '</div>' +
        (itc ? '<div>' + itc + '</div>' : '') + '</div></div>';
    }
    const op = Math.round(c.opinion);
    // fertility as the conception roll sees it: the character's own hidden
    // roll times trait leanings (lustful, comely, strong up; chaste, sickly
    // down) times the slow slide of age (FB.ageFert) — 100% is the human
    // norm in one's prime; women past 45 cannot conceive
    let fert = '';
    const cage = FB.ageOf(c, s.date.year);
    if (cage >= 16) {
      fert = ' · ' + ((c.sex === 'f' && cage > 45) ? FB.T('🌱 past childbearing')
        : FB.T('🌱 fertility {percent}%', {
          percent: Math.round((c.fertility || 1) * FB.traitAgg(c).fert *
            FB.ageFert(c.sex, cage) * 100)
        }));
    }
    const relationship = relationText(s, c);
    const regardText = relationship
      ? FB.T('{relation} · {marital} · regard {regard}', {
        relation: relationship,
        marital: maritalText(s, c),
        regard: (op > 0 ? '+' : '') + op
      })
      : FB.T('{marital} · regard {regard}', {
        marital: maritalText(s, c),
        regard: (op > 0 ? '+' : '') + op
      });
    return '<div class="charcard"' + (clickable ? ' data-cid="' + c.id + '" title="' +
      esc(FB.T('Open their sheet and your dealings with them')) + '"' : '') + '>' +
      FB.faceTag(c, 56, 64) +
      '<div><div class="ccname">' + esc(FB.fullName(c)) + house + '</div>' +
      '<div class="ccmeta">' + (epithetText(s, c) ? esc(epithetText(s, c)) + ' · ' : '') +
      esc(FB.T('{sex} of {age}', {
        sex: FB.T(c.sex === 'f' ? 'Woman' : 'Man'),
        age: FB.ageOf(c, s.date.year)
      })) +
      (c.station !== undefined && c.station !== null ? ' · ' + esc(FB.stationName(FB.stationOf(c))) : '') +
      ' · ' + esc(cultureName(s, c.culture)) + ' · ' + rel.icon + ' ' +
      esc(religionName(s, c.religion)) + '</div>' +
      homeLineHtml(s, c) +
      '<div class="ccmeta">' + (c.id === s.player.charId ? esc(FB.T('This is you')) :
        '<span class="' + FB.opClass(op) + '">' + esc(regardText) + '</span>') +
        esc(fert) + '</div>' +
      '<div class="ccskills">' + esc(sk) + '</div>' +
      '<div>' + (tr || '<span class="cmeta">' + esc(FB.T('No notable traits.')) + '</span>') + '</div>' +
      (itc ? '<div>' + itc + '</div>' : '') + '</div></div>';
  };

  function renderFamily() {
    const s = FB.state, me = s.chars[s.player.charId];
    const kin = FB.kinOf(s);
    let h = '<button class="btn small" id="btn-ftree" style="width:100%" ' +
      'title="' + esc(FB.T('See the whole family drawn as a tree')) + '">' +
      esc(FB.T('🌳 See the family tree')) + '</button>';
    const sps = FB.spousesOf(s, me);
    h += panelh(sps.length > 1 ? 'Wives' : 'Spouse');
    if (sps.length) {
      for (const sp of sps) {
        h += charRow(s, sp, FB.T('Age {age}', { age: FB.ageOf(sp, s.date.year) }));
      }
    } else h += '<div class="cmeta" style="font-size:13px">Unwed. A dynasty needs heirs — seek a match.</div>';
    const su = s.player.courtingId ? s.chars[s.player.courtingId] : null;
    if (su) {
      h += panelh('Courting') + UI.charCardHtml(s, su, true);
      h += '<div class="hint" style="margin:2px 0 0">Tap them to court, propose, or break it off.</div>';
    }
    h += panelh('Children');
    const kids = me.childrenIds.map(function (id) { return s.chars[id]; })
      .filter(function (c) { return c && !c.dead; });
    if (kids.length) {
      for (const k of kids) {
        const a = FB.ageOf(k, s.date.year);
        const meta = [
          FB.T(k.sex === 'm' ? 'Son' : 'Daughter'),
          FB.T('age {age}', { age: a })
        ];
        if (a < 16 && k.edu && k.edu.focus) meta.push('🎓 ' + FB.skillName(k.edu.focus));
        if (k.betrothedId && s.chars[k.betrothedId] && !s.chars[k.betrothedId].dead) {
          meta.push(FB.T('🤝 betrothed'));
        }
        h += charRow(s, k, meta.join(' · '));
      }
      h += '<div class="hint" style="margin:2px 0 0">Tap a child to set their education focus and tutor.</div>';
    } else h += '<div class="cmeta" style="font-size:13px">No living children. Without an heir, your story ends with you.</div>';
    // the wider family tree — dead kin are shown with †
    function kinSection(title, entries) {
      if (!entries.length) return;
      h += '<div class="panelh">' + esc(FB.T(title)) + '</div>';
      for (const e of entries) {
        h += charRow(s, e.c, FB.T(e.rel) +
          (e.c.dead ? ' · †' : ' · ' + FB.T('age {age}', {
            age: FB.ageOf(e.c, s.date.year)
          })));
      }
    }
    kinSection('Grandchildren', kin.grandchildren);
    kinSection('Parents', kin.parents);
    kinSection('Grandparents', kin.grandparents);
    kinSection('Siblings', kin.siblings);
    kinSection('Nieces & nephews', kin.niecesNephews);
    kinSection('Uncles & aunts', kin.unclesAunts);
    kinSection('Cousins', kin.cousins);
    h += panelh('Notable folk');
    for (const role of ['lord', 'priest', 'friend', 'rival']) {
      const c = FB.getRole(s, role, false);
      if (c && !c.dead) {
        h += charRow(s, c, roleName(role) +
          ' · ' + FB.T('age {age}', { age: FB.ageOf(c, s.date.year) }), true);
      }
    }
    $('tab-family').innerHTML = h;
    FB.localizeTree($('tab-family'));
    FB.paintFaces($('tab-family'), s);
    $('btn-ftree').addEventListener('click', UI.showFamilyTree);
  }

  /* ================= family tree =================
     The Kin tab names each relation; this modal draws the blood lines so it
     is plain who hangs from whom. Each couple shares a box (current spouses
     first, then dead or former partners their children point back to), and
     each brood hangs beneath its parents. The main tree grows from the
     deepest recorded ancestor — grandparents at most, so it stays bounded —
     and the mother’s parents get a second tree of their own; anyone already
     drawn above shows dimmed there instead of doubling the line. */
  UI.showFamilyTree = function () {
    if (!FB.state || UI.eventsBusy()) return;
    const s = FB.state, me = s.chars[s.player.charId];
    const byId = FB.kinOf(s).byId;
    const drawn = {};
    const MAXDEPTH = 4; // root couple → their great-great-grandchildren

    function chip(c, rel, cls) {
      const sourceLabel = rel || byId[c.id] || '';
      const label = sourceLabel ? FB.T(sourceLabel) : '';
      const meta = c.dead ? '†' : FB.T('age {age}', { age: FB.ageOf(c, s.date.year) });
      const again = cls && cls.indexOf('dup') >= 0;
      return '<button class="ftchip' + (cls || '') + (c.dead ? ' dead' : '') +
        '" data-cid="' + c.id + '" title="' + esc(FB.fullName(c)) +
        (label ? ' — ' + esc(label) : '') + '">' + FB.faceTag(c, 40, 46) +
        '<span class="fname">' + esc(c.name) + '</span>' +
        '<span class="frel">' + esc(label ? label + ' · ' + meta : meta) + '</span>' +
        (again ? '<span class="frel">' + esc(FB.T('also above')) + '</span>' : '') + '</button>';
    }

    /* everyone who parented a child with c, current spouses first — dead
       or divorced partners still belong beside their children */
    function matesOf(c) {
      const out = [], seen = {};
      seen[c.id] = 1;
      const sps = c.id === me.id ? FB.spousesOf(s, me) :
        (c.spouseId && s.chars[c.spouseId] ? [s.chars[c.spouseId]] : []);
      for (const sp of sps) {
        if (!seen[sp.id]) { seen[sp.id] = 1; out.push(sp); }
      }
      for (const k of FB.childrenOf(s, c)) {
        const oid = k.fatherId === c.id ? k.motherId : k.fatherId;
        const o = oid ? s.chars[oid] : null;
        if (o && !seen[o.id]) { seen[o.id] = 1; out.push(o); }
      }
      return out;
    }

    function unit(c, depth) {
      if (drawn[c.id]) {
        // already on an earlier branch — point back rather than fork the line
        return '<div class="ftnode"><div class="ftcouple">' + chip(c, null, ' dup') + '</div></div>';
      }
      drawn[c.id] = 1;
      let couple = c.id === me.id ? chip(c, 'You', ' me') : chip(c);
      for (const sp of matesOf(c)) {
        couple += chip(sp, byId[sp.id] || (sp.sex === 'f' ? 'Wife' : 'Husband'),
          drawn[sp.id] ? ' dup' : '');
        drawn[sp.id] = 1;
      }
      const kids = FB.childrenOf(s, c).sort(function (a, b) { return a.born - b.born; });
      const grow = kids.length > 0 && depth < MAXDEPTH;
      let h = '<div class="ftnode"><div class="ftcouple">' + couple + '</div>';
      if (grow) {
        h += '<div class="ftstem"></div><div class="ftkids">';
        for (const k of kids) h += unit(k, depth + 1);
        h += '</div>';
      }
      return h + '</div>';
    }

    /* the deepest recorded ancestor, father’s line preferred */
    function topOf(c, maxUp) {
      let cur = c;
      for (let i = 0; i < maxUp; i++) {
        const nxt = (cur.fatherId ? s.chars[cur.fatherId] : null) ||
          (cur.motherId ? s.chars[cur.motherId] : null);
        if (!nxt) break;
        cur = nxt;
      }
      return cur;
    }

    let h = '<div class="cmeta" style="font-size:13px">' + esc(FB.isTouch
      ? FB.T('Blood lines run downward — each brood hangs beneath its parents. † marks the dead. Tap a face to open their sheet.')
      : FB.T('Blood lines run downward — each brood hangs beneath its parents. † marks the dead. Click a face to open their sheet.')) +
      '</div>';
    const root = topOf(me, 2);
    h += '<div class="ftwrap"><div class="fttree">';
    if (root.id === me.id && !FB.parentsOf(s, me).length && FB.siblingsOf(s, me).length) {
      // safety net: save.js backfills parents on load; a tree can still lack
      // them if a mod stripped the chars — show the brood under a ghost
      let brood = unit(me, 1);
      for (const sb of FB.siblingsOf(s, me)) brood += unit(sb, 1);
      h += '<div class="ftnode"><div class="ftcouple"><div class="ftchip ghost">' +
        '<span class="fname">' + esc(FB.T('Unrecorded')) + '</span><span class="frel">' +
        esc(FB.T('your parents')) + '</span></div></div>' +
        '<div class="ftstem"></div><div class="ftkids">' + brood + '</div></div>';
    } else {
      h += unit(root, 0);
    }
    h += '</div></div>';
    // the mother’s parents sit outside the father-line tree — give them their own
    const mo = me.motherId ? s.chars[me.motherId] : null;
    if (mo && (mo.fatherId || mo.motherId)) {
      const mroot = topOf(mo, 1);
      if (mroot.id !== mo.id && !drawn[mroot.id]) {
        h += panelh('Your mother’s kin') +
          '<div class="ftwrap"><div class="fttree">' + unit(mroot, 0) + '</div></div>';
      }
    }
    h += '<button class="btn" id="gm-cancel" style="margin-top:10px">Close</button>';
    openModal('The Family Tree', h);
    $('gm-cancel').addEventListener('click', UI.closeModal);
    FB.paintFaces($('gm-body'), s);
  };

  /* ---------- map filters: what a selection highlights ---------- */
  let mapMode = 'realm'; // 'realm' | 'mine' | 'liege'

  /* is pid held by the player or by one of the player's vassals? */
  function inPlayerRealm(s, pid) {
    const holdId = (s.holder && s.holder[pid]) || s.owner[pid];
    if (holdId === 'player') return true;
    const chain = FB.liegeChain(s, holdId);
    for (const cid of chain) if (s.realms[cid] && s.realms[cid].liege === 'player') return true;
    return false;
  }

  /* is pid part of the player's liege's sub-realm (his lands + his vassals')? */
  function inLiegeRealm(s, pid) {
    if (!s.player.liege) return false;
    const holdId = (s.holder && s.holder[pid]) || s.owner[pid];
    if (holdId === 'player') return true; // your own lands sit inside his realm
    return FB.liegeChain(s, holdId).indexOf(s.player.liege) >= 0;
  }

  /* highlight group key for the current filter; null = no group */
  function mapGroupOf(pid) {
    const s = FB.state;
    if (!s) return null;
    if (mapMode === 'mine') return inPlayerRealm(s, pid) ? 'player' : null;
    if (mapMode === 'liege') return inLiegeRealm(s, pid) ? 'liege' : null;
    // realm: your own province lights YOUR realm, a foreign one its sovereign's
    return inPlayerRealm(s, pid) ? 'player' : (s.owner[pid] || null);
  }

  const MAPMODES = { realm: 'Realm', mine: 'Mine', liege: 'Liege' };
  UI.cycleMapMode = function () {
    const s = FB.state;
    if (!s) return;
    const order = ['realm', 'mine', 'liege'];
    let next = order[(order.indexOf(mapMode) + 1) % order.length];
    if (next === 'liege' && !s.player.liege) {
      UI.toast('🗺 You answer to no one — no liege to show.');
      next = 'realm';
    }
    mapMode = next;
    const btn = $('btn-mapmode');
    if (btn) {
      btn.classList.toggle('on', mapMode !== 'realm');
      btn.title = FB.T('Map filter: {mode} (R)', { mode: FB.T(MAPMODES[mapMode]) });
      btn.setAttribute('aria-label', btn.title);
    }
    UI.toast('🗺 Map filter: {mode}', { mode: FB.T(MAPMODES[mapMode]) });
    FB.map.select(FB.map.selected || s.player.provinceId, mapGroupOf);
  };

  let selectedProv = null;
  UI.selectProvince = function (pid) {
    selectedProv = pid;
    FB.map.select(pid, mapGroupOf);
    activeTab = 'prov';
    setTab('prov');
  };

  function renderProv() {
    const s = FB.state;
    const pid = selectedProv || s.player.provinceId;
    const pr = FB.world.byId[pid];
    if (!pr) { $('tab-prov').innerHTML = ''; return; }
    let h = '<div class="panelh">' + esc(pr.name) +
      (pid === s.player.provinceId ? ' ' + esc(FB.T('⚑ (home)')) : '') + '</div>';
    const selA = FB.selectedArmy ? FB.selectedArmy(s) : null;
    if (selA) {
      const selPr = FB.world.byId[selA.at];
      const marching = selA.goal && selA.goal !== selA.at && FB.world.byId[selA.goal];
      const hostText = marching
        ? FB.T('🚩 Your host — {men} at {place}, marching on {goal}. Tap a province on the map to march; tap the host again to halt.', {
          men: menText(s, selA.men), place: selPr ? selPr.name : '?',
          goal: FB.world.byId[selA.goal].name
        })
        : FB.T('🚩 Your host — {men} at {place}. Tap a province on the map to march; tap the host again to halt.', {
          men: menText(s, selA.men), place: selPr ? selPr.name : '?'
        });
      h += '<div class="progressnote">' + esc(hostText) + '</div>';
    }
    if (pr.wasteland) {
      h += '<div class="cmeta">' + esc(FB.T('Trackless {terrain}. No lord rules here.',
        { terrain: terrainName(pr.terrain) })) + '</div>';
    } else {
      const rid = s.owner[pid];
      const realm = s.realms[rid];
      const rel = FB.religionOf(pr.religion), cul = FB.cultureOf(pr.culture);
      const B = FBDATA.balance;
      const myRealm = rid === 'player';
      const realmMen = realm ? (myRealm ? FB.playerLevy(s) : Math.round(FB.realmStrength(s, rid) * B.levyPerDev * (B.aiHostPerDev || 0.3))) : 0;
      // the feudal ladder: who holds this county directly, and above them whom
      const holdId = (s.holder && s.holder[pid]) || rid;
      let chain;
      if (holdId === 'player') chain = ['player'].concat(s.player.liege ? FB.liegeChain(s, s.player.liege) : []);
      else chain = FB.liegeChain(s, holdId);
      h += kv('County', esc(pr.name));
      for (const cid of chain) {
        if (cid === 'player') {
          h += '<div class="kv"><span>' + esc(FB.styledTitle(s)) + '</span><b>' +
            esc(FB.T('You — held in your own hand')) + '</b></div>';
          continue;
        }
        const cr = s.realms[cid];
        if (!cr) continue;
        let mark = '';
        if (cid === s.player.liege) mark = FB.T(' — your liege');
        else if (cr.liege === 'player') mark = FB.T(' — your vassal');
        h += '<div class="kv"><span>' + esc(FB.T('{title} {name}', {
          title: FB.realmRankTitle(s, cr), name: cr.ruler.name
        })) +
          '</span><b>' + esc(cr.name) + esc(mark) + '</b></div>';
      }
      const dj = FB.dejureOf(pid);
      if (dj.duchy) {
        const parts = [FBDATA.duchies[dj.duchy].name];
        if (dj.kingdom) parts.push(FBDATA.kingdoms[dj.kingdom].name);
        if (dj.empire) parts.push(FBDATA.empires[dj.empire].name);
        h += kv('De jure', esc(parts.join(' › ')));
      }
      h +=
        (realm ? kv('Sovereign', esc(realm.name)) : '') +
        (realm ? kv('Realm size', esc(countyCountText(s, FB.realmProvinces(s, rid).length))) : '') +
        (realm ? kv('Realm host', '~' + esc(menText(s, realmMen))) : '') +
        kv('Culture', esc(cultureName(s, pr.culture))) +
        kv('Faith', rel.icon + ' ' + esc(religionName(s, pr.religion))) +
        kv('Terrain', esc(terrainName(pr.terrain)) + (pr.coastal ? ', ' + esc(FB.T('coastal')) : '')) +
        kv('Development', (s.dev[pid] || 1) + ' / ' + FB.devCap(s, pid)) +
        kv('Province levy', '~' + esc(menText(s, (s.dev[pid] || 1) * B.levyPerDev)));
      const setts = FB.settlementsOf(s, pid);
      if (setts.length) {
        h += kv('Settlements', setts.map(function (st) {
          return (st.kind === 'city' ? '🏙' : st.kind === 'town' ? '🏘' : '🏡') + ' ' + esc(st.name);
        }).join(' · '));
      }
      if (s.player.provs && s.player.provs.indexOf(pid) >= 0) {
        h += '<div class="progressnote">' + esc(FB.T('🏰 You hold this province.')) + '</div>';
      }
      if (realm && !myRealm && s.player.tier >= 3) {
        h += '<div class="progressnote">' + esc(FB.T(
          '🛡 They can field ~{theirs} — you can field ~{yours}.',
          { theirs: menText(s, realmMen), yours: menText(s, FB.playerLevy(s)) })) + '</div>';
      }
      if (realm && FB.isRealmAtWar(s, rid)) {
        h += '<div class="progressnote warnote">' +
          esc(FB.T('⚔ This realm is at war.')) + '</div>';
      }
      const hostsHere = FB.armiesAt ? FB.armiesAt(s, pid) : [];
      if (hostsHere.length) {
        h += '<div class="progressnote warnote">' + esc(FB.T('⚔ Hosts in the field here:')) +
          ' ' + hostsHere.map(function (a) {
            const owner = a.realm === 'player' ? FB.T('Your host') :
              (s.realms[a.realm] ? s.realms[a.realm].name : '?');
            return esc(FB.T('{owner} (~{men})',
              { owner: owner, men: menText(s, a.men) }));
          }).join(' · ') + '</div>';
      }
      if (realm && s.pacts && s.pacts[rid] > s.turn) {
        h += '<div class="progressnote">' + esc(FB.T(
          '🕊 A pact of peace holds until {year} AD.',
          { year: FBDATA.balance.startYear + Math.floor(s.pacts[rid] / 360) })) + '</div>';
      }
      h += panelh('Notable folk');
      const nb = FB.provNotables(s, pid);
      if (nb.length) {
        for (const c of nb) {
          let meta = epithetText(s, c) ||
            (c.role ? roleName(c.role) : '');
          meta = (meta ? meta + ' · ' : '') +
            FB.T('age {age}', { age: FB.ageOf(c, s.date.year) });
          h += charRow(s, c, meta, true);
        }
        h += '<div class="hint" style="margin:4px 0 0">Tap a person for their sheet — and your dealings with them.</div>';
      } else {
        h += '<div class="cmeta" style="font-size:13px">No one of note.</div>';
      }
    }
    h += '<div style="margin-top:10px"><button class="btn small" id="btn-center-home">⌂ Center on home</button></div>';
    $('tab-prov').innerHTML = h;
    FB.localizeTree($('tab-prov'));
    FB.paintFaces($('tab-prov'), s);
    const b = $('btn-center-home');
    if (b) b.addEventListener('click', function () { FB.map.centerOn(FB.state.player.provinceId, 2.2); });
  }

  let logRenderedTail = null, logRenderedLen = -1; // skip identical rebuilds on quiet ticks
  function renderLog() {
    const s = FB.state;
    const tail = s.log.length ? s.log[s.log.length - 1] : null;
    if (tail === logRenderedTail && s.log.length === logRenderedLen) return;
    logRenderedTail = tail; logRenderedLen = s.log.length;
    let h = '<div class="panelh">' + esc(FB.game && FB.game.observe
      ? FB.T('Chronicle of the realms')
      : FB.T('Chronicle of {dynasty}', { dynasty: s.chars[s.player.charId].dyn || FB.T('your line') })) +
      '</div>';
    for (let i = s.log.length - 1; i >= 0 && i >= s.log.length - 80; i--) {
      const e = s.log[i];
      const logDate = e.d
        ? FB.T('{season} {day}, {year}', {
          season: FB.seasonName(e.s), day: e.d, year: e.y
        })
        : FB.T('{season}, {year}', { season: FB.seasonName(e.s), year: e.y });
      h += '<div class="logentry"><span class="ldate">' + esc(logDate) + '</span><br>' +
        esc(FB.newsText(e, s, s.player.charId)) + '</div>';
    }
    $('tab-log').innerHTML = h;
    FB.localizeTree($('tab-log'));
  }

  function setTab(name) {
    if (FB.game && FB.game.observe && name === 'actions') return; // a watcher has no deeds
    const isLeft = LEFT_TABS.indexOf(name) >= 0;
    if (isLeft) activeLeftTab = name; else activeTab = name;
    const bar = isLeft ? '#lefttabs .tab' : '#sidetabs .tab';
    document.querySelectorAll(bar).forEach(function (t) { t.classList.toggle('active', t.dataset.tab === name); });
    const body = isLeft ? $('leftbody') : $('sidebody');
    body.querySelectorAll('.tabpane').forEach(function (p) { p.classList.remove('active'); });
    $('tab-' + name).classList.add('active');
    // on phones Self/Kin is a drawer (body.showself); the class is inert on desktop
    document.body.classList.toggle('showself', isLeft);
    renderActiveTab();
  }

  UI.cycleTab = function (dir) {
    const order = (FB.game && FB.game.observe) ? ['prov', 'log'] : ['actions', 'prov', 'log'];
    let i = order.indexOf(activeTab) + dir;
    if (i < 0) i = order.length - 1;
    if (i >= order.length) i = 0;
    setTab(order[i]);
  };

  UI.showTab = function (name) { setTab(name); };

  /* ================= autoresolve ================= */
  /* Which category does an event fall into for the autoresolve settings? */
  function autoCategory(ev, item) {
    if (ev.trigger && ev.trigger.never) return ev.wartime ? 'war' : 'major'; // queued decisions
    if (ev.once) return 'major';
    return item.rnd ? 'everyday' : 'major';
  }

  /* The worst wound an event could deal across every option and chance
     branch — death is never delegated to the autoresolver. */
  function worstWound(ev) {
    let worst = 0;
    function scan(fx) {
      if (fx && typeof fx.health === 'number' && fx.health < worst) worst = fx.health;
    }
    for (const o of (ev.options || [])) {
      scan(o.effects);
      if (o.success) scan(o.success.effects);
      if (o.failure) scan(o.failure.effects);
    }
    return worst;
  }

  function autoWants(ev, item) {
    const a = FB.game.auto;
    if (!a || !a.on) return false;
    /* an event that could drop the player to 0 health is always shown,
       however the automation is set — the killing blow is never silent */
    const s = FB.state;
    if (s && s.player && !s.player.dead) {
      const me = s.chars[s.player.charId];
      const hp = me && me.health !== undefined ? me.health : 8;
      if (hp + worstWound(ev) <= 0) return false;
    }
    const cat = autoCategory(ev, item);
    if (cat === 'everyday') return true;
    if (cat === 'war') return !!a.war;
    return !!a.major;
  }

  /* Rough worth of an option for the auto-picker. Options needing a human
     (naming an heir) score far below anything else. */
  function fxScore(fx) {
    if (!fx) return 0;
    let v = 0;
    if (typeof fx.gold === 'number') v += fx.gold * 0.5;
    if (fx.prestige) v += fx.prestige * 0.4;
    if (fx.piety) v += fx.piety * 0.3;
    if (fx.health) v += fx.health * 4;
    if (fx.popularOpinion) v += fx.popularOpinion * 0.15;
    if (fx.opinionLiege) v += fx.opinionLiege * 0.1;
    if (fx.opinion && fx.opinion.amt) v += fx.opinion.amt * 0.1;
    if (fx.skills) for (const k in fx.skills) v += fx.skills[k] * 1.5;
    if (fx.tierSet !== undefined || fx.tierUp) v += 25;
    if (fx.marry) v += 10;
    if (fx.killChild || fx.killRole) v -= 10;
    if (fx.setFlag === 'ill') v -= 4;
    if (fx.addTrait === 'scarred' || fx.addTrait === 'craven') v -= 3;
    if (fx.pickHeir) v -= 100;
    return v;
  }

  function optionScore(s, o, style) {
    if (o.chance !== undefined) {
      const p = typeof o.chance === 'string' ? FB.namedChance(s, o.chance) : o.chance;
      const sv = fxScore(o.effects) + fxScore(o.success && o.success.effects);
      const fv = fxScore(o.effects) + fxScore(o.failure && o.failure.effects);
      if (style === 'bold') return sv * (0.4 + p * 0.6) + fv * (1 - p) * 0.5;
      return sv * p + fv * (1 - p) - 1; // prudent: a touch risk-averse
    }
    return fxScore(o.effects);
  }

  /* Resolve an event without opening the modal; the chronicle records it. */
  function autoResolve(ev, item) {
    const s = FB.state;
    const ctx = item.ctx || {};
    FB.markFired(s, ev);
    let opts = (ev.options || []).filter(function (o) {
      return !o.require || FB.checkTrigger(s, o.require);
    });
    if (!opts.length) opts = [{ label: 'So it goes.', effects: {} }];
    let pick = opts[0];
    const style = FB.game.auto.style;
    if (style !== 'first') {
      let best = -1e9;
      for (const o of opts) {
        const v = optionScore(s, o, style);
        if (v > best) { best = v; pick = o; }
      }
    }
    const authoredIndex = ev.options ? ev.options.indexOf(pick) : -1;
    let outcomeMsg = null;
    let outcomePath = null;
    if (pick.chance !== undefined) {
      const p = typeof pick.chance === 'string' ? FB.namedChance(s, pick.chance) : pick.chance;
      const ok = FB.chance(p);
      if (pick.chance === 'battle' || pick.chance === 'war_battle') delete s.player.flags.blessed_war;
      if (pick.effects) FB.applyEffects(s, pick.effects, ctx);
      const branch = ok ? pick.success : pick.failure;
      if (branch) {
        if (branch.effects) FB.applyEffects(s, branch.effects, ctx);
        if (branch.text && authoredIndex >= 0) {
          outcomePath = 'options.' + authoredIndex + '.' +
            (ok ? 'success' : 'failure') + '.text';
        } else {
          outcomeMsg = ok
            ? FB.msg('fx.event.autoresolve.success', 'It goes well.', {})
            : FB.msg('fx.event.autoresolve.failure', 'It goes poorly.', {});
        }
      }
    } else if (pick.effects) {
      FB.applyEffects(s, pick.effects, ctx);
    }
    /* Match the old simulation order while keeping rendering pure: effects
       resolve first, then any outcome roles, title roles, and choice roles. */
    if (outcomePath) {
      FB.prepareEventPath(s, ev, outcomePath, ctx);
      outcomeMsg = FB.eventMessage(s, s.player.charId, ev, outcomePath, ctx);
    }
    FB.prepareEventPath(s, ev, 'title', ctx);
    const titleMsg = FB.eventMessage(s, s.player.charId, ev, 'title', ctx);
    let choiceMsg;
    if (authoredIndex >= 0) {
      const choicePath = 'options.' + authoredIndex + '.label';
      FB.prepareEventPath(s, ev, choicePath, ctx);
      choiceMsg = FB.eventMessage(s, s.player.charId, ev, choicePath, ctx);
    } else {
      choiceMsg = FB.msg('fx.event.autoresolve.default_choice', 'So it goes.', {});
    }
    FB.news(s, FB.msg('news.event.autoresolved', {
      forms: {
        select: 'value', param: 'result', cases: {
          outcome: '⚙ {title}: {choice} — {outcome}',
          other: '⚙ {title}: {choice}'
        }
      }
    }, {
      result: outcomeMsg ? 'outcome' : 'other',
      title: FB.messageParam(titleMsg),
      choice: FB.messageParam(choiceMsg),
      outcome: outcomeMsg ? FB.messageParam(outcomeMsg) : ''
    }));
  }

  UI.showAutoResolve = function () {
    const a = FB.game.auto;
    function cb(id, checked, label, desc) {
      return '<label class="autorow"><input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '> ' +
        label + (desc ? '<span class="adesc">' + desc + '</span>' : '') + '</label>';
    }
    function rb(val, label) {
      return '<label class="autorow"><input type="radio" name="ar-style" value="' + val + '"' +
        (a.style === val ? ' checked' : '') + '> ' + label + '</label>';
    }
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'While the days flow (or fast-forward), the chosen kinds of events resolve themselves. Every outcome is written to the Chronicle.')) +
      '</p></div>';
    h += cb('ar-on', a.on, '<b>Autoresolve events</b>', 'Master switch — everyday happenings resolve on their own.');
    h += cb('ar-major', a.major, 'Also resolve important events', 'Once-in-a-life moments and story events.');
    h += cb('ar-war', a.war, 'Also resolve war councils', 'Musters and seasonal war decisions.');
    h += '<div class="gm-body-text" style="margin-top:8px"><p>How to choose between options:</p></div>';
    h += rb('safe', 'Prudent — avoid risk, prefer sure gains');
    h += rb('bold', 'Bold — chase the bigger prize');
    h += rb('first', 'First option — take the default');
    h += '<div class="gm-body-text" style="margin-top:8px"><p>Stewardship (tier 3+, once a season):</p></div>';
    h += cb('ar-build', a.build, 'Raise buildings automatically', 'The cheapest available building, when the treasury can spare it.');
    h += cb('ar-research', a.research, 'Adopt innovations automatically', 'The cheapest innovation within reach of your scholarship.');
    h += '<button class="btn primary" id="ar-done" style="margin-top:10px">Done</button>';
    openModal('⚙ Automation', h);
    function sync() {
      a.on = $('ar-on').checked;
      a.major = $('ar-major').checked;
      a.war = $('ar-war').checked;
      a.build = $('ar-build').checked;
      a.research = $('ar-research').checked;
      const r = document.querySelector('input[name=ar-style]:checked');
      if (r) a.style = r.value;
      FB.game.saveAuto();
      if (FB.state) UI.refresh();
    }
    ['ar-on', 'ar-major', 'ar-war', 'ar-build', 'ar-research'].forEach(function (id) { $(id).addEventListener('change', sync); });
    document.querySelectorAll('input[name=ar-style]').forEach(function (r) { r.addEventListener('change', sync); });
    $('ar-done').addEventListener('click', function () { sync(); UI.closeModal(); });
  };

  /* ================= event modal ================= */
  /* Returns true if a modal actually opened (so fast-forward stops);
     autoresolved events pass through silently. */
  UI.runEvents = function (list) {
    pendingEvents = pendingEvents.concat(list);
    if (!eventOpen) return nextEvent();
    return true;
  };

  function nextEvent() {
    const s = FB.state;
    while (pendingEvents.length) {
      const item = pendingEvents.shift();
      const ev = FB.eventById(item.id);
      if (!ev) continue;
      if (autoWants(ev, item)) { autoResolve(ev, item); continue; }
      showEvent(ev, item.ctx || {});
      return true;
    }
    eventOpen = false;
    $('eventmodal').classList.add('hidden');
    UI.refresh();
    if (FB.state && !$('game').classList.contains('hidden') &&
      $('genmodal').classList.contains('hidden')) $('btn-endturn').focus();
    if (FB.game && FB.game.afterEvents) FB.game.afterEvents();
    return false;
  }

  /* every soul an event names gets a card — face, house arms, home, and
     allegiance — so "Reginbald insulted me" never arrives as a bare name.
     Scans the raw strings (title, text variants, option labels, branch
     texts) for {role} tokens; prepareEvent creates those roles before any
     localized rendering begins. */
  function eventCharCards(s, ev, carded) {
    let raw = ' ';
    function add(x) {
      if (!x) return;
      if (typeof x === 'string') raw += x + ' ';
      else if (typeof x === 'object') { for (const k in x) add(x[k]); }
    }
    add(ev.title); add(ev.text);
    for (const o of (ev.options || [])) {
      add(o.label); add(o.desc);
      if (o.success) add(o.success.text);
      if (o.failure) add(o.failure.text);
    }
    let h = '';
    for (const role of ['lord', 'priest', 'friend', 'rival', 'spouse', 'suitor']) {
      if (raw.indexOf('{' + role + '}') < 0) continue;
      const c = FB.getRole(s, role, false);
      if (c && !carded[c.id]) { carded[c.id] = 1; h += UI.charCardHtml(s, c); }
    }
    return h;
  }

  function showEvent(ev, ctx) {
    const s = FB.state;
    eventOpen = true;
    FB.markFired(s, ev);
    $('eventmodal').classList.remove('hidden');
    if (FB.prepareEvent) FB.prepareEvent(s, ev, ctx);
    $('ev-title').textContent = FB.eventText(s, s.player.charId, ev, 'title', ctx);
    let bodyHtml = esc(FB.eventText(s, s.player.charId, ev, 'text', ctx));
    if (ev.warStatus && FB.warStateText) {
      bodyHtml += '<p class="adesc">' + esc(FB.warStateText(s, s.player.charId)) + '</p>';
    }
    const carded = {};
    if (ev.charCard) {
      const cc = FB.getRole(s, ev.charCard, false);
      if (cc) { bodyHtml += UI.charCardHtml(s, cc); carded[cc.id] = 1; }
    }
    bodyHtml += eventCharCards(s, ev, carded);
    $('ev-text').innerHTML = bodyHtml;
    FB.paintFaces($('ev-text'), s);
    const box = $('ev-options');
    box.innerHTML = '';
    /* a nameChild event (births) opens with a name field: the generated name,
       editable, with a dice to reroll from the child's culture */
    if (ev.nameChild && ctx.childId) {
      const nc = s.chars[ctx.childId];
      if (nc && !nc.dead) {
        const row = document.createElement('div');
        row.className = 'evname';
        row.innerHTML = '<label>Name the child <input id="ev-name" type="text" maxlength="20"></label>' +
          '<button id="ev-name-dice" class="btn small" title="' +
          esc(FB.T('Random name')) + '">&#127922;</button>';
        box.appendChild(row);
        const inp = $('ev-name');
        inp.value = nc.name;
        $('ev-name-dice').addEventListener('click', function () {
          inp.value = FB.randomName(nc.culture, nc.sex);
          inp.focus();
          inp.select();
        });
      }
    }
    let opts = (ev.options || []).filter(function (o) {
      return !o.require || FB.checkTrigger(s, o.require);
    });
    if (!opts.length) opts = [{ label: 'So it goes.', effects: {} }];
    for (let i = 0; i < opts.length; i++) {
      const o = opts[i];
      /* original index (not the filtered position) keys the overlay stably */
      const oi = ev.options ? ev.options.indexOf(o) : -1;
      const btn = document.createElement('button');
      btn.className = 'evopt';
      btn.innerHTML = hintFor(i) +
        esc(oi >= 0 ? FB.eventText(s, s.player.charId, ev, 'options.' + oi + '.label', ctx) : FB.fmt(s, o.label, ctx)) +
        (o.desc ? '<span class="odesc">' + esc(oi >= 0 ? FB.eventText(s, s.player.charId, ev, 'options.' + oi + '.desc', ctx) : FB.fmt(s, o.desc, ctx)) + '</span>' : '');
      (function (opt) {
        btn.addEventListener('click', function () { chooseOption(ev, opt, ctx); });
      })(o);
      box.appendChild(btn);
    }
    FB.localizeTree(box);
    setTimeout(function () {
      const inp = $('ev-name');
      if (inp && !FB.isTouch) { inp.focus(); inp.select(); return; }
      const b = box.querySelector('.evopt');
      if (b) b.focus();
    }, 0);
  }

  function chooseOption(ev, opt, ctx) {
    const s = FB.state;
    if (ev.nameChild && ctx.childId) {
      const nc = s.chars[ctx.childId];
      const inp = $('ev-name');
      if (nc && inp) {
        const nm = (inp.value || '').trim();
        if (nm) nc.name = nm;
      }
    }
    if (opt.chance !== undefined) {
      const p = typeof opt.chance === 'string' ? FB.namedChance(s, opt.chance) : opt.chance;
      const ok = FB.chance(p);
      // a blessed sword is spent on the battle it blesses, won or lost
      if (opt.chance === 'battle' || opt.chance === 'war_battle') delete s.player.flags.blessed_war;
      const branch = ok ? opt.success : opt.failure;
      if (opt.effects) FB.applyEffects(s, opt.effects, ctx);
      if (branch) {
        if (branch.effects) FB.applyEffects(s, branch.effects, ctx);
        const oi = ev.options ? ev.options.indexOf(opt) : -1;
        const outcomePath = oi >= 0
          ? 'options.' + oi + '.' + (ok ? 'success' : 'failure') + '.text'
          : '';
        if (branch.text && outcomePath) FB.prepareEventPath(s, ev, outcomePath, ctx);
        const btext = branch.text
          ? (oi >= 0 ? FB.eventText(s, s.player.charId, ev, outcomePath, ctx) : FB.fmt(s, branch.text, ctx))
          : (ok ? FB.T('It goes well.') : FB.T('It goes poorly.'));
        showOutcome(btext);
        return;
      }
    } else if (opt.effects) {
      FB.applyEffects(s, opt.effects, ctx);
    }
    nextEvent();
  }

  function showOutcome(text) {
    $('ev-text').innerHTML = '<i>' + esc(text) + '</i>';
    const box = $('ev-options');
    box.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'evopt';
    btn.textContent = FB.T('Continue');
    btn.addEventListener('click', nextEvent);
    box.appendChild(btn);
    btn.focus();
  }

  UI.eventsBusy = function () { return eventOpen; };

  /* ================= generic modal ================= */
  function openModal(title, bodyHtml, opts) {
    UI._gmDismiss = !(opts && opts.dismissable === false);
    const gm = $('genmodal');
    gm.classList.remove('hidden');
    /* per-dialog modifier class (e.g. the changelog's even-margin sheet) —
       drop the previous one before applying this dialog's */
    if (UI._gmModalClass) gm.classList.remove(UI._gmModalClass);
    UI._gmModalClass = (opts && opts.modalClass) || '';
    if (UI._gmModalClass) gm.classList.add(UI._gmModalClass);
    $('gm-title').textContent = FB.translateKnown(title);
    FB.localizeTree($('gm-title'));
    $('gm-body').innerHTML = bodyHtml;
    FB.localizeTree($('gm-body'));
    $('gm-body').scrollTop = 0; // a reused body keeps the last dialog's scroll
    if (!FB.isTouch) {
      const btns = $('gm-body').querySelectorAll('.actionbtn');
      for (let i = 0; i < btns.length && i < 18; i++) {
        btns[i].insertAdjacentHTML('afterbegin', hintFor(i));
      }
    }
    /* opts.noFocus: leave nothing focused, so a stray Space/Enter cannot
       activate the first button (used where the choice must be deliberate) */
    if (!(opts && opts.noFocus)) {
      setTimeout(function () {
        const b = $('gm-body').querySelector('button, input, textarea');
        // preventScroll: focusing a long dialog's lone Close button must not
        // drag the view to the bottom (Changelog, How to Play)
        if (b) b.focus({ preventScroll: true });
      }, 0);
    }
  }
  UI.openModal = openModal;
  UI._gmDismiss = true;
  UI.closeModal = function () {
    $('genmodal').classList.add('hidden');
    UI._gmDismiss = true;
    if (FB.state && !$('game').classList.contains('hidden') &&
      $('eventmodal').classList.contains('hidden')) $('btn-endturn').focus();
  };

  /* ================= war target picker ================= */
  UI.showWarTargets = function () {
    const s = FB.state;
    const targets = FB.warTargets(s);
    let h = '<div class="gm-list">';
    for (const pid of targets) {
      const pr = FB.world.byId[pid];
      const rid = s.owner[pid];
      const realm = s.realms[rid];
      const enMen = Math.round(FB.realmStrength(s, rid) * FBDATA.balance.levyPerDev * (FBDATA.balance.aiHostPerDev || 0.3));
      h += '<button class="actionbtn" data-war="' + esc(pid) + '">⚔ ' + esc(pr.name) +
        '<span class="adesc">' + esc(FB.T(
          'Held by {realm} ({counties}) · they can field ~{theirs} against your ~{yours}', {
            realm: realm ? realm.name : '?',
            counties: countyCountText(s, FB.realmProvinces(s, rid).length),
            theirs: menText(s, enMen),
            yours: menText(s, FB.playerLevy(s))
          })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Think better of it</button>';
    openModal('Choose Your Conquest', h);
    document.querySelectorAll('[data-war]').forEach(function (b) {
      b.addEventListener('click', function () {
        FB.startPlayerWar(FB.state, b.dataset.war);
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* renounce the liege and fight for it — confirmed here, done in
     FB.doIndependence (a baron seizes his home county in the bargain) */
  UI.showIndependence = function () {
    const s = FB.state;
    const lg = s.realms[s.player.liege];
    const top = FB.topRealm(s, s.player.liege);
    const enMen = Math.round(FB.realmStrength(s, top) * FBDATA.balance.levyPerDev * (FBDATA.balance.aiHostPerDev || 0.3));
    const sovereign = s.realms[top] ? s.realms[top].name : FB.T('Your sovereign');
    const independenceText = s.player.tier === 3 && FB.world.byId[s.player.provinceId]
      ? FB.T('You renounce {liege} and raise your own banner over {province}, seized as your own county. {sovereign} will march to bring you to heel — they can field ~{theirs} against your ~{yours}.', {
        liege: lg ? lg.name : FB.T('your liege'),
        province: FB.world.byId[s.player.provinceId].name,
        sovereign: sovereign,
        theirs: menText(s, enMen), yours: menText(s, FB.playerLevy(s))
      })
      : FB.T('You renounce {liege} and raise your own banner over your lands. {sovereign} will march to bring you to heel — they can field ~{theirs} against your ~{yours}.', {
        liege: lg ? lg.name : FB.T('your liege'),
        sovereign: sovereign,
        theirs: menText(s, enMen), yours: menText(s, FB.playerLevy(s))
      });
    const h = '<div class="gm-body-text"><p>' + esc(independenceText) + '</p></div>' +
      '<button class="btn primary" id="gm-indep">Raise my banner</button> ' +
      '<button class="btn" id="gm-cancel">Stay sworn</button>';
    openModal('Declare Independence', h);
    $('gm-indep').addEventListener('click', function () {
      FB.doIndependence(FB.state);
      UI.closeModal(); UI.refresh();
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* ================= building picker =================
     With one province it opens directly; with more, a province list comes
     first and the building list's cancel button goes back to it. */
  UI.showBuildings = function (pid) {
    const s = FB.state;
    const provs = FB.demesne(s);
    if (!pid && provs.length > 1) {
      let h = '<div class="gm-list">';
      for (const id of provs) {
        const pr = FB.world.byId[id];
        const open = FB.buildable(s, id).length;
        h += '<button class="actionbtn" data-bprov="' + esc(id) + '"' + (open ? '' : ' disabled') + '>🏘 ' + esc(pr.name) +
          '<span class="adesc">' + esc(FB.T(
            'development {development} · {built} built · {remaining}', {
              development: s.dev[id] || 1,
              built: FB.builtIn(s, id).length,
              remaining: open
                ? FB.T('{count} possible', { count: open })
                : FB.T('nothing more to raise')
            })) + '</span></button>';
      }
      h += '</div><button class="btn" id="gm-cancel">Not now</button>';
      openModal('Build Where?', h);
      document.querySelectorAll('[data-bprov]').forEach(function (btn) {
        btn.addEventListener('click', function () { UI.showBuildings(btn.dataset.bprov); });
      });
      $('gm-cancel').addEventListener('click', UI.closeModal);
      return;
    }
    pid = pid || provs[0];
    const pr = FB.world.byId[pid];
    const done = FB.builtIn(s, pid);
    let h = '<div class="gm-list">';
    for (const b of FB.buildable(s, pid)) {
      const short = s.player.gold < b.cost;
      h += '<button class="actionbtn" data-build="' + esc(b.id) + '"' + (short ? ' disabled' : '') + '>' +
        esc(FB.T('{icon} {name} — {cost} gold', {
          icon: b.def.icon, name: dt(s, 'building', b.id, b.def, 'name'), cost: b.cost
        })) + '<span class="adesc">' + esc(dt(s, 'building', b.id, b.def, 'desc')) +
        (short ? ' ' + esc(FB.T('(not enough gold)')) : '') + '</span></button>';
    }
    h += '</div>';
    if (done.length) {
      h += '<p class="hint">' + esc(FB.T('Already standing in {province}:',
        { province: pr.name })) + ' ' + done.map(function (id) {
        const d = FBDATA.buildings[id];
        return d ? d.icon + ' ' + esc(dt(s, 'building', id, d, 'name')) : esc(id);
      }).join(' · ') + '</p>';
    }
    h += '<button class="btn" id="gm-cancel">' +
      esc(FB.T(provs.length > 1 ? 'Back' : 'Not now')) + '</button>';
    openModal(FB.T('Raise a Building in {province}', { province: pr.name }), h);
    document.querySelectorAll('[data-build]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.build(FB.state, pid, btn.dataset.build);
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', provs.length > 1
      ? function () { UI.showBuildings(); } : UI.closeModal);
  };

  /* ================= settlement picker ================= */
  const SETT_ICON = { village: '🏡', town: '🏘', city: '🏙' };
  UI.showSettlements = function () {
    const s = FB.state;
    const list = FB.settlementsOf(s, s.player.provinceId);
    let h = '<div class="gm-list">';
    for (const st of list) {
      h += '<button class="actionbtn" data-visit="' + esc(st.name) + '" data-kind="' + st.kind + '">' +
        SETT_ICON[st.kind] + ' ' + esc(st.name) +
        '<span class="adesc">' + esc(FB.T('{kind} · a day’s outing',
          { kind: settlementKindName(st.kind) })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Stay home</button>';
    openModal('Where To?', h);
    document.querySelectorAll('[data-visit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.state.eventQueue.push({ id: 'visit_' + btn.dataset.kind, ctx: { settlement: btn.dataset.visit } });
        UI.closeModal();
        FB.game.passDay({ skipFocus: true }); // the outing spends the day
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      delete FB.state.player.cooldowns.go_to_town; // no visit, no cooldown
      UI.closeModal(); UI.refresh();
    });
  };

  /* ================= plot picker ================= */
  UI.showPlots = function () {
    const s = FB.state;
    let h = '<p class="hint">' + esc(FB.T(
      'A plot claims your daily focus until it is ready to spring — and every day of weaving risks discovery.')) +
      '</p><div class="gm-list">';
    for (const t of FB.plotAvailable(s)) {
      h += '<button class="actionbtn" data-plot="' + esc(t.id) + '">' +
        t.def.icon + ' ' + esc(dt(s, 'plot', t.id, t.def, 'name')) +
        '<span class="adesc">' + esc(dt(s, 'plot', t.id, t.def, 'desc')) + ' ' +
        esc(FB.T('({days} days’ weaving, roughly)', { days: t.def.need })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Begin a Plot', h);
    document.querySelectorAll('[data-plot]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.beginPlot(FB.state, btn.dataset.plot);
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* ================= envoy picker ================= */
  UI.showEnvoys = function () {
    const s = FB.state;
    let h = '<p class="hint">' + esc(FB.T(
      '10 gold in gifts; a pact of peace holds two years, and your diplomacy carries the rest.')) +
      '</p><div class="gm-list">';
    for (const rid of FB.envoyTargets(s)) {
      const r = s.realms[rid];
      const men = Math.round(FB.realmStrength(s, rid) * FBDATA.balance.levyPerDev * (FBDATA.balance.aiHostPerDev || 0.3));
      h += '<button class="actionbtn" data-envoy="' + esc(rid) + '">🕊 ' + esc(r.name) +
        '<span class="adesc">' + esc(FB.T('{counties} · fields ~{men}', {
          counties: countyCountText(s, FB.realmProvinces(s, rid).length),
          men: menText(s, men)
        })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Send an Envoy', h);
    document.querySelectorAll('[data-envoy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.sendEnvoy(FB.state, btn.dataset.envoy);
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* ================= liege-chain pickers ================= */

  /* bend the knee anywhere along your own chain */
  UI.showHomage = function () {
    const s = FB.state;
    const chain = FB.liegeChain(s, s.player.liege);
    let h = '<p class="hint">A journey, a gift of words, a knee on the floor. Opinion grows — more for silver tongues.</p><div class="gm-list">';
    for (const rid of chain) {
      const r = s.realms[rid];
      h += '<button class="actionbtn" data-rid="' + esc(rid) + '">🙇 ' +
        esc(FB.T('{title} {name}', {
          title: FB.realmRankTitle(s, r), name: r.ruler.name
        })) +
        '<span class="adesc">' + esc(FB.T('{realm} · opinion {opinion}',
          { realm: r.name, opinion: FB.liegeOpOf(s, rid) })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Pay Homage', h);
    document.querySelectorAll('[data-rid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.payHomage(FB.state, btn.dataset.rid);
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      delete FB.state.player.cooldowns.pay_homage; // no journey, no cooldown
      UI.closeModal(); UI.refresh();
    });
  };

  /* appeal to a lord ABOVE your direct liege */
  UI.showAppeal = function () {
    const s = FB.state;
    const chain = FB.liegeChain(s, s.player.liege).slice(1);
    let h = '<p class="hint">Carry your suit past your own lord to a greater one. Success makes you HIS direct man — and an enemy of the man you passed over.</p><div class="gm-list">';
    for (const rid of chain) {
      const r = s.realms[rid];
      h += '<button class="actionbtn" data-rid="' + esc(rid) + '">⚖ ' +
        esc(FB.T('{title} {name}', {
          title: FB.realmRankTitle(s, r), name: r.ruler.name
        })) +
        '<span class="adesc">' + esc(FB.T('{realm} · opinion {opinion}',
          { realm: r.name, opinion: FB.liegeOpOf(s, rid) })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Appeal to a Higher Lord', h);
    document.querySelectorAll('[data-rid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const rid = btn.dataset.rid;
        FB.state.player.appealRid = rid;
        FB.state.eventQueue.push({ id: 'liege_appeal', ctx: { rid: rid } });
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      delete FB.state.player.cooldowns.appeal_lord; // no suit carried, no cooldown
      UI.closeModal(); UI.refresh();
    });
  };

  /* sue the liege for a disgraced neighbor's fief */
  UI.showPetitionCounty = function () {
    const s = FB.state;
    const cands = FB.petitionCandidates(s);
    let h = '<p class="hint">' + esc(FB.T(
      'The liege strips only a man he already despises — and only for a vassal he loves. Your service in his wars: {service}.',
      { service: s.player.warService || 0 })) + '</p><div class="gm-list">';
    for (const c of cands) {
      const pr = FB.world.byId[c.pid];
      const hr = s.realms[c.holder];
      s.player.petitionPid = c.pid; // lets the named formula price this exact suit
      const odds = Math.round(FB.namedChance(s, 'county_petition') * 100);
      h += '<button class="actionbtn" data-pid="' + esc(c.pid) + '">🏰 ' + esc(pr.name) +
        '<span class="adesc">' + esc(FB.T(
          '{realm} · {ruler} · the liege’s favor {favor} · dev {development} · your suit ~{odds}%', {
            realm: hr.name, ruler: hr.ruler.name, favor: Math.round(c.favor),
            development: s.dev[c.pid] || 1, odds: odds
          })) + '</span></button>';
    }
    delete s.player.petitionPid;
    if (!cands.length) {
      h += '<p class="hint">' + esc(FB.T(
        'No neighboring lord stands low enough in your liege’s favor ({favor} or less). Time brings disgrace — wait for it.',
        { favor: FBDATA.balance.petitionFavorMax })) + '</p>';
    }
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Petition for a Fief', h);
    document.querySelectorAll('[data-pid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        s.player.petitionPid = btn.dataset.pid;
        s.eventQueue.push({ id: 'county_petition', ctx: { pid: btn.dataset.pid } });
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      delete FB.state.player.cooldowns.petition_county; // no suit pressed, no cooldown
      UI.closeModal(); UI.refresh();
    });
  };

  /* a struggling neighbor sells his birthright */
  UI.showBuyCounty = function () {
    const s = FB.state;
    const cands = FB.buyCountyCandidates(s);
    let h = '<p class="hint">A small lord with empty coffers will sell his birthright. The liege tolerates it — barely.</p><div class="gm-list">';
    for (const c of cands) {
      const pr = FB.world.byId[c.pid];
      const hr = s.realms[c.holder];
      h += '<button class="actionbtn" data-pid="' + esc(c.pid) + '">💰 ' + esc(pr.name) +
        '<span class="adesc">' + esc(FB.T(
          '{ruler} · dev {development} · {price} gold', {
            ruler: hr.ruler.name, development: s.dev[c.pid] || 1, price: c.price
          })) + '</span></button>';
    }
    if (!cands.length) h += '<p class="hint">No weak neighbor holds land beside yours.</p>';
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Buy Out a Neighbor', h);
    document.querySelectorAll('[data-pid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!FB.buyCounty(FB.state, btn.dataset.pid)) { UI.toast('Not enough gold.'); return; }
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      delete FB.state.player.cooldowns.buy_county; // no bargain, no cooldown
      UI.closeModal(); UI.refresh();
    });
  };

  /* found a holding on empty land */
  UI.showSettleWaste = function () {
    const s = FB.state;
    const B = FBDATA.balance;
    let h = '<p class="hint">' + esc(FB.T(
      '{gold} gold and {prestige} prestige to plant a settlement on empty land. The new county answers to you — and belongs to no de jure duchy.',
      { gold: B.settleGold, prestige: B.settlePrestige })) + '</p><div class="gm-list">';
    for (const pid of FB.wastelandCandidates(s)) {
      const pr = FB.world.byId[pid];
      h += '<button class="actionbtn" data-pid="' + esc(pid) + '">🌱 ' + esc(pr.name) +
        '<span class="adesc">' + esc(FB.T('empty {terrain}',
          { terrain: terrainName(pr.terrain) })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Settle the Wasteland', h);
    document.querySelectorAll('[data-pid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.settleWaste(FB.state, btn.dataset.pid);
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      delete FB.state.player.cooldowns.settle_waste; // no ground broken, no cooldown
      UI.closeModal(); UI.refresh();
    });
  };

  /* offer your lands to a neighboring sovereign */
  UI.showFealty = function () {
    const s = FB.state;
    let h = '<p class="hint">Kneel to a neighboring sovereign: your lands join his realm and he becomes your liege. If you already serve another, he may call it treason.</p><div class="gm-list">';
    for (const rid of FB.fealtyTargets(s)) {
      const r = s.realms[rid];
      const men = Math.round(FB.realmStrength(s, rid) * FBDATA.balance.levyPerDev * (FBDATA.balance.aiHostPerDev || 0.3));
      h += '<button class="actionbtn" data-rid="' + esc(rid) + '">🤝 ' + esc(r.name) +
        '<span class="adesc">' + esc(FB.T('{title} {ruler} · fields ~{men}', {
          title: FB.realmRankTitle(s, r), ruler: r.ruler.name, men: menText(s, men)
        })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Swear Fealty', h);
    document.querySelectorAll('[data-rid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.swearFealty(FB.state, btn.dataset.rid);
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* the liege lord's sheet — AI rulers are lightweight realm.ruler objects,
     not full chars, so this renders the realm rather than a character card */
  UI.showLiegeModal = function (rid) {
    const s = FB.state;
    const r = rid && s.realms[rid];
    if (!r || !r.alive || !r.ruler) return;
    const cap = FB.world.byId[r.capital];
    const rel = cap ? FB.religionOf(cap.religion) : null;
    const men = Math.round(FB.realmStrength(s, rid) * FBDATA.balance.levyPerDev * (FBDATA.balance.aiHostPerDev || 0.3));
    const op = Math.round(FB.liegeOpOf(s, rid));
    const liege = r.liege && s.realms[r.liege];
    let h = '<div class="charcard"><canvas id="liegecrest" class="pface" width="56" height="64"></canvas>' +
      '<div><div class="ccname">' + esc(FB.T('{title} {name}', {
        title: FB.realmRankTitle(s, r), name: r.ruler.name
      })) + '</div>' +
      '<div class="ccmeta">' + esc(FB.T('Man of {age}', { age: r.ruler.age })) +
      ' · ' + esc(cultureName(s, r.ruler.culture)) +
      (rel ? ' · ' + rel.icon + ' ' + esc(religionName(s, cap.religion)) : '') + '</div>' +
      '<div class="ccmeta">' + esc(liege
        ? FB.T('Himself a vassal of {liege}', { liege: liege.name })
        : FB.T('Sovereign — kneels to no one')) + '</div>' +
      '<div class="ccmeta ' + FB.opClass(op) + '">' +
      esc(FB.T('⚔ martial {martial} · favor {favor}', {
        martial: r.ruler.mar, favor: (op > 0 ? '+' : '') + op
      })) + '</div></div></div>' +
      '<div style="margin-top:10px">' +
      kv('Realm', esc(r.name)) +
      kv('Counties', FB.realmProvinces(s, rid).length) +
      kv('Realm host', '~' + esc(menText(s, men))) +
      (cap ? kv('Capital', esc(cap.name)) : '') +
      '</div>';
    h += '<button class="btn" id="gm-cancel">Close</button>';
    openModal(rid === s.player.liege ? 'Your Liege' : 'Realm Ruler', h);
    FB.drawCrest($('liegecrest'), rid);
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* give a demesne county to a sworn man */
  UI.showGrantCounty = function () {
    const s = FB.state;
    let h = '<p class="hint">A vassal holds the county in your name, pays taxes each season, and remembers the favor. You keep everything else.</p><div class="gm-list">';
    for (const pid of s.player.provs) {
      const pr = FB.world.byId[pid];
      h += '<button class="actionbtn" data-pid="' + esc(pid) + '">🏰 ' + esc(pr.name) +
        '<span class="adesc">' + esc(FB.T('dev {development} · {terrain}', {
          development: s.dev[pid] || 1, terrain: terrainName(pr.terrain)
        })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Grant a County', h);
    document.querySelectorAll('[data-pid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.grantCounty(FB.state, btn.dataset.pid);
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* demand a fief back from a vassal */
  UI.showRevoke = function () {
    const s = FB.state;
    let h = '<p class="hint">Demand a fief back into your own hand. A contented vassal yields; a bitter one answers with spears.</p><div class="gm-list">';
    for (const vid of FB.playerVassals(s)) {
      const r = s.realms[vid];
      h += '<button class="actionbtn" data-rid="' + esc(vid) + '">📜 ' + esc(r.name) +
        '<span class="adesc">' + esc(FB.T('{ruler} · opinion {opinion}', {
          ruler: r.ruler.name, opinion: FB.liegeOpOf(s, vid)
        })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Revoke a County', h);
    document.querySelectorAll('[data-rid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const rid = btn.dataset.rid;
        FB.state.player.revokeRid = rid;
        FB.state.eventQueue.push({ id: 'vassal_revoke', ctx: { rid: rid } });
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* ================= household holdings picker ================= */
  UI.showHoldings = function () {
    const s = FB.state;
    let h = '<p class="hint">' + esc(FB.T(
      'Property passes to your heirs — a household built up over generations is its own kind of greatness.')) +
      '</p><div class="gm-list">';
    for (const t of FB.holdingAvailable(s)) {
      const short = s.player.gold < t.def.cost;
      h += '<button class="actionbtn" data-holding="' + esc(t.id) + '"' + (short ? ' disabled' : '') + '>' +
        esc(FB.T('{icon} {name} — {cost} gold', {
          icon: t.def.icon, name: dt(s, 'holding', t.id, t.def, 'name'), cost: t.def.cost
        })) + '<span class="adesc">' + esc(dt(s, 'holding', t.id, t.def, 'desc')) +
        (short ? ' ' + esc(FB.T('(not enough gold)')) : '') + '</span></button>';
    }
    h += '</div>';
    const done = FB.holdingList(s);
    if (done.length) {
      h += '<p class="hint">' + esc(FB.T('The household owns:')) + ' ' + done.map(function (id) {
        const d = FBDATA.holdings[id];
        return d ? d.icon + ' ' + esc(dt(s, 'holding', id, d, 'name')) : esc(id);
      }).join(' · ') + '</p>';
    }
    h += '<button class="btn" id="gm-cancel">Not now</button>';
    openModal('Better the Household', h);
    document.querySelectorAll('[data-holding]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.buyHolding(FB.state, btn.dataset.holding);
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* ================= innovation picker ================= */
  UI.showTech = function () {
    const s = FB.state;
    const pts = Math.floor(s.player.research || 0);
    let h = '<p class="hint">' + esc(FB.T(
      'Scholarship: {amount} — earned by patronizing scholars, libraries, and learned guests. Innovations persist across the generations.',
      { amount: pts })) + '</p><div class="gm-list">';
    for (const t of FB.techAvailable(s)) {
      const short = pts < t.def.cost;
      h += '<button class="actionbtn" data-tech="' + esc(t.id) + '"' + (short ? ' disabled' : '') + '>' +
        esc(FB.T('{icon} {name} — {cost} scholarship', {
          icon: t.def.icon, name: dt(s, 'tech', t.id, t.def, 'name'), cost: t.def.cost
        })) + '<span class="adesc">' + esc(dt(s, 'tech', t.id, t.def, 'desc')) +
        (short ? ' ' + esc(FB.T('(not enough scholarship)')) : '') + '</span></button>';
    }
    h += '</div>';
    const done = FB.techList(s);
    if (done.length) {
      h += '<p class="hint">' + esc(FB.T('Already adopted:')) + ' ' + done.map(function (id) {
        const d = FBDATA.tech[id];
        return d ? d.icon + ' ' + esc(dt(s, 'tech', id, d, 'name')) : esc(id);
      }).join(' · ') + '</p>';
    }
    h += '<button class="btn" id="gm-cancel">Not now</button>';
    openModal('Adopt an Innovation', h);
    document.querySelectorAll('[data-tech]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.adoptTech(FB.state, btn.dataset.tech);
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* ================= character sheet & trait dialogs ================= */
  UI.showCharModal = function (cid) {
    const s = FB.state;
    if (!s) return;
    const c = s.chars[cid];
    if (!c) return;
    const me = s.chars[s.player.charId];
    let h = UI.charCardHtml(s, c);
    // the dead get a sheet for remembrance — their dates, skills, traits — but no dealings
    if (c.dead) {
      h += '<button class="btn" id="cm-close" style="margin-top:10px">Close</button>';
      openModal(FB.fullName(c), h);
      FB.paintFaces($('gm-body'), s);
      $('cm-close').addEventListener('click', UI.closeModal);
      return;
    }
    h += '<div class="gm-list" style="margin-top:10px">';
    const isFamily = c.id === me.spouseId || me.childrenIds.indexOf(c.id) >= 0 ||
      (c.role === 'sibling' && c.dyn === me.dyn);
    if (c.id !== me.id) {
      h += '<button class="actionbtn" id="cm-befriend">🤝 Spend the day in their company' +
        '<span class="adesc">Warm their regard for you. (spends the day)</span></button>';
      h += '<button class="actionbtn" id="cm-gift"' + (s.player.gold < 5 ? ' disabled' : '') + '>🎁 Send a gift (5 gold)' +
        '<span class="adesc">Silver speaks warmly. (spends the day)</span></button>';
      const isMySpouse = c.spouseId === me.id || c.id === me.spouseId;
      if (isMySpouse) {
        const doc = FB.marriageDoctrine(me.religion);
        if (doc.divorce) {
          const divCost = doc.divorce === 'sunder' ? 0 : (FBDATA.balance.dowryByStation[FB.stationOf(c)] || 0);
          if (doc.divorce === 'talaq') {
            h += '<button class="actionbtn" id="cm-divorce"' + (s.player.gold < divCost ? ' disabled' : '') +
              '>' + esc(FB.T('🕊 Pronounce the divorce ({gold} gold)', { gold: divCost })) +
              '<span class="adesc">' + esc(FB.T(
                'Spoken before witnesses — and the mahr owed to {name} is paid out. (spends the day)',
                { name: c.name })) + '</span></button>';
          } else if (doc.divorce === 'get') {
            h += '<button class="actionbtn" id="cm-divorce"' + (s.player.gold < divCost ? ' disabled' : '') +
              '>' + esc(FB.T('📜 Grant a get ({gold} gold)', { gold: divCost })) +
              '<span class="adesc">' + esc(FB.T(
                'A writ written and witnessed; the ketubah owed to {name} is paid out. (spends the day)',
                { name: c.name })) + '</span></button>';
          } else {
            h += '<button class="actionbtn" id="cm-divorce">💔 Declare the marriage sundered' +
              '<span class="adesc">Witnesses at the door, their goods on the cart. Folk will talk. (−5 prestige, spends the day)</span></button>';
          }
        } else {
          const cdAn = s.player.cooldowns.annul !== undefined && s.turn - s.player.cooldowns.annul < 360;
          const canAn = s.player.gold >= 15 && s.player.piety >= 20 && !cdAn;
          h += '<button class="actionbtn" id="cm-annul"' + (canAn ? '' : ' disabled') +
            '>⛪ Petition to annul the marriage (15 gold, 20 piety)' +
            '<span class="adesc">' + (cdAn ? 'The church will not hear the plea again so soon.' :
              'Some flaw in the vows, some closeness of blood — the church may be persuaded the marriage never was.') + '</span></button>';
        }
      }
      if (FB.canCourt(s, c)) {
        const switching = s.player.courtingId && s.player.courtingId !== c.id;
        h += '<button class="actionbtn" id="cm-court">' +
          esc(FB.T(switching
            ? '🌷 Begin courtship (abandon your current suit)'
            : '🌷 Begin courtship')) +
          '<span class="adesc">' + esc(FB.T(
            'Pursue marriage with {name}: court them daily, then propose.',
            { name: c.name })) + '</span></button>';
        if (FB.stationOf(c) - FB.playerStation(s) > 0) {
          h += '<div class="progressnote">' + esc(FB.T(
            '⚖ {name} stands above your station — the family will expect great regard and renown before they bless such a match.',
            { name: c.name })) + '</div>';
        }
      } else if (s.player.courtingId === c.id) {
        if (Math.round(c.opinion) >= 5) {
          h += '<button class="actionbtn" id="cm-propose">💒 Propose marriage' +
            '<span class="adesc">Ask for their hand. Standing, wealth, and their regard decide.</span></button>';
        } else {
          h += '<div class="progressnote">' + esc(FB.T(
            '🌷 You are courting {name}. Win more of their regard (5+) before proposing — the courtship focus works day by day.',
            { name: c.name })) + '</div>';
        }
        h += '<button class="actionbtn" id="cm-breakoff">💔 Break off the courtship' +
          '<span class="adesc">Part ways without a wedding.</span></button>';
      } else {
        const why = courtBlockReason(s, c);
        if (why) h += '<div class="progressnote">' +
          esc(FB.T('💒 No marriage possible: {reason}', { reason: why })) + '</div>';
      }
      if (!isFamily) {
        h += '<button class="actionbtn" id="cm-insult">😤 Insult them publicly' +
          '<span class="adesc">Salt for their pride, sport for the onlookers. (spends the day)</span></button>';
        h += '<button class="actionbtn" id="cm-undermine">🕸 Undermine them quietly' +
          '<span class="adesc">Rumors, debts, misplaced letters — intrigue decides. (spends the day)</span></button>';
      }
    }
    const isYoungChild = (me.childrenIds.indexOf(c.id) >= 0 || c.id === me.id) && FB.ageOf(c, s.date.year) < 16;
    if (isYoungChild) {
      const self = c.id === me.id;
      h += upbringingNote(s, c);
      h += '<button class="actionbtn" id="cm-edufocus">' +
        esc(FB.T(self ? '🎓 Choose your education focus…' : '🎓 Choose their education focus…')) +
        '<span class="adesc">' +
        esc(FB.T(self
          ? 'Direct your formative years toward one art.'
          : 'Direct their formative years toward one art.')) + '</span></button>';
      h += '<button class="actionbtn" id="cm-tutor">' +
        esc(FB.T(self ? '🧑‍🏫 Choose a tutor…' : '🧑‍🏫 Appoint a tutor…')) +
        '<span class="adesc">' +
        esc(FB.T(self
          ? 'A skilled teacher shapes you faster — and leaves their mark.'
          : 'A skilled teacher shapes them faster — and leaves their mark.')) +
        '</span></button>';
    }
    // a parent may pledge an unwed child's hand from age twelve
    if (me.childrenIds.indexOf(c.id) >= 0 && !FB.spouseOf(s, c)) {
      const bt = c.betrothedId ? s.chars[c.betrothedId] : null;
      if (bt && !bt.dead) {
        h += '<div class="progressnote">' + esc(FB.T(
          '🤝 Betrothed to {name} — the wedding follows once both are of age.',
          { name: bt.name })) + '</div>';
      } else if (FB.ageOf(c, s.date.year) >= 12) {
        h += '<button class="actionbtn" id="cm-match">💍 Arrange a match…' +
          '<span class="adesc">' + esc(FB.T(c.sex === 'f'
            ? 'Sound out families for her hand. A pledge binds; the wedding follows at sixteen. (sealing one spends the day)'
            : 'Sound out families for his hand. A pledge binds; the wedding follows at sixteen. (sealing one spends the day)')) +
          '</span></button>';
      }
    }
    h += '</div><button class="btn" id="cm-close">Close</button>';
    openModal(FB.fullName(c), h);
    FB.paintFaces($('gm-body'), s);
    function actThen(fn) {
      UI.closeModal();
      fn();
      FB.game.passDay({ skipFocus: true });
    }
    function maybeRival() {
      if (c.opinion <= -40 && s.roles.rival !== c.id) {
        const existing = FB.getRole(s, 'rival', false);
        if (!existing || existing.dead) {
          s.roles.rival = c.id;
          FB.news(s, FB.msg('news.social.rival',
            '⚡ {name} now counts you an enemy.', { name: c.name }));
        }
      }
    }
    const bf = $('cm-befriend');
    if (bf) bf.addEventListener('click', function () {
      actThen(function () {
        c.opinion = FB.clamp(c.opinion + 4 + Math.floor(FB.skillOf(me, 'dip') / 3), -100, 100);
        FB.news(s, FB.msg('news.social.befriended',
          '{name} warms to your company. (regard {regard})',
          { name: c.name, regard: Math.round(c.opinion) }));
      });
    });
    const gf = $('cm-gift');
    if (gf) gf.addEventListener('click', function () {
      actThen(function () {
        s.player.gold = Math.max(0, s.player.gold - 5);
        c.opinion = FB.clamp(c.opinion + 12, -100, 100);
        FB.news(s, FB.msg('news.social.gift',
          'Your gift pleases {name}. (regard {regard})',
          { name: c.name, regard: Math.round(c.opinion) }));
      });
    });
    const ct = $('cm-court');
    if (ct) ct.addEventListener('click', function () {
      actThen(function () {
        s.player.courtingId = c.id;
        s.player.flags.courting = 1;
        s.player.focus = 'court_suitor';
        FB.news(s, FB.msg('news.social.courting_begins',
          '🌷 You begin courting {name}.', { name: FB.fullName(c) }));
      });
    });
    const pp = $('cm-propose');
    if (pp) pp.addEventListener('click', function () {
      UI.closeModal();
      s.eventQueue.push({ id: 'proposal_made', ctx: {} });
      FB.game.passDay({ skipFocus: true });
    });
    const dv = $('cm-divorce');
    if (dv) dv.addEventListener('click', function () {
      actThen(function () {
        const doc = FB.marriageDoctrine(me.religion);
        const cost = doc.divorce === 'sunder' ? 0 : (FBDATA.balance.dowryByStation[FB.stationOf(c)] || 0);
        const gap = FB.stationOf(c) - FB.playerStation(s);
        if (cost) s.player.gold = Math.max(0, s.player.gold - cost);
        if (doc.divorce === 'sunder') s.player.prestige = Math.max(0, s.player.prestige - 5);
        if (gap > 0) s.player.prestige = Math.max(0, s.player.prestige - gap * 5);
        FB.doDivorce(s, c.id);
        FB.news(s, FB.msg('news.social.divorce', {
          forms: {
            select: 'value', param: 'kind', cases: {
              talaq: '🕊 You pronounce the divorce from {name}; the mahr of {cost} gold is paid.',
              get: '📜 A get is written and witnessed; {name} departs with the ketubah of {cost} gold.',
              other: '💔 Before witnesses, the marriage to {name} is declared sundered.'
            }
          }
        }, { kind: doc.divorce, name: c.name, cost: cost }));
        if (gap > 0) FB.news(s, FB.msg('news.social.divorce_house_offended',
          '🗣 The house of {name} does not forgive the slight.', { name: c.name }));
        FB.validateFocus(s);
      });
    });
    const an = $('cm-annul');
    if (an) an.addEventListener('click', function () {
      UI.closeModal();
      s.player.cooldowns.annul = s.turn; // the church hears one plea a year
      s.eventQueue.push({ id: 'annulment_plea', ctx: {} });
      FB.game.passDay({ skipFocus: true });
    });
    const bo = $('cm-breakoff');
    if (bo) bo.addEventListener('click', function () {
      UI.closeModal();
      s.player.courtingId = null;
      delete s.player.flags.courting;
      c.opinion = FB.clamp(c.opinion - 20, -100, 100);
      FB.news(s, FB.msg('news.social.courtship_ended',
        '💔 The courtship of {name} is ended.', { name: c.name }));
      FB.validateFocus(s);
      UI.refresh();
    });
    const ins = $('cm-insult');
    if (ins) ins.addEventListener('click', function () {
      actThen(function () {
        c.opinion = FB.clamp(c.opinion - 12, -100, 100);
        if (FB.chance(0.5 + FB.skillOf(me, 'dip') * 0.015)) {
          s.player.prestige += 4;
          FB.news(s, FB.msg('news.social.insult_success',
            'Your barb lands perfectly. {name} fumes; the crowd laughs.', { name: c.name }));
        } else {
          s.player.prestige = Math.max(0, s.player.prestige - 5);
          FB.news(s, FB.msg('news.social.insult_failure',
            'The insult falls flat. {name} answers better, and the laughter is theirs.',
            { name: c.name }));
        }
        maybeRival();
      });
    });
    const und = $('cm-undermine');
    if (und) und.addEventListener('click', function () {
      actThen(function () {
        if (FB.chance(0.35 + FB.skillOf(me, 'int') * 0.03)) {
          c.opinion = FB.clamp(c.opinion - 8, -100, 100);
          s.player.prestige += 3;
          if (FB.chance(0.5)) FB.gainSkill(me, 'int', 1);
          FB.news(s, FB.msg('news.social.undermine_success',
            'Your quiet work costs {name} dearly, and no one can prove a thing.',
            { name: c.name }));
        } else {
          c.opinion = FB.clamp(c.opinion - 20, -100, 100);
          s.player.prestige = Math.max(0, s.player.prestige - 6);
          FB.news(s, FB.msg('news.social.undermine_failure',
            'The scheme unravels — and {name} knows exactly whose hand was in it.',
            { name: c.name }));
        }
        maybeRival();
      });
    });
    const ef = $('cm-edufocus');
    if (ef) ef.addEventListener('click', function () { UI.showEduFocus(c.id); });
    const tu = $('cm-tutor');
    if (tu) tu.addEventListener('click', function () { UI.showTutorPick(c.id); });
    const mt = $('cm-match');
    if (mt) mt.addEventListener('click', function () { UI.showMatchPicker(c.id); });
    $('cm-close').addEventListener('click', UI.closeModal);
  };

  /* ================= arranged match picker =================
     Three families sounded out for a child's hand — the same three wait
     (stored on the child) until a pledge is sealed or the child weds
     elsewhere. A daughter's dowry is paid when the pledge is sealed; a
     son's bride brings hers to the wedding. Matches above the player's
     station want renown before they bless it. */
  UI.showMatchPicker = function (cid) {
    const s = FB.state;
    if (!s || UI.eventsBusy()) return;
    const c = s.chars[cid];
    if (!c || c.dead || FB.spouseOf(s, c) || c.betrothedId) return;
    const cands = FB.spawnMatchCandidates(s, c);
    const ps = FB.playerStation(s);
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Families willing to hear an offer for {name}’s hand:', { name: c.name })) +
      '</p></div><div class="gm-list">';
    for (const m of cands) {
      if (s.player.courtingId === m.id) continue; // no pledging your own paramour
      const gap = FB.stationOf(m) - ps;
      const need = gap > 0 ? gap * 20 : 0;
      const ask = m.dowryAsk || 0;
      const ok = s.player.gold >= ask && s.player.prestige >= need;
      const details = [
        FB.stationName(FB.stationOf(m)),
        FB.T('age {age}', { age: FB.ageOf(m, s.date.year) })
      ];
      if (ask) details.push(FB.T('their kin ask a dowry of {gold} gold', { gold: ask }));
      if (m.dowryDue) {
        details.push(FB.T('she would bring a dowry of {gold} gold', { gold: m.dowryDue }));
      }
      if (need) {
        details.push(s.player.prestige >= need
          ? FB.T('needs {prestige} prestige', { prestige: need })
          : FB.T('needs {prestige} prestige (you have {current})',
            { prestige: need, current: Math.floor(s.player.prestige) }));
      } else if (gap < 0) details.push(FB.T('a step down — folk will mark it'));
      h += '<button class="actionbtn" data-match="' + m.id + '"' + (ok ? '' : ' disabled') +
        '>💍 ' + esc((epithetText(s, m) ? epithetText(s, m) + ' — ' : '') + m.name) +
        '<span class="adesc">' + esc(details.join(' · ')) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Decide nothing today</button>';
    openModal(FB.T('A Match for {name}', { name: c.name }), h);
    document.querySelectorAll('[data-match]').forEach(function (b) {
      b.addEventListener('click', function () {
        const m = s.chars[b.dataset.match];
        if (!m) return;
        UI.closeModal();
        FB.sealKinMatch(s, c, m);
        FB.game.passDay({ skipFocus: true });
      });
    });
    $('gm-cancel').addEventListener('click', function () { UI.showCharModal(cid); });
  };

  /* ================= item card =================
     Every treasure chip opens this card: its story, its powers in plain
     words, and — for the player's own — the ways to part with it. viewOnly
     covers items worn by other characters (gifts already given). */
  function itemFxText(d) {
    const fx = d.fx || {};
    const parts = [];
    for (const k of FB.SKILLS) {
      if (fx[k]) parts.push(FB.T('{amount} {skill}', {
        amount: (fx[k] > 0 ? '+' : '') + fx[k], skill: FB.skillName(k)
      }));
    }
    if (fx.battle) parts.push(FB.T('{amount}% battle odds',
      { amount: (fx.battle > 0 ? '+' : '') + Math.round(fx.battle * 100) }));
    if (fx.prestige) parts.push(FB.T('{amount} prestige a season',
      { amount: (fx.prestige > 0 ? '+' : '') + fx.prestige }));
    if (fx.piety) parts.push(FB.T('{amount} piety a season',
      { amount: (fx.piety > 0 ? '+' : '') + fx.piety }));
    if (fx.health) parts.push(FB.T('wards off sickness and death'));
    return parts.join(' · ');
  }

  UI.showItemModal = function (id, viewOnly) {
    const s = FB.state;
    const def = FBDATA.items[id];
    if (!s || !def) return;
    const name = dt(s, 'item', id, def, 'name');
    const owned = !viewOnly && FB.itemList(s).indexOf(id) >= 0;
    const fx = itemFxText(def);
    const sell = Math.round(def.value * (FBDATA.balance.itemSellRatio || 0.5));
    let h = '<div class="gm-body-text">' +
      '<p style="font-size:16px"><b>' + def.icon + ' ' + esc(name) +
      '</b> · <span class="cmeta">' + esc(rarityName(def.rarity)) + '</span></p>' +
      '<p><i>' + esc(dt(s, 'item', id, def, 'desc')) + '</i></p>' +
      (fx ? '<p>⚜ ' + esc(fx) + '</p>' : '<p class="cmeta">No power but its worth.</p>') +
      (fx && !viewOnly ? '<p class="cmeta">Its powers serve whoever heads the family.</p>' : '') +
      '<p class="cmeta">' + esc(FB.T('Worth about {gold} gold.', { gold: def.value })) +
      '</p></div>';
    if (owned) {
      h += '<div class="gm-list">' +
        '<button class="actionbtn" id="im-give">🎁 Give it as a gift…' +
        '<span class="adesc">A treasure warms regard as mere silver never could. (spends the day)</span></button>' +
        '<button class="actionbtn" id="im-sell">' +
        esc(FB.T('💰 Sell it ({gold} gold)', { gold: sell })) +
        '<span class="adesc">Sold is sold — there is no buying it back. (spends the day)</span></button></div>';
    }
    h += '<button class="btn" id="gm-cancel" style="margin-top:10px">Close</button>';
    openModal(name, h);
    const gv = $('im-give');
    if (gv) gv.addEventListener('click', function () { UI.showItemGive(id); });
    const sl = $('im-sell');
    if (sl) sl.addEventListener('click', function () {
      UI.closeModal();
      FB.sellItem(s, id);
      FB.game.passDay({ skipFocus: true });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* who to honor with it — everyone the player knows by name */
  UI.showItemGive = function (id) {
    const s = FB.state;
    const def = FBDATA.items[id];
    if (!s || !def || FB.itemList(s).indexOf(id) < 0) return;
    const me = s.chars[s.player.charId];
    const seen = {}, folk = [];
    function add(c, rel) {
      if (!c || c.dead || c.id === me.id || seen[c.id]) return;
      seen[c.id] = 1;
      folk.push({ c: c, rel: rel });
    }
    for (const sp of FB.spousesOf(s, me)) add(sp, FB.T('your spouse'));
    if (s.player.courtingId) add(s.chars[s.player.courtingId], FB.T('courting'));
    const kin = FB.kinOf(s);
    for (const g of ['children', 'parents', 'siblings', 'grandchildren',
      'niecesNephews', 'unclesAunts', 'cousins', 'grandparents']) {
      for (const e of kin[g]) add(e.c, FB.T(e.rel));
    }
    for (const role of ['lord', 'priest', 'friend', 'rival']) {
      const relation = role === 'lord' ? FB.T('your lord') :
        (role === 'priest' ? FB.T('your priest') :
          (role === 'friend' ? FB.T('your friend') : FB.T('your rival')));
      add(FB.getRole(s, role, false), relation);
    }
    if (!folk.length) {
      UI.toast('You know no one to honor with it.');
      return;
    }
    const boost = FB.giftOpinion(def);
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Whom to honor with {icon} {item}? Such largesse is worth +{regard} regard.', {
        icon: def.icon, item: dt(s, 'item', id, def, 'name'), regard: boost
      })) + '</p></div><div class="gm-list">';
    for (const e of folk) {
      const op = Math.round(e.c.opinion);
      const details = s.roles.lord === e.c.id
        ? FB.T('{relation} · regard {regard} · your lord’s favor rises with it', {
          relation: e.rel, regard: (op > 0 ? '+' : '') + op
        })
        : FB.T('{relation} · regard {regard}', {
          relation: e.rel, regard: (op > 0 ? '+' : '') + op
        });
      h += '<button class="actionbtn" data-give="' + e.c.id + '">🎁 ' + esc(FB.fullName(e.c)) +
        '<span class="adesc ' + FB.opClass(op) + '">' + esc(details) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Keep it</button>';
    openModal('A Gift Worth Giving', h);
    document.querySelectorAll('[data-give]').forEach(function (b) {
      b.addEventListener('click', function () {
        UI.closeModal();
        FB.giveItem(s, id, b.dataset.give);
        FB.game.passDay({ skipFocus: true });
      });
    });
    $('gm-cancel').addEventListener('click', function () { UI.showItemModal(id); });
  };

  /* ---------- education: focus picker ---------- */
  const EDU_DESC = {
    dip: 'Words, charm, and the ways of court.',
    mar: 'Spear, shield, and command.',
    ste: 'Coin, crops, and the running of estates.',
    int: 'Secrets, shadows, and leverage.',
    lea: 'Letters, law, and lore. (grants literacy at 16)'
  };
  UI.showEduFocus = function (cid) {
    const s = FB.state;
    const c = s.chars[cid];
    if (!c) return;
    const self = c.id === s.player.charId;
    let h = '<div class="gm-list">';
    for (const k of FB.SKILLS) {
      const cur = c.edu && c.edu.focus === k;
      h += '<button class="actionbtn" data-edufocus="' + k + '">' + (cur ? '◉ ' : '○ ') +
        esc(FB.skillName(k)) + '<span class="adesc">' + esc(FB.L(EDU_DESC[k])) + '</span></button>';
    }
    h += '<button class="actionbtn" data-edufocus="">' +
      esc(FB.T('○ No directed study')) + '<span class="adesc">' +
      esc(FB.T(self ? 'Find your own way.' : 'Let the child find their own way.')) +
      '</span></button>';
    h += '</div><button class="btn" id="edu-back">' + esc(FB.T('Back')) + '</button>';
    openModal(self ? FB.T('🎓 Your education') :
      FB.T('🎓 Education of {name}', { name: c.name }), h);
    document.querySelectorAll('[data-edufocus]').forEach(function (b) {
      b.addEventListener('click', function () {
        const k = b.getAttribute('data-edufocus');
        c.edu = c.edu || {};
        c.edu.focus = k || null;
        FB.news(s, FB.msg('news.education.focus', {
          forms: {
            select: 'value', param: 'subject', cases: {
              self: {
                select: 'value', param: 'focus', cases: {
                  dip: '🎓 You will be schooled in diplomacy.',
                  mar: '🎓 You will be schooled in martial skill.',
                  ste: '🎓 You will be schooled in stewardship.',
                  int: '🎓 You will be schooled in intrigue.',
                  lea: '🎓 You will be schooled in learning.',
                  other: '🎓 You are left to your own devices.'
                }
              },
              other: {
                select: 'value', param: 'focus', cases: {
                  dip: '🎓 {name} will be schooled in diplomacy.',
                  mar: '🎓 {name} will be schooled in martial skill.',
                  ste: '🎓 {name} will be schooled in stewardship.',
                  int: '🎓 {name} will be schooled in intrigue.',
                  lea: '🎓 {name} will be schooled in learning.',
                  other: '🎓 {name} is left to their own devices.'
                }
              }
            }
          }
        }, { subject: self ? 'self' : 'other', focus: k || 'other', name: c.name }));
        UI.showCharModal(cid);
      });
    });
    $('edu-back').addEventListener('click', function () { UI.showCharModal(cid); });
  };

  /* ---------- education: tutor picker ---------- */
  UI.showTutorPick = function (cid) {
    const s = FB.state;
    const c = s.chars[cid];
    if (!c) return;
    const me = s.chars[s.player.charId];
    const self = c.id === me.id;
    const focus = c.edu && c.edu.focus;
    function skillNote(t) {
      if (focus) return FB.T('{skill} {value}',
        { skill: FB.skillName(focus), value: FB.skillOf(t, focus) });
      let best = 'dip';
      for (const k of FB.SKILLS) if (FB.skillOf(t, k) > FB.skillOf(t, best)) best = k;
      return FB.T('best: {skill} {value}',
        { skill: FB.skillName(best), value: FB.skillOf(t, best) });
    }
    const cands = [];
    if (self) {
      // a child player is taught by their elders, not by themselves
      const f = me.fatherId ? s.chars[me.fatherId] : null;
      const m = me.motherId ? s.chars[me.motherId] : null;
      if (f && !f.dead) cands.push({
        id: f.id, c: f, name: FB.T('{name} (your father)', { name: f.name })
      });
      if (m && !m.dead) cands.push({
        id: m.id, c: m, name: FB.T('{name} (your mother)', { name: m.name })
      });
    } else {
      cands.push({ id: 'self', c: me, name: FB.T('Teach them yourself') });
      for (const sp of FB.spousesOf(s, me)) {
        cands.push({
          id: sp.id, c: sp,
          name: FB.T(sp.sex === 'f' ? '{name} (your wife)' : '{name} (your husband)',
            { name: sp.name })
        });
      }
    }
    for (const r of ['priest', 'friend', 'lord']) {
      // the lord fosters only gentle children — a serf's child has no place in his hall
      if (r === 'lord' && FB.playerStation(s) < 2) continue;
      const rc = FB.getRole(s, r, false);
      if (rc && !rc.dead && (r !== 'lord' || rc.opinion >= 0)) {
        cands.push({
          id: rc.id, c: rc,
          name: FB.T('{name} ({role})', {
            name: rc.name,
            role: r === 'priest' ? FB.holyWord(me.religion) :
              (r === 'friend' ? FB.T('friend') : FB.T('lord'))
          })
        });
      }
    }
    function masterDescription() {
      if (!focus) return FB.T('A stranger of real accomplishment.');
      return FB.renderMessage(FB.msg('fx.ui.hired_master_focus', {
        forms: {
          select: 'value', param: 'focus', cases: {
            dip: 'A stranger of real accomplishment in diplomacy.',
            mar: 'A stranger of real accomplishment in martial matters.',
            ste: 'A stranger of real accomplishment in stewardship.',
            int: 'A stranger of real accomplishment in intrigue.',
            lea: 'A stranger of real accomplishment in learning.',
            other: 'A stranger of real accomplishment.'
          }
        }
      }, { focus: focus }), { state: s, viewer: s.player.charId });
    }
    let h = '<div class="gm-list">';
    for (const cd of cands) {
      const cur = c.edu && c.edu.tutorId === cd.id;
      h += '<button class="actionbtn" data-tutor="' + cd.id + '">' + (cur ? '◉ ' : '○ ') + esc(cd.name) +
        '<span class="adesc">' + esc(skillNote(cd.c)) + '</span></button>';
    }
    h += '<button class="actionbtn" data-tutor="~hire"' + (s.player.gold < 25 ? ' disabled' : '') +
      '>' + esc(FB.T('🎓 Hire a learned master (25 gold)')) + '<span class="adesc">' +
      esc(masterDescription()) + '</span></button>';
    if (c.edu && c.edu.tutorId) {
      h += '<button class="actionbtn" data-tutor="~none">' +
        esc(FB.T('✖ Dismiss the tutor')) + '<span class="adesc">' +
        esc(FB.T('The lessons end.')) + '</span></button>';
    }
    h += '</div><button class="btn" id="tut-back">' + esc(FB.T('Back')) + '</button>';
    openModal(self ? FB.T('🧑‍🏫 Your tutor') :
      FB.T('🧑‍🏫 A Tutor for {name}', { name: c.name }), h);
    document.querySelectorAll('[data-tutor]').forEach(function (b) {
      b.addEventListener('click', function () {
        const v = b.getAttribute('data-tutor');
        c.edu = c.edu || {};
        if (v === '~none') {
          c.edu.tutorId = null;
          FB.news(s, FB.msg('news.education.tutor_dismissed', {
            forms: {
              select: 'value', param: 'subject', cases: {
                self: 'Your tutor is dismissed.',
                other: 'The tutor of {name} is dismissed.'
              }
            }
          }, { subject: self ? 'self' : 'other', name: c.name }));
        } else if (v === '~hire') {
          if (s.player.gold < 25) return;
          s.player.gold -= 25;
          const pr = FB.world.byId[s.player.provinceId];
          const master = FB.makeCharacter(s, {
            culture: pr.culture, religion: pr.religion,
            born: s.date.year - FB.ri(35, 60), quality: 3, role: 'tutor'
          });
          master.epithetMsg = FB.msg('fx.epithet.hired_master', 'Hired master', {});
          if (focus) master.skills[focus] = FB.clamp(FB.ri(11, 16), 0, FBDATA.balance.skillHardCap || 40);
          else master.skills.lea = FB.clamp(FB.ri(11, 16), 0, FBDATA.balance.skillHardCap || 40);
          c.edu.tutorId = master.id;
          FB.news(s, FB.msg('news.education.master_hired', {
            forms: {
              select: 'value', param: 'subject', cases: {
                self: '🎓 {tutor}, a learned master, takes charge of your education.',
                other: '🎓 {tutor}, a learned master, takes charge of {name}’s education.'
              }
            }
          }, { subject: self ? 'self' : 'other', tutor: master.name, name: c.name }));
        } else {
          c.edu.tutorId = v;
          FB.news(s, FB.msg('news.education.tutor_chosen', {
            forms: {
              select: 'value', param: 'case', cases: {
                player_self: '🎓 You take charge of {name}’s lessons.',
                named_self: '🎓 {tutor} takes charge of your lessons.',
                named_other: '🎓 {tutor} takes charge of {name}’s lessons.',
                other: '🎓 A tutor takes charge of {name}’s lessons.'
              }
            }
          }, {
            case: v === 'self' ? 'player_self' :
              (s.chars[v] ? (self ? 'named_self' : 'named_other') : 'other'),
            tutor: s.chars[v] ? s.chars[v].name : '',
            name: c.name
          }));
        }
        UI.showCharModal(cid);
      });
    });
    $('tut-back').addEventListener('click', function () { UI.showCharModal(cid); });
  };

  /* ---------- name an heir ---------- */
  UI.showHeirPick = function () {
    const s = FB.state;
    if (!s) return;
    const heirs = FB.heirsOf(s).slice(0, 6);
    if (!heirs.length) {
      openModal('📜 Name Your Heir',
        '<div class="gm-body-text"><p>You have no living kin to name. Before a succession can be settled, an heir must exist.</p></div>' +
        '<button class="btn" id="hp-close">Close</button>');
      $('hp-close').addEventListener('click', UI.closeModal);
      return;
    }
    let h = '<div class="gm-body-text"><p>Who shall carry the name when you are gone? The choice, once witnessed, steadies the realm — and the family.</p></div><div class="gm-list">';
    for (const c of heirs) {
      const details = FB.T('Age {age} · {mar} {marValue} · {ste} {steValue} · {dip} {dipValue}', {
        age: FB.ageOf(c, s.date.year),
        mar: FB.skillName('mar'), marValue: FB.skillOf(c, 'mar'),
        ste: FB.skillName('ste'), steValue: FB.skillOf(c, 'ste'),
        dip: FB.skillName('dip'), dipValue: FB.skillOf(c, 'dip')
      });
      h += '<button class="actionbtn" data-namedheir="' + c.id + '">' + FB.faceTag(c, 32, 38) + ' ' +
        (s.player.namedHeirId === c.id ? '★ ' : '') + esc(FB.fullName(c)) +
        '<span class="adesc">' + esc(details) + '</span></button>';
    }
    h += '</div><button class="btn" id="hp-close">Decide later</button>';
    openModal('📜 Name Your Heir', h);
    FB.paintFaces($('gm-body'), s);
    document.querySelectorAll('[data-namedheir]').forEach(function (b) {
      b.addEventListener('click', function () {
        const c = s.chars[b.getAttribute('data-namedheir')];
        if (!c) return;
        s.player.namedHeirId = c.id;
        FB.applyEffects(s, { prestige: 8 });
        FB.news(s, FB.msg('news.life.heir_named',
          '📜 {name} is named heir before witnesses.', { name: FB.fullName(c) }));
        UI.closeModal();
      });
    });
    $('hp-close').addEventListener('click', UI.closeModal);
  };

  UI.showTraitModal = function (tid) {
    const t = FBDATA.traits[tid];
    if (!t) return;
    const s = FB.state;
    const traitName = dt(s, 'trait', tid, t, 'name');
    const traitDesc = dt(s, 'trait', tid, t, 'desc');
    let fx = '';
    for (const k of FB.SKILLS) {
      if (t[k]) fx += '<div class="kv"><span>' + esc(FB.skillName(k)) + '</span><b>' +
        (t[k] > 0 ? '+' : '') + t[k] + '</b></div>';
    }
    if (t.health) fx += kv('Constitution', esc(FB.T(t.health > 0 ? 'hardier' : 'frailer')));
    if (t.fert && t.fert !== 1) {
      fx += kv('Fertility', esc(FB.T(t.fert > 1 ? 'higher' : 'lower')));
    }
    if (t.opinion) fx += kv('Others’ regard', (t.opinion > 0 ? '+' : '') + t.opinion);
    if (t.opposite && FBDATA.traits[t.opposite]) {
      fx += kv('Opposite of', esc(dt(s, 'trait', t.opposite, FBDATA.traits[t.opposite], 'name')));
    }
    openModal(t.icon + ' ' + traitName,
      '<div class="gm-body-text"><p><i>' + esc(traitDesc) + '</i></p>' +
      (fx || '<p class="hint">No lasting effects — only a story people tell about you.</p>') +
      '</div><button class="btn" id="tm-close">Close</button>');
    $('tm-close').addEventListener('click', UI.closeModal);
  };

  UI.showAilmentModal = function (aid) {
    const a = FBDATA.ailments[aid];
    const s = FB.state;
    const icon = a ? a.icon : '🤒';
    const name = a ? dt(s, 'ailment', aid, a, 'name') : FB.T('Ill');
    openModal(icon + ' ' + name,
      '<div class="gm-body-text"><p><i>' +
      esc(a ? dt(s, 'ailment', aid, a, 'desc') : FB.T('Sickness has taken hold.')) + '</i></p>' +
      '<p class="hint">' + esc(FB.T(!a || a.kind === 'sickness' ?
        'A sickness — it must run its course; rest and time are the only physic.' :
        'A wound — it knits as your strength returns, a year or so at most.')) +
      '</p></div><button class="btn" id="tm-close">Close</button>');
    $('tm-close').addEventListener('click', UI.closeModal);
  };

  /* ================= death & succession ================= */
  function legendQuipText(legend, state) {
    if (!legend) return '';
    if (legend.quipMsg) {
      return FB.renderMessage(legend.quipMsg, {
        state: state, viewer: state.player.charId
      });
    }
    return legend.quip || '';
  }

  function legendTitleText(legend) {
    if (!legend) return '';
    if (legend.titleData) return FB.renderTitleSnapshot(legend.titleData);
    return legend.title ? FB.L(legend.title) : '';
  }

  UI.showDeath = function (heirs, causeText) {
    const s = FB.state;
    const me = s.chars[s.player.charId];
    // G.die records the legend (and its parting quip) before opening this
    let h = '<div class="gm-body-text"><p>' + esc(causeText) + '</p>';
    const lg = s.legends && s.legends[s.legends.length - 1];
    const quip = lg && lg.id === me.id ? legendQuipText(lg, s) : '';
    if (quip) h += '<p><i>' + esc(quip) + '</i></p>';
    /* noFocus: the choice of an heir must be deliberate — a Space/Enter meant
       for the pause key must not sign the succession for the first heir */
    if (heirs.length) {
      h += '<p>' + esc(FB.T('But a house is more than one life. Who carries the name onward?')) +
        '</p></div><div class="gm-list">';
      for (const c of heirs) {
        const details = FB.T('Age {age} · {mar} {marValue} · {ste} {steValue} · {dip} {dipValue}', {
          age: FB.ageOf(c, s.date.year),
          mar: FB.skillName('mar'), marValue: FB.skillOf(c, 'mar'),
          ste: FB.skillName('ste'), steValue: FB.skillOf(c, 'ste'),
          dip: FB.skillName('dip'), dipValue: FB.skillOf(c, 'dip')
        });
        h += '<button class="actionbtn" data-heir="' + c.id + '">' + FB.faceTag(c, 32, 38) + ' ' +
          esc(FB.fullName(c)) + '<span class="adesc">' + esc(details) + '</span></button>';
      }
      h += '</div>';
      openModal(FB.T('☠ {name} is Dead', { name: me.name }), h,
        { dismissable: false, noFocus: true });
      FB.paintFaces($('gm-body'), s);
      document.querySelectorAll('[data-heir]').forEach(function (b) {
        b.addEventListener('click', function () {
          UI.closeModal();
          FB.game.succeedTo(b.dataset.heir);
        });
      });
    } else {
      h += '<p><b>' + esc(FB.T('There is no heir.')) + '</b> ' +
        esc(FB.T('The house of {dynasty} passes out of memory, as all things must.',
          { dynasty: me.dyn || me.name })) + '</p></div>';
      openModal('☠ The Line is Ended', h + '<button class="btn primary" id="gm-gameover">' +
        esc(FB.T('See the chronicle')) + '</button>', { dismissable: false, noFocus: true });
      $('gm-gameover').addEventListener('click', function () {
        UI.closeModal(); UI.gameOver();
      });
    }
  };

  UI.gameOver = function () {
    const s = FB.state;
    const years = s.date.year - FBDATA.balance.startYear;
    const summary = FB.renderMessage(FB.msg('fx.gameover.summary', {
      forms: {
        select: 'plural', param: 'generations', cases: {
          one: 'Your saga spanned {years} years and {generations} generation.',
          other: 'Your saga spanned {years} years and {generations} generations.'
        }
      }
    }, { years: years, generations: s.generation || 1 }), {
      state: s, viewer: s.player.charId
    });
    const peakTitle = s.peakTitleData ? FB.renderTitleSnapshot(s.peakTitleData) :
      (s.peakTitle ? FB.L(s.peakTitle) : FB.stationName(s.peakTier || 0));
    let h = '<div class="gm-body-text">' +
      '<p>' + esc(summary) + '</p>' +
      kv('Highest rank attained', esc(peakTitle)) +
      kv('Final wealth', esc(FB.T('{amount} gold', { amount: Math.floor(s.player.gold) }))) +
      kv('Prestige', Math.floor(s.player.prestige)) +
      kv('Piety', Math.floor(s.player.piety));
    if (s.legends && s.legends.length) {
      h += '<h4>' + esc(FB.T('Those who carried the name')) + '</h4>';
      for (const lg of s.legends) {
        const lc = s.chars[lg.id];
        const title = legendTitleText(lg);
        const legendQuip = legendQuipText(lg, s);
        h += '<div class="row gap" style="align-items:center;margin:6px 0">' +
          (lc ? FB.faceTag(lc, 32, 38) : '') +
          '<div style="flex:1"><b>' + esc(lg.name) + '</b> <span class="hint">' + esc(title) +
          ' · ' + lg.born + '–' + lg.died + '</span><br>' +
          '<span class="hint"><i>' + esc(legendQuip) + '</i></span></div></div>';
      }
    }
    h += '<h4>' + esc(FB.T('Last lines of the chronicle')) + '</h4>';
    for (let i = Math.max(0, s.log.length - 6); i < s.log.length; i++) {
      h += '<p>· ' + esc(FB.newsText(s.log[i], s, s.player.charId)) + '</p>';
    }
    h += '</div><button class="btn primary" id="gm-title-btn">' +
      esc(FB.T('Return to title')) + '</button>';
    openModal('The Chronicle Closes', h, { dismissable: false });
    FB.paintFaces($('gm-body'), s);
    $('gm-title-btn').addEventListener('click', function () {
      UI.closeModal();
      FB.game.toTitle();
    });
  };

  /* ================= menu ================= */
  UI.showMenu = function () {
    const obs = FB.game.observe; // a watcher has no life to save, load, or mod
    let h = '<div class="gm-list">' +
      '<button class="actionbtn" id="m-resume">▶ Resume</button>' +
      (obs ? '' : '<button class="actionbtn" id="m-save">💾 Save game</button>') +
      (obs ? '' : '<button class="actionbtn" id="m-load">📂 Load game</button>') +
      '<button class="actionbtn" id="m-settings">⚙ Settings</button>' +
      '<button class="actionbtn" id="m-help">❓ How to play</button>' +
      (obs ? '' : '<button class="actionbtn" id="m-mods">🧩 Mods</button>') +
      '<button class="actionbtn" id="m-changes">📜 Changelog</button>' +
      '<button class="actionbtn" id="m-report">🐞 Report a bug</button>' +
      '<button class="actionbtn" id="m-quit">' +
      esc(FB.T(obs ? '🏳 Stop observing' : '🏳 Abandon to title')) + '</button>' +
      '</div>' +
      (FB.state && FB.state.seed ?
        '<div class="seedrow"><label for="m-seed">🔑 Start seed — tap to copy &amp; share</label>' +
        '<input id="m-seed" type="text" readonly value="' + esc(FB.state.seed) + '"></div>' : '') +
      '<div class="hint" style="text-align:center;margin:10px auto 0">v' + esc(FB.VERSION) + '</div>';
    openModal('Menu', h);
    $('m-resume').addEventListener('click', UI.closeModal);
    if (FB.state && FB.state.seed) {
      const inp = $('m-seed');
      inp.addEventListener('click', function () {
        inp.select();
        inp.setSelectionRange(0, 99999); // iOS ignores select() without this
        const done = function () { UI.toast('🔑 Seed copied — share it with a friend.'); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(inp.value).then(done, function () {
            document.execCommand('copy'); done(); // file:// and older browsers
          });
        } else { document.execCommand('copy'); done(); }
      });
    }
    if (!obs) {
      $('m-save').addEventListener('click', function () { UI.showSaveLoad(true); });
      $('m-load').addEventListener('click', function () { UI.showSaveLoad(false); });
      $('m-mods').addEventListener('click', function () { UI.showMods(); });
    }
    $('m-settings').addEventListener('click', function () { UI.showSettings(); });
    $('m-help').addEventListener('click', function () { UI.showHelp(); });
    $('m-changes').addEventListener('click', function () { UI.showChangelog(); });
    $('m-report').addEventListener('click', function () { UI.showReport(); });
    $('m-quit').addEventListener('click', function () {
      UI.closeModal(); FB.game.toTitle();
    });
  };

  function langSelector() {
    const locs = FB.availableLocales();
    let opts = '';
    for (const loc of locs) {
      const status = loc.status === 'preview' ? ' — ' + FB.T('Preview') : '';
      opts += '<option value="' + esc(loc.code) + '"' + (loc.code === FB.locale ? ' selected' : '') + '>' +
        esc(loc.name + status) + '</option>';
    }
    return '<div class="gm-body-text" style="margin-top:8px"><p>' + esc(FB.T('Language')) + '</p></div>' +
      '<select id="set-lang" class="setlang">' + opts + '</select>' +
      '<p class="hint">' +
      esc(FB.T('French, German, Italian, and Spanish are AI-generated Preview translations and may contain errors.')) +
      '</p>';
  }

  /* ================= settings ================= */
  UI.showSettings = function () {
    const G = FB.game;
    const WORDS = ['slowest', 'slow', 'the default', 'fast', 'fastest'];
    let h = '<div class="gm-body-text"><p>' + (FB.isTouch
      ? esc(FB.T('How quickly the days flow while time runs.'))
      : esc(FB.T('How quickly the days flow while time runs — on a keyboard, −/+ change it at any time.'))) +
      '</p></div>';
    h += '<div class="speedrow"><input type="range" id="set-speed" min="0" max="' +
      (G.SPEEDS.length - 1) + '" step="1" value="' + G.speedIdx + '" aria-label="' +
      esc(FB.T('Speed of days')) + '">' +
      '<div class="adesc" id="set-speed-label">' + speedLabel(G.speedIdx) + '</div></div>';
    if (G.observe) { // watcher comforts: quiet toasts, or no panel at all
      h += '<div class="gm-body-text" style="margin-top:8px"><p>While observing:</p></div>' +
        '<label class="autorow"><input type="checkbox" id="set-obsquiet"' + (G.obsQuiet ? ' checked' : '') + '> ' +
        '<b>Silence the news toasts</b><span class="adesc">Happenings still fill the chronicle; the popups stay off the map.</span></label>' +
        '<label class="autorow"><input type="checkbox" id="set-obsbare"' + (G.obsBare ? ' checked' : '') + '> ' +
        '<b>Hide the Land & Chronicle panel</b><span class="adesc">Only the map and the flow of days remain.</span></label>';
    }
    h += langSelector();
    h += '<button class="btn" id="gm-back">Back</button>';
    openModal('Settings', h);
    function speedLabel(i) {
      return FB.T('Speed {current} / {total} — {description}', {
        current: i + 1,
        total: G.SPEEDS.length,
        description: WORDS[i] ? FB.T(WORDS[i]) : ''
      });
    }
    const slider = $('set-speed');
    slider.addEventListener('input', function () { // live label while dragging
      $('set-speed-label').textContent = speedLabel(parseInt(slider.value, 10));
    });
    slider.addEventListener('change', function () { // commit once, on release
      G.setSpeed(parseInt(slider.value, 10) - G.speedIdx);
    });
    if (G.observe) {
      $('set-obsquiet').addEventListener('change', function () { G.obsQuiet = $('set-obsquiet').checked; });
      $('set-obsbare').addEventListener('change', function () {
        G.obsBare = $('set-obsbare').checked;
        document.body.classList.toggle('obshidepanel', G.obsBare);
        FB.map.resize(); // the freed space belongs to the map
      });
    }
    const langSel = $('set-lang');
    if (langSel) {
      langSel.addEventListener('change', function () {
        FB.setLocale(langSel.value);
      });
    }
    $('gm-back').addEventListener('click', function () { FB.state ? UI.showMenu() : UI.closeModal(); });
  };

  UI.showSaveLoad = function (saving) {
    let h = '<div class="gm-list">';
    for (let i = 1; i <= 3; i++) {
      const d = FB.save.read(i); // one parse per slot: late saves are large
      const meta = FB.save.metaOf(d);
      const other = !saving && meta && FB.save.otherWorld(d);
      const description = other
        ? FB.T('{save} · 🧩 another world — its mods are not the ones active now',
          { save: meta })
        : (meta || FB.T('Empty'));
      h += '<button class="actionbtn" data-slot="' + i + '">' +
        esc(FB.T(saving ? '💾 Save to slot {slot}' : '📂 Load slot {slot}', { slot: i })) +
        '<span class="adesc">' + esc(description) + '</span></button>';
    }
    // a life as text outlives a browser that forgets its storage
    h += saving ?
      '<button class="actionbtn" id="sl-export">📤 Export this life' +
      '<span class="adesc">copy it as text — safe if this browser wipes its saves, or to move devices</span></button>' :
      '<button class="actionbtn" id="sl-import">📥 Import a life' +
      '<span class="adesc">paste back an exported save text</span></button>';
    h += '</div>';
    if (!FB.save.available) {
      h += '<div class="hint" style="text-align:center;margin:8px auto 0">⚠ This browser is blocking save storage — slots may vanish. Export keeps a life as text.</div>';
    }
    h += '<button class="btn" id="gm-back">Back</button>';
    openModal(saving ? 'Save Game' : 'Load Game', h);
    document.querySelectorAll('[data-slot]').forEach(function (b) {
      b.addEventListener('click', function () {
        const n = parseInt(b.dataset.slot, 10);
        if (saving) {
          if (FB.save.toSlot(n)) { UI.toast('Saved to slot {slot}.', { slot: n }); UI.closeModal(); }
        }
        else {
          if (FB.save.slotMeta(n)) { UI.closeModal(); FB.game.loadSlot(n); }
        }
      });
    });
    if (saving) $('sl-export').addEventListener('click', UI.showExport);
    else $('sl-import').addEventListener('click', UI.showImport);
    $('gm-back').addEventListener('click', function () { FB.state ? UI.showMenu() : UI.closeModal(); });
  };

  /* a life as copyable text — the escape hatch for browsers that wipe
     localStorage (iPhone in-app webviews, iframe-blocked storage) and the
     way to move a life between devices */
  UI.showExport = function () {
    openModal('Export Save',
      '<div class="gm-body-text"><p>This text <b>is</b> your current life. Copy it somewhere safe — a note, an email to yourself — then paste it back with 📥 Import on any device or browser. It is long; that is normal.</p></div>' +
      '<textarea id="sl-xtext" class="savetext" readonly rows="6"></textarea>' +
      '<div class="gm-list"><button class="actionbtn" id="sl-xcopy">📋 Copy to clipboard</button></div>' +
      '<button class="btn" id="gm-back">Back</button>');
    const ta = $('sl-xtext');
    ta.value = FB.save.exportState();
    $('sl-xcopy').addEventListener('click', function () {
      ta.select();
      ta.setSelectionRange(0, 9999999); // iOS ignores select() without this
      const done = function () { UI.toast('📋 Save text copied — keep it somewhere safe.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ta.value).then(done, function () {
          document.execCommand('copy'); done(); // file:// and older browsers
        });
      } else { document.execCommand('copy'); done(); }
    });
    $('gm-back').addEventListener('click', function () { UI.showSaveLoad(true); });
  };

  UI.showImport = function () {
    openModal('Import Save',
      '<div class="gm-body-text"><p>Paste an exported save text below, then load it. The life wakes where it left off — and lands in the autosave slot too.</p></div>' +
      '<textarea id="sl-itext" class="savetext" rows="6" placeholder="FBS1.…"></textarea>' +
      '<div class="gm-list"><button class="actionbtn" id="sl-iload">📥 Load this life</button></div>' +
      '<button class="btn" id="gm-back">Back</button>');
    $('sl-iload').addEventListener('click', function () {
      const data = FB.save.parseExport($('sl-itext').value);
      if (!data) { UI.toast('That text is not a Fallowborn save.'); return; }
      if (FB.game.loadData(data)) {
        UI.closeModal();
        FB.save.autosave(); // plant the imported life in local storage too
      }
    });
    $('gm-back').addEventListener('click', function () { UI.showSaveLoad(false); });
  };

  /* a bug or idea as copyable text — the player’s words bundled with everything
     needed to reproduce it: game version, start seed, mod set, and the current
     life as save text (the same FBS1. blob Import wakes). There is no server to
     send it to; the player pastes it on Discord, in an email, or as a GitHub
     issue. A watcher has no life to attach, so observe mode skips the save. */
  UI.showReport = function () {
    const withLife = FB.state && !FB.game.observe;
    const h = '<div class="gm-body-text"><p>' +
      'Describe the bug or your idea, then <b>📋 Copy report</b> — it bundles your words with the game version' +
      (withLife ? ', your start seed, and your current life as save text, so the exact moment can be reopened' : '') +
      '.</p></div>' +
      '<select id="rp-type" class="setlang">' +
      '<option value="Bug">🐞 Bug — something went wrong</option>' +
      '<option value="Suggestion">💡 Suggestion — an idea for the game</option>' +
      '</select>' +
      '<textarea id="rp-text" class="savetext" rows="5" placeholder="What happened? What did you expect to happen?"></textarea>' +
      '<div class="gm-list" style="margin-top:8px">' +
      '<button class="actionbtn" id="rp-copy">📋 Copy report' +
      '<span class="adesc">' +
      (withLife ? 'your message + game version, start seed &amp; your current life as save text' :
        'your message + game version') +
      '</span></button>' +
      '</div>' +
      '<div class="gm-body-text"><p>Then paste it in any of these places:</p></div>' +
      '<div class="gm-list">' +
      '<a class="actionbtn" href="https://discord.gg/G8E67hY2pj" target="_blank" rel="noopener">💬 Discord' +
      '<span class="adesc">discord.gg/G8E67hY2pj — the quickest answer</span></a>' +
      '<a class="actionbtn" href="mailto:hello@fallowborn.com">✉ Email' +
      '<span class="adesc">hello@fallowborn.com</span></a>' +
      '<a class="actionbtn" href="https://github.com/dli9431/fallowborn/issues" target="_blank" rel="noopener">🐙 GitHub Issues' +
      '<span class="adesc">watch it get fixed</span></a>' +
      '</div>' +
      '<button class="btn" id="gm-back">Back</button>';
    openModal('Report a Bug', h);
    $('rp-copy').addEventListener('click', function () {
      const msg = $('rp-text').value.trim();
      if (!msg) { UI.toast('Write a line about the bug or idea first.'); $('rp-text').focus(); return; }
      let report = $('rp-type').value + ' — Fallowborn v' + FB.VERSION + '\n\n' + msg + '\n\n---\n';
      if (FB.state && FB.state.seed) report += 'Start seed: ' + FB.state.seed + '\n';
      report += 'Mods: ' + (FB.mods.sig() || 'none (vanilla)') + '\n';
      if (withLife) {
        report += 'Save (Menu → Load game → 📥 Import wakes this exact moment):\n' +
          FB.save.exportState() + '\n';
      }
      const done = function () { UI.toast('📋 Report copied — paste it on Discord, in an email, or a GitHub issue.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(report).then(done, function () {
          legacyCopy(report); done(); // file:// and older browsers
        });
      } else { legacyCopy(report); done(); }
    });
    /* execCommand fallback needs a selectable element — the report lives in no
       visible textarea, so lend it a temporary one */
    function legacyCopy(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, 99999999); // iOS ignores select() without this
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    $('gm-back').addEventListener('click', function () { FB.state ? UI.showMenu() : UI.closeModal(); });
  };

  UI.showHelp = function () {
    openModal('How to Play', '<div class="gm-body-text">' +
      '<p><b>Fallowborn</b> is a life-and-dynasty game. You begin in 867 AD — most likely poor — and try to raise your family through the ranks of medieval society before old age claims each generation.</p>' +
      '<h4>Day by day</h4><ul>' +
      '<li>Set a <b>focus</b> in the Deeds tab — it is pursued every day until you change it (work the land, drill, haggle, pray, court…).</li>' +
      '<li><b>Deeds</b> are one-shot acts (poach, scheme, propose, petitions…) — each spends the day, and some need time before they can be repeated.</li>' +
      '<li>Press <b>Space</b> (or the Play/Pause button) to set time flowing — days pass on their own — and press it again to pause. <b>F</b> (or ▶▶) skips straight to the next happening. Events halt the days while they await your choice.</li></ul>' +
      '<h4>Climbing the ladder</h4>' +
      '<p>Serf → Freeholder → Gentry → Baron → Count → Duke → King → Emperor. The Deeds tab always shows a hint for your next step. Wealth, prestige, your lord’s favor, marriage, war-glory, or the church can all raise you.</p>' +
      '<h4>Dynasty</h4>' +
      '<p>Marry and raise children. When you die, you continue as your heir. No heir — no story.</p>' +
      '<p>Open a child’s sheet (Kin tab) to choose an <b>education focus</b> and appoint a <b>tutor</b> — the tutor’s own skill sets how fast the child learns between ages 6 and 16, and their habits can rub off. A Learning education grants literacy at 16.</p>' +
      '<h4>The map</h4>' +
      '<p>Drag to pan, pinch or scroll to zoom, tap a province for details. Realms wage their own wars; borders shift with the decades.</p>' +
      '<h4>Keyboard (desktop)</h4>' +
      '<p><b>Arrows</b> pan the map · <b>Shift+arrows</b> hop between neighboring provinces · <b>PgUp/PgDn</b> zoom · <b>H</b> center home · <b>Enter</b> select the province at screen center.</p>' +
      '<p><b>Space</b> plays / pauses the flow of days · <b>−</b>/<b>+</b> slow and quicken the days (also in menu → Settings) · <b>F</b> skips to the next happening (and pauses) · <b>D S K L C</b> open the Deeds / Self / Kin / Land / Chronicle panels · <b>1–9</b> choose focuses, deeds, event options, and dialog items · <b>[</b> and <b>]</b> cycle panels · <b>Esc</b> menu / back / close · <b>Tab</b> moves between buttons.</p>' +
      '<h4>Saving</h4><p>The game autosaves each spring. Manual slots live in the menu, beside 📤 Export / 📥 Import — a life kept as text survives browsers that wipe their storage, and travels to other devices.</p>' +
      '</div><button class="btn primary" id="gm-ok">Close</button>');
    $('gm-ok').addEventListener('click', function () { FB.state ? UI.showMenu() : UI.closeModal(); });
  };

  UI.showChangelog = function () {
    let h = '<div class="gm-body-text" data-i18n-ignore>';
    for (const rel of FB.CHANGELOG) {
      h += '<h4>v' + esc(rel.v) + (rel.date ? ' &mdash; ' + esc(rel.date) : '') + '</h4><ul>';
      for (const c of rel.changes) h += '<li>' + esc(c) + '</li>';
      h += '</ul>';
    }
    h += '</div><div class="gm-footer"><button class="btn primary" id="gm-ok">Close</button></div>';
    openModal('Changelog', h, { modalClass: 'changelog-modal' });
    $('gm-ok').addEventListener('click', function () { FB.state ? UI.showMenu() : UI.closeModal(); });
  };

  UI.showMods = function () {
    const bundled = FB.mods.bundled();
    const mods = FB.mods.list();
    let h = '';
    if (bundled.length) {
      h += '<div class="gm-body-text"><p><b>Bundled mods</b> — enabling or disabling reloads the game; start a new life afterwards.</p></div>';
      bundled.forEach(function (mod, i) {
        const on = FB.mods.isEnabled(mod.id);
        h += '<div class="row gap" style="align-items:center;margin:6px 0">' +
          '<div style="flex:1" data-i18n-ignore><b>' + esc(mod.name) + '</b>' +
          (mod.desc ? '<br><span class="hint">' + esc(mod.desc) + '</span>' : '') +
          '</div>' +
          '<button class="btn ' + (on ? '' : 'primary') + '" id="mod-bundled-' + i + '">' + (on ? 'Disable' : 'Enable') + '</button></div>';
      });
    }
    h += '<div class="gm-body-text">' +
      '<p>Mods are JSON files merged over the game data (events, provinces, realms, cultures, traits, balance). See <b>docs/MODDING.md</b> in the game folder for the format. You can also edit the files in <b>data/</b> directly.</p>' +
      '<p>Mods stay on until removed, and saves remember their world — a life begun with a mod continues only while that mod is active.</p></div>' +
      panelh('Active mods');
    if (mods.length) {
      for (let i = 0; i < mods.length; i++) {
        h += '<div class="modrow"><span data-i18n-ignore>🧩 ' + esc(mods[i].name) + '</span>' +
          ' <span class="cmeta">(' + mods[i].kb + ' kB)</span>' +
          '<button class="btn small danger" data-unmod="' + i + '">Remove</button></div>';
      }
    } else {
      h += '<p class="cmeta" style="font-size:13px;margin:4px 0">None — no JSON mods applied.</p>';
    }
    h += panelh('Add a mod') +
      '<p style="margin:8px 0"><input type="file" id="modfile" accept=".json"></p>' +
      '<textarea class="modjson" id="modpaste" placeholder="' +
      esc(FB.T('Or paste mod JSON here, e.g. {example}',
        { example: '{"events":[...]}' })) + '"></textarea>' +
      '<div class="row gap wrap" style="margin-top:8px">' +
      '<button class="btn primary" id="mod-apply">Apply &amp; reload</button>' +
      (mods.length || bundled.some(function (m) { return FB.mods.isEnabled(m.id); }) ? '<button class="btn danger" id="mod-clear">Remove all mods</button>' : '') +
      '<button class="btn" id="gm-ok2">Close</button></div>' +
      '<p class="hint" style="margin-top:8px">Re-applying a mod of the same name replaces it. Adding or removing reloads the page.</p>';
    openModal('Mods', h);
    bundled.forEach(function (mod, i) {
      $('mod-bundled-' + i).addEventListener('click', function () { FB.mods.toggle(mod.id); });
    });
    document.querySelectorAll('[data-unmod]').forEach(function (b) {
      b.addEventListener('click', function () { FB.mods.removeAt(parseInt(b.dataset.unmod, 10)); });
    });
    $('mod-apply').addEventListener('click', function () {
      const f = $('modfile').files[0];
      const pasted = $('modpaste').value.trim();
      if (f) {
        const rd = new FileReader();
        rd.onload = function () { FB.mods.store(rd.result); };
        rd.readAsText(f);
      } else if (pasted) {
        FB.mods.store(pasted);
      } else UI.toast('Choose a file or paste JSON first.');
    });
    const mc = $('mod-clear');
    if (mc) mc.addEventListener('click', function () { FB.mods.clear(); });
    $('gm-ok2').addEventListener('click', function () { FB.state ? UI.showMenu() : UI.closeModal(); });
  };

  /* ================= boot-time wiring ================= */
  UI.wire = function () {
    FB.fx.on(function (intent) {
      if (intent.kind !== 'toast') return;
      if (FB.game.observe && FB.game.obsQuiet) return;
      UI.toastMessage(intent.message, intent.legacyText);
    });
    document.querySelectorAll('#sidetabs .tab[data-tab], #lefttabs .tab[data-tab]').forEach(function (t) {
      t.addEventListener('click', function () { setTab(t.dataset.tab); });
    });
    // the topbar portrait opens your own sheet (a drawer on phones)
    $('tb-portrait').addEventListener('click', function () {
      if (FB.state) UI.showTab('char');
    });
    $('btn-closeself').addEventListener('click', function () {
      document.body.classList.remove('showself');
    });
    if (!FB.isTouch) {
      const hot = {
        actions: { key: 'D', label: 'Deeds' },
        char: { key: 'S', label: 'Self' },
        family: { key: 'K', label: 'Kin' },
        prov: { key: 'L', label: 'Land' },
        log: { key: 'C', label: 'Chronicle' }
      };
      document.querySelectorAll('#sidetabs .tab, #lefttabs .tab').forEach(function (t) {
        const item = hot[t.dataset.tab];
        if (item) t.innerHTML = '<span class="keyhint">' + item.key + '</span> ' +
          esc(FB.T(item.label));
      });
    }
    $('btn-endturn').addEventListener('click', function () {
      if (!UI.eventsBusy()) FB.game.togglePause();
    });
    $('btn-skip').addEventListener('click', function () {
      if (!UI.eventsBusy()) { FB.game.setPaused(true); FB.game.skipAhead(); }
    });
    if (!FB.isTouch) $('btn-skip').innerHTML = '<span class="keyhint">F</span> ▶▶';
    $('btn-auto').addEventListener('click', function () {
      if (!UI.eventsBusy()) UI.showAutoResolve();
    });
    $('btn-menu').addEventListener('click', UI.showMenu);
    $('btn-zoomin').addEventListener('click', function () { FB.map.zoomIn(); });
    $('btn-zoomout').addEventListener('click', function () { FB.map.zoomOut(); });
    $('btn-home').addEventListener('click', function () {
      if (!FB.state) return;
      if (FB.game.observe) FB.map.fitView(); // no home — show the whole board
      else FB.map.centerOn(FB.state.player.provinceId, 2.2);
    });
    $('btn-mapmode').addEventListener('click', UI.cycleMapMode);
    FB.map.onTap = function (pr, wx, wy) {
      if (FB.game.pickMode) { FB.game.pickProvince(pr); return; }
      const s = FB.state;
      // armies first: select your host, or march the selected host somewhere
      if (s && FB.armyTap && FB.armyTap(s, pr, wx, wy)) return;
      if (pr) UI.selectProvince(pr.id);
    };
    // click any character row → their sheet; any trait chip → its meaning;
    // item chips open the item card (a toast while an event holds the stage);
    // a liege link opens the liege's sheet
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      const lnk = e.target.closest('[data-liege]');
      if (lnk && FB.state && !UI.eventsBusy()) { UI.showLiegeModal(lnk.getAttribute('data-liege')); return; }
      const chip = e.target.closest('.traitchip[data-trait], .traitchip[data-ailment]');
      if (chip) {
        if (chip.hasAttribute('data-ailment')) UI.showAilmentModal(chip.getAttribute('data-ailment'));
        else UI.showTraitModal(chip.getAttribute('data-trait'));
        return;
      }
      const ichip = e.target.closest('.traitchip[data-item], .traitchip[data-itemview]');
      if (ichip && FB.state) {
        const iid = ichip.getAttribute('data-item') || ichip.getAttribute('data-itemview');
        const d = FBDATA.items[iid];
        if (d && UI.eventsBusy()) {
          UI.toastMessage(null, d.icon + ' ' + dt(FB.state, 'item', iid, d, 'name') + ' — ' +
            dt(FB.state, 'item', iid, d, 'desc'));
        } else if (d) {
          UI.showItemModal(iid, !ichip.hasAttribute('data-item'));
        }
        return;
      }
      const row = e.target.closest('.charrow[data-cid], .charcard[data-cid], .ftchip[data-cid]');
      if (row && FB.state && !UI.eventsBusy()) UI.showCharModal(row.getAttribute('data-cid'));
    });
    // clicking the dark backdrop closes a dismissable dialog
    $('genmodal').addEventListener('click', function (e) {
      if (e.target === this && UI._gmDismiss) UI.closeModal();
    });
    // instant hover tooltip for trait and item chips (desktop)
    if (!FB.isTouch) {
      const tip = document.createElement('div');
      tip.id = 'tooltip';
      tip.className = 'hidden';
      document.body.appendChild(tip);
      document.addEventListener('mouseover', function (e) {
        const chip = e.target && e.target.closest ?
          e.target.closest('.traitchip[data-trait], .traitchip[data-ailment], .traitchip[data-item], .traitchip[data-itemview]') : null;
        if (!chip) { tip.classList.add('hidden'); return; }
        if (chip.hasAttribute('data-ailment')) {
          const a = FBDATA.ailments[chip.getAttribute('data-ailment')];
          const aid = chip.getAttribute('data-ailment');
          tip.innerHTML = a ? '<b>' + a.icon + ' ' + esc(dt(FB.state, 'ailment', aid, a, 'name')) +
            '</b><br>' + esc(dt(FB.state, 'ailment', aid, a, 'desc')) :
            '<b>🤒 ' + esc(FB.T('Ill')) + '</b><br>' + esc(FB.T('Sickness has taken hold.'));
        } else if (chip.hasAttribute('data-trait')) {
          const t = FBDATA.traits[chip.getAttribute('data-trait')];
          if (!t) return;
          const fx = traitFxText(t);
          const tid = chip.getAttribute('data-trait');
          tip.innerHTML = '<b>' + t.icon + ' ' + esc(dt(FB.state, 'trait', tid, t, 'name')) +
            '</b><br>' + esc(dt(FB.state, 'trait', tid, t, 'desc')) +
            (fx ? '<br><i>' + esc(fx) + '</i>' : '');
        } else {
          const d = FBDATA.items[chip.getAttribute('data-item') || chip.getAttribute('data-itemview')];
          if (!d || !FB.state) return;
          const ifx = itemFxText(d);
          const iid = chip.getAttribute('data-item') || chip.getAttribute('data-itemview');
          tip.innerHTML = '<b>' + d.icon + ' ' + esc(dt(FB.state, 'item', iid, d, 'name')) + '</b> · ' +
            esc(rarityName(d.rarity)) + '<br>' + esc(dt(FB.state, 'item', iid, d, 'desc')) +
            (ifx ? '<br><i>' + esc(ifx) + '</i>' : '') +
            '<br><i>' + esc(FB.T('worth ~{gold} gold', { gold: d.value })) + '</i>';
        }
        tip.classList.remove('hidden');
        const r = chip.getBoundingClientRect();
        tip.style.left = Math.max(4, Math.min(window.innerWidth - 250, r.left)) + 'px';
        tip.style.top = Math.min(window.innerHeight - 110, r.bottom + 6) + 'px';
      });
    }
  };

  function traitFxText(t) {
    const parts = [];
    for (const k of FB.SKILLS) if (t[k]) parts.push(FB.T('{amount} {skill}', {
      amount: (t[k] > 0 ? '+' : '') + t[k], skill: FB.skillName(k)
    }));
    if (t.opinion) parts.push(FB.T('regard {amount}',
      { amount: (t.opinion > 0 ? '+' : '') + t.opinion }));
    if (t.health) parts.push(FB.T(t.health > 0 ? 'hardier' : 'frailer'));
    if (t.fert && t.fert !== 1) {
      parts.push(FB.T(t.fert > 1 ? 'more fertile' : 'less fertile'));
    }
    return parts.join(' · ');
  }
})();
