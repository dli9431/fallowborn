/* Fallowborn — UI: screens, panels, modals, event display */
window.FB = window.FB || {};

(function () {
  'use strict';

  const UI = {};
  FB.ui = UI;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return FB.esc(s); }

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
    FB.map.resize();
    FB.map.request();
  };

  /* ================= toasts (tap one to dismiss it) ================= */
  UI.toast = function (text) {
    const box = $('toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    el.title = 'Dismiss';
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
    FB.map.select(FB.map.selected); // realm highlight tracks conquests
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
    const dd = (s.date.day < 10 ? ' ' : '') + s.date.day; // fixed 2-char day
    const dateStr = FB.SEASONS[s.date.season] + ' ' + dd + ' · ' + s.date.year + ' AD';
    const net = s.seasonNet || {};
    $('tb-gold').innerHTML = '💰 <span class="mono">' + Math.floor(s.player.gold) + '</span>' + netBadge(net.gold);
    $('tb-prestige').innerHTML = '⭐ <span class="mono">' + Math.floor(s.player.prestige) + '</span>' + netBadge(net.prestige);
    $('tb-piety').innerHTML = FB.religionOf(me.religion).icon + ' <span class="mono">' + Math.floor(s.player.piety) + '</span>' + netBadge(net.piety);
    $('tb-health').innerHTML = '❤️ <span class="mono">' + Math.round(me.health) + '</span>';
    $('tb-date').innerHTML = '<span class="mono">' + dateStr + '</span>';
    const kh = FB.isTouch ? '' : '<span class="keyhint">Space</span> ';
    $('btn-endturn').innerHTML = kh + '<span class="pp">' + (FB.game.paused ? '▶ Play' : '❚❚ Pause') +
      '</span><span class="mono">' + FB.SEASONS[s.date.season] + ' ' + dd + '</span>';
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
    if (activeLeftTab === 'char') renderChar(); else renderFamily();
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
      const men = Math.round(Math.max(40, FB.playerLevy(s)) * (w.strength || 1) + (w.mercCos || 0) * 150);
      h += '<div class="progressnote warnote">⚔ <b>At war</b> with ' + esc(en ? en.name : '?') +
        ' — victories ' + w.wins + ', defeats ' + w.losses +
        ' · host ~' + men + ' men (' + Math.round((w.strength || 1) * 100) + '%)' +
        ((w.mercCos || 0) ? ' · ' + w.mercCos + ' merc. co.' : '') +
        (!w.defending && w.target && FB.world.byId[w.target]
          ? ' · siege of ' + esc(FB.world.byId[w.target].name) + ' ' + (w.siege || 0) + '/3' : '') +
        (w.defending ? ' · enemy advance ' + (w.enemySiege || 0) + '/3' : '') +
        ' · battle odds ~' + Math.round(FB.namedChance(s, 'war_battle') * 100) + '%</div>';
    }
    const hl = FB.holdingList(s);
    if (hl.length) {
      const hg = FB.holdingBonus(s, 'gold');
      h += '<div class="progressnote">🏠 ' + hl.map(function (id) {
        const d = FBDATA.holdings[id];
        return d ? d.icon : '?';
      }).join('') + (hg ? ' · +' + (Math.round(hg * 10) / 10) + ' gold/season' : '') + '</div>';
    }
    if (s.player.tier >= 3) {
      h += '<div class="progressnote">💰 Seasonal revenue ~' + FB.playerTax(s) + ' gold · 🛡 levy ~' + FB.playerLevy(s) + ' men' +
        (s.player.liege && s.realms[s.player.liege] ? ' · vassal of ' + esc(s.realms[s.player.liege].name) : ' · independent') + '</div>';
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
      h += '<div class="progressnote">📜 Scholarship ' + Math.floor(s.player.research || 0) +
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
    fh.textContent = 'Focus — pursued every day until changed';
    box.appendChild(fh);
    for (const f of FB.listFocuses(s)) {
      const cur = s.player.focus === f.id;
      const btn = document.createElement('button');
      btn.className = 'actionbtn' + (cur ? ' focused' : '');
      btn.innerHTML = hintFor(n) +
        (cur ? '◉ ' : '○ ') + esc(FB.fmt(s, f.label, {})) +
        '<span class="adesc">' + esc(f.desc(s)) + '</span>';
      (function (id) {
        btn.addEventListener('click', function () { FB.setFocus(FB.state, id); });
      })(f.id);
      box.appendChild(btn);
      n++;
    }

    const ih = document.createElement('div');
    ih.className = 'panelh';
    ih.textContent = 'Deeds — done at once (each spends the day)';
    box.appendChild(ih);
    for (const item of FB.listInstants(s)) {
      const btn = document.createElement('button');
      btn.className = 'actionbtn';
      btn.disabled = !item.can;
      const label = FB.fmt(s, item.a.label, {});
      btn.innerHTML = hintFor(n) +
        esc(label) + '<span class="adesc">' +
        esc(item.can ? item.a.desc(s) : item.reason) + '</span>';
      (function (id) {
        btn.addEventListener('click', function () { FB.runInstant(FB.state, id); });
      })(item.a.id);
      box.appendChild(btn);
      n++;
    }
  }

  function nextStepHint(s) {
    const tips = {
      0: 'Path: save ' + FBDATA.balance.freedomCost + ' gold (or win your lord’s favor) to buy freedom.',
      1: 'Path: prosper, buy land, and a manor (' + FBDATA.balance.manorCost + ' gold + ' + FBDATA.balance.manorPrestige + ' prestige) to join the gentry. Soldiering and the church offer other roads.',
      2: 'Path: serve your lord, win renown (120+ prestige, lord’s favor 40+), and petition for a barony.',
      3: 'Path: petition your liege for a county — or declare independence and take one.',
      4: 'Path: hold the majority of a de jure duchy (petition, inherit, or conquer) to be styled duke.',
      5: 'Path: hold the majority of a de jure kingdom and win independence to be crowned king.',
      6: 'Path: hold the majority of two kingdoms of one empire to be crowned emperor.',
      7: 'You stand at the summit of the world.'
    };
    return '<div class="progressnote">🧭 ' + esc(tips[s.player.tier] || '') + '</div>';
  }

  function skillBars(c) {
    let h = '';
    const soft = FBDATA.balance.skillSoftCap || 20;
    for (const k of FB.SKILLS) {
      const v = FB.skillOf(c, k);
      // the bar fills to the soft cap; past it the number keeps climbing and
      // the bar turns bright to mark mastery beyond the old ceiling
      h += '<div class="skillrow"><span style="width:86px">' + FB.SKILL_NAMES[k] + '</span>' +
        '<span class="bar"><i' + (v > soft ? ' class="over"' : '') + ' style="width:' +
        Math.min(100, v / soft * 100) + '%"></i></span><span class="num">' + v + '</span></div>';
    }
    return h;
  }
  function traitChips(c) {
    let h = '';
    for (const t of c.traits) {
      const tr = FBDATA.traits[t];
      if (tr) h += '<span class="traitchip" data-trait="' + t + '">' + tr.icon + ' ' + esc(tr.name) + '</span>';
    }
    return h || '<span class="cmeta">No notable traits.</span>';
  }

  /* the 🎓 upbringing summary line, shared by the Self tab and character sheets */
  function upbringingNote(s, c) {
    const focusName = (c.edu && c.edu.focus) ? FB.SKILL_NAMES[c.edu.focus] : 'none chosen';
    let tutorName = 'no tutor';
    if (c.edu && c.edu.tutorId === 'self') tutorName = 'you yourself';
    else if (c.edu && c.edu.tutorId && s.chars[c.edu.tutorId] && !s.chars[c.edu.tutorId].dead) {
      tutorName = s.chars[c.edu.tutorId].name;
    }
    return '<div class="progressnote">🎓 Upbringing — focus: <b>' + esc(focusName) + '</b> · tutor: <b>' + esc(tutorName) + '</b>' +
      (FB.ageOf(c, s.date.year) < 6 ? ' <span class="cmeta">(lessons begin at age 6)</span>' : '') + '</div>';
  }

  function itemChips(s) {
    const ids = FB.itemList(s);
    if (!ids.length) return '<span class="cmeta">Nothing of note.</span>';
    let h = '';
    for (const id of ids) {
      const it = FBDATA.items[id];
      if (it) {
        h += '<span class="traitchip" data-item="' + esc(id) + '">' +
          it.icon + ' ' + esc(FB.fmt(s, it.name, {})) + '</span>';
      }
    }
    return h + '<div class="cmeta" style="font-size:12px;margin-top:2px">Tap a treasure to see its powers — or to sell or gift it.</div>';
  }

  /* the player's held titles (tier 3+): high dignities as rows, counties compact */
  function titleRows(s) {
    const t = FB.playerTitles(s);
    if (!t.high.length && !t.counties.length) return '';
    let h = '<div class="panelh">Titles</div>';
    for (const e of t.high) h += '<div class="kv"><span>' + esc(e.d) + '</span><b>' + esc(e.t) + '</b></div>';
    if (t.counties.length) {
      const names = [];
      for (const pid of t.counties) {
        const pr = FB.world.byId[pid];
        if (pr) names.push(pr.name);
      }
      h += '<div class="kv"><span>Counties (' + t.counties.length + ')</span><b>' + esc(names.join(' · ')) + '</b></div>';
    }
    return h;
  }

  function renderChar() {
    const s = FB.state, me = s.chars[s.player.charId];
    const rel = FB.religionOf(me.religion), cul = FB.cultureOf(me.culture);
    let h =
      '<canvas id="selfportrait" class="pface" data-cid="' + me.id + '" width="72" height="82"></canvas>' +
      '<div class="panelh">' + esc(FB.fullName(me)) + '</div>' +
      '<div class="kv"><span>Rank</span><b>' + esc(FB.styledTitle(s)) + '</b></div>' +
      '<div class="kv"><span>Age</span><b>' + FB.ageOf(me, s.date.year) + '</b></div>' +
      '<div class="kv"><span>Culture</span><b>' + esc(cul.name) + '</b></div>' +
      '<div class="kv"><span>Faith</span><b>' + rel.icon + ' ' + esc(rel.name) + '</b></div>' +
      '<div class="kv"><span>Health</span><b>' + Math.round(me.health) + ' / 10</b></div>' +
      '<div class="kv"><span>Reputation among the folk</span><b>' + Math.round(s.player.pop) + '</b></div>' +
      (s.player.liege ? '<div class="kv"><span>Liege’s favor</span><b>' + Math.round(s.player.liegeOp || 0) + '</b></div>' : '') +
      titleRows(s) +
      '<div class="panelh">Skills</div>' + skillBars(me) +
      '<div class="panelh">Traits</div>' + traitChips(me) +
      '<div class="panelh">Possessions</div>' + itemChips(s) +
      '<div class="panelh">Dynasty</div>' +
      '<div class="kv"><span>House</span><b>' + esc(me.dyn || '—') + '</b></div>' +
      '<div class="kv"><span>Generation</span><b>' + (s.generation || 1) + '</b></div>';
    if (FB.ageOf(me, s.date.year) < 16) {
      h += '<div class="panelh">Upbringing</div>' + upbringingNote(s, me) +
        '<button class="actionbtn" id="self-edufocus">🎓 Choose your education focus…' +
        '<span class="adesc">Direct your formative years toward one art.</span></button>' +
        '<button class="actionbtn" id="self-tutor">🧑‍🏫 Choose a tutor…' +
        '<span class="adesc">A skilled teacher shapes you faster — and leaves their mark.</span></button>';
    }
    $('tab-char').innerHTML = h;
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
        sk += '<span title="' + FB.SKILL_NAMES[k] + '">' + FB.SKILL_ICONS[k] + FB.skillOf(c, k) + '</span> ';
      }
      mid += '<br><span class="cmeta">' + sk.trim() + '</span>';
    }
    return '<div class="charrow" data-cid="' + c.id + '" title="See their sheet and your dealings with them">' + FB.faceTag(c, 36, 42) +
      '<span>' + mid + '</span>' +
      '<span class="cop ' + FB.opClass(op) + '">' + (op > 0 ? '+' : '') + op + '</span></div>';
  }

  function relationText(s, c) {
    const me = s.chars[s.player.charId];
    if (c.id === me.spouseId) return 'Your spouse';
    if (me.fatherId === c.id) return 'Your father';
    if (me.motherId === c.id) return 'Your mother';
    if (me.childrenIds.indexOf(c.id) >= 0) return 'Your child';
    if ((c.role === 'sibling' && c.dyn === me.dyn) ||
      (me.fatherId && me.fatherId === c.fatherId) ||
      (me.motherId && me.motherId === c.motherId)) return 'Your sibling';
    if (s.player.courtingId === c.id) return 'Courting';
    if (s.roles.lord === c.id) return 'Your lord';
    if (s.roles.priest === c.id) return 'Your ' + FB.holyWord(me.religion);
    if (s.roles.friend === c.id) return 'Your friend';
    if (s.roles.rival === c.id) return 'Your rival';
    return null;
  }
  function maritalText(s, c) {
    return FB.spouseOf(s, c) ? 'Married' : 'Unwed';
  }

  /* why the marriage path is closed for this character (null = no note needed) */
  function courtBlockReason(s, c) {
    const me = s.chars[s.player.charId];
    const y = s.date.year;
    if (c.id === me.spouseId || c.spouseId === me.id) return 'they are already your wedded ' + (c.sex === 'f' ? 'wife' : 'husband') + '.';
    if (me.childrenIds.indexOf(c.id) >= 0 || (c.childrenIds && c.childrenIds.indexOf(me.id) >= 0) ||
      (me.fatherId && me.fatherId === c.fatherId) || (me.motherId && me.motherId === c.motherId) ||
      (c.role === 'sibling' && c.dyn === me.dyn)) return 'they are too close in blood.';
    const krel = FB.kinOf(s).byId[c.id];
    if (krel && krel !== 'Cousin') return 'they are too close in blood.';
    if (c.sex === me.sex) return null;
    if (FB.ageOf(c, y) < 16) return 'they are not yet of age.';
    if (FB.ageOf(me, y) < 16) return 'you are not yet of age.';
    const mySp = FB.spouseOf(s, me);
    if (mySp && !FB.canWed(s)) {
      return me.sex === 'm' && FB.marriageDoctrine(me.religion).wives > 1 ?
        'your faith permits no more wives.' : 'you are already wed to ' + mySp.name + '.';
    }
    if (FB.spouseOf(s, c)) return 'they are wed to another.';
    if (c.betrothedId) return 'they are pledged to another.';
    if (FB.stationOf(c) - FB.playerStation(s) >= 3) return 'they stand far above your station.';
    if (s.player.profession === 'monk' && FB.religionOf(me.religion).group !== 'muslim') return 'your vows forbid it.';
    return null;
  }

  UI.charCardHtml = function (s, c, clickable) {
    const rel = FB.religionOf(c.religion), cul = FB.cultureOf(c.culture);
    let sk = '';
    for (const k of FB.SKILLS) sk += FB.SKILL_NAMES[k] + ' ' + FB.skillOf(c, k) + ' · ';
    sk = sk.slice(0, -3);
    let tr = '';
    for (const t of c.traits) {
      const td = FBDATA.traits[t];
      if (td) tr += '<span class="traitchip" data-trait="' + t + '">' + td.icon + ' ' + esc(td.name) + '</span>';
    }
    // treasures the player has gifted them, worn where callers can see
    let itc = '';
    if (c.items && c.items.length && c.id !== s.player.charId) {
      for (const iid of c.items) {
        const idf = FBDATA.items[iid];
        if (idf) itc += '<span class="traitchip" data-itemview="' + esc(iid) + '">' + idf.icon + ' ' + esc(FB.fmt(s, idf.name, {})) + '</span>';
      }
    }
    const op = Math.round(c.opinion);
    // fertility as the conception roll sees it: the character's own hidden
    // roll times trait leanings (lustful, comely, strong up; chaste, sickly
    // down) times the slow slide of age (FB.ageFert) — 100% is the human
    // norm in one's prime; women past 45 cannot conceive
    let fert = '';
    const cage = FB.ageOf(c, s.date.year);
    if (cage >= 16) {
      fert = (c.sex === 'f' && cage > 45) ? ' · 🌱 past childbearing'
        : ' · 🌱 fertility ' + Math.round((c.fertility || 1) * FB.traitAgg(c).fert * FB.ageFert(c.sex, cage) * 100) + '%';
    }
    return '<div class="charcard"' + (clickable ? ' data-cid="' + c.id + '" title="Open their sheet and your dealings with them"' : '') + '>' + FB.faceTag(c, 56, 64) +
      '<div><div class="ccname">' + esc(FB.fullName(c)) + '</div>' +
      '<div class="ccmeta">' + (c.epithet ? esc(c.epithet) + ' · ' : '') +
      (c.sex === 'f' ? 'Woman' : 'Man') + ' of ' + FB.ageOf(c, s.date.year) +
      (c.station !== undefined && c.station !== null ? ' · ' + FB.STATION_NAMES[FB.stationOf(c)] : '') +
      ' · ' + esc(cul.name) + ' · ' + rel.icon + ' ' + esc(rel.name) + '</div>' +
      '<div class="ccmeta">' + (c.id === s.player.charId ? 'This is you' :
        ((relationText(s, c) ? esc(relationText(s, c)) + ' · ' : '') + maritalText(s, c) +
        ' · regard <span class="' + FB.opClass(op) + '">' + (op > 0 ? '+' : '') + op + '</span>')) + fert + '</div>' +
      '<div class="ccskills">' + esc(sk) + '</div>' +
      '<div>' + (tr || '<span class="cmeta">No notable traits.</span>') + '</div>' +
      (itc ? '<div>' + itc + '</div>' : '') + '</div></div>';
  };

  function renderFamily() {
    const s = FB.state, me = s.chars[s.player.charId];
    const kin = FB.kinOf(s);
    let h = '<button class="btn small" id="btn-ftree" style="width:100%" ' +
      'title="See the whole family drawn as a tree">🌳 See the family tree</button>';
    const sps = FB.spousesOf(s, me);
    h += '<div class="panelh">' + (sps.length > 1 ? 'Wives' : 'Spouse') + '</div>';
    if (sps.length) {
      for (const sp of sps) h += charRow(s, sp, 'Age ' + FB.ageOf(sp, s.date.year));
    } else h += '<div class="cmeta" style="font-size:13px">Unwed. A dynasty needs heirs — seek a match.</div>';
    const su = s.player.courtingId ? s.chars[s.player.courtingId] : null;
    if (su) {
      h += '<div class="panelh">Courting</div>' + UI.charCardHtml(s, su, true);
      h += '<div class="hint" style="margin:2px 0 0">Tap them to court, propose, or break it off.</div>';
    }
    h += '<div class="panelh">Children</div>';
    const kids = me.childrenIds.map(function (id) { return s.chars[id]; })
      .filter(function (c) { return c && !c.dead; });
    if (kids.length) {
      for (const k of kids) {
        const a = FB.ageOf(k, s.date.year);
        let meta = (k.sex === 'm' ? 'Son' : 'Daughter') + ' · age ' + a;
        if (a < 16 && k.edu && k.edu.focus) meta += ' · 🎓 ' + FB.SKILL_NAMES[k.edu.focus];
        if (k.betrothedId && s.chars[k.betrothedId] && !s.chars[k.betrothedId].dead) meta += ' · 🤝 betrothed';
        h += charRow(s, k, meta);
      }
      h += '<div class="hint" style="margin:2px 0 0">Tap a child to set their education focus and tutor.</div>';
    } else h += '<div class="cmeta" style="font-size:13px">No living children. Without an heir, your story ends with you.</div>';
    // the wider family tree — dead kin are shown with †
    function kinSection(title, entries) {
      if (!entries.length) return;
      h += '<div class="panelh">' + title + '</div>';
      for (const e of entries) {
        h += charRow(s, e.c, e.rel + (e.c.dead ? ' · †' : ' · age ' + FB.ageOf(e.c, s.date.year)));
      }
    }
    kinSection('Grandchildren', kin.grandchildren);
    kinSection('Parents', kin.parents);
    kinSection('Grandparents', kin.grandparents);
    kinSection('Siblings', kin.siblings);
    kinSection('Nieces & nephews', kin.niecesNephews);
    kinSection('Uncles & aunts', kin.unclesAunts);
    kinSection('Cousins', kin.cousins);
    h += '<div class="panelh">Notable folk</div>';
    for (const role of ['lord', 'priest', 'friend', 'rival']) {
      const c = FB.getRole(s, role, false);
      if (c && !c.dead) {
        h += charRow(s, c, role.charAt(0).toUpperCase() + role.slice(1) + ' · age ' + FB.ageOf(c, s.date.year), true);
      }
    }
    $('tab-family').innerHTML = h;
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
      const label = rel || byId[c.id] || '';
      const meta = c.dead ? '†' : 'age ' + FB.ageOf(c, s.date.year);
      const again = cls && cls.indexOf('dup') >= 0;
      return '<button class="ftchip' + (cls || '') + (c.dead ? ' dead' : '') +
        '" data-cid="' + c.id + '" title="' + esc(FB.fullName(c)) +
        (label ? ' — ' + esc(label) : '') + '">' + FB.faceTag(c, 40, 46) +
        '<span class="fname">' + esc(c.name) + '</span>' +
        '<span class="frel">' + esc(label ? label + ' · ' + meta : meta) + '</span>' +
        (again ? '<span class="frel">also above</span>' : '') + '</button>';
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

    let h = '<div class="cmeta" style="font-size:13px">Blood lines run downward — each brood hangs ' +
      'beneath its parents. † marks the dead. ' + (FB.isTouch ? 'Tap' : 'Click') +
      ' a face to open their sheet.</div>';
    const root = topOf(me, 2);
    h += '<div class="ftwrap"><div class="fttree">';
    if (root.id === me.id && !FB.parentsOf(s, me).length && FB.siblingsOf(s, me).length) {
      // old saves: gen-1 siblings recorded by role, parents never named
      let brood = unit(me, 1);
      for (const sb of FB.siblingsOf(s, me)) brood += unit(sb, 1);
      h += '<div class="ftnode"><div class="ftcouple"><div class="ftchip ghost">' +
        '<span class="fname">Unrecorded</span><span class="frel">your parents</span></div></div>' +
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
        h += '<div class="panelh">Your mother’s kin</div>' +
          '<div class="ftwrap"><div class="fttree">' + unit(mroot, 0) + '</div></div>';
      }
    }
    h += '<button class="btn" id="gm-cancel" style="margin-top:10px">Close</button>';
    openModal('The Family Tree', h);
    $('gm-cancel').addEventListener('click', UI.closeModal);
    FB.paintFaces($('gm-body'), s);
  };

  let selectedProv = null;
  UI.selectProvince = function (pid) {
    selectedProv = pid;
    FB.map.select(pid);
    activeTab = 'prov';
    setTab('prov');
  };

  function renderProv() {
    const s = FB.state;
    const pid = selectedProv || s.player.provinceId;
    const pr = FB.world.byId[pid];
    if (!pr) { $('tab-prov').innerHTML = ''; return; }
    let h = '<div class="panelh">' + esc(pr.name) + (pid === s.player.provinceId ? ' ⚑ (home)' : '') + '</div>';
    if (pr.wasteland) {
      h += '<div class="cmeta">Trackless ' + esc(pr.terrain) + '. No lord rules here.</div>';
    } else {
      const rid = s.owner[pid];
      const realm = s.realms[rid];
      const rel = FB.religionOf(pr.religion), cul = FB.cultureOf(pr.culture);
      const B = FBDATA.balance;
      const myRealm = rid === 'player';
      const realmMen = realm ? (myRealm ? FB.playerLevy(s) : Math.round(FB.realmStrength(s, rid) * B.levyPerDev * 0.3)) : 0;
      // the feudal ladder: who holds this county directly, and above them whom
      const holdId = (s.holder && s.holder[pid]) || rid;
      let chain;
      if (holdId === 'player') chain = ['player'].concat(s.player.liege ? FB.liegeChain(s, s.player.liege) : []);
      else chain = FB.liegeChain(s, holdId);
      h += '<div class="kv"><span>County</span><b>' + esc(pr.name) + '</b></div>';
      for (const cid of chain) {
        if (cid === 'player') {
          h += '<div class="kv"><span>' + esc(FB.styledTitle(s)) + '</span><b>You — held in your own hand</b></div>';
          continue;
        }
        const cr = s.realms[cid];
        if (!cr) continue;
        let mark = '';
        if (cid === s.player.liege) mark = ' — your liege';
        else if (cr.liege === 'player') mark = ' — your vassal';
        h += '<div class="kv"><span>' + esc(FB.realmRankTitle(s, cr)) + ' ' + esc(cr.ruler.name) +
          '</span><b>' + esc(cr.name) + mark + '</b></div>';
      }
      const dj = FB.dejureOf(pid);
      if (dj.duchy) {
        const parts = [FBDATA.duchies[dj.duchy].name];
        if (dj.kingdom) parts.push(FBDATA.kingdoms[dj.kingdom].name);
        if (dj.empire) parts.push(FBDATA.empires[dj.empire].name);
        h += '<div class="kv"><span>De jure</span><b>' + esc(parts.join(' › ')) + '</b></div>';
      }
      h +=
        (realm ? '<div class="kv"><span>Sovereign</span><b>' + esc(realm.name) + '</b></div>' : '') +
        (realm ? '<div class="kv"><span>Realm size</span><b>' + FB.realmProvinces(s, rid).length + ' counties</b></div>' : '') +
        (realm ? '<div class="kv"><span>Realm host</span><b>~' + realmMen + ' men</b></div>' : '') +
        '<div class="kv"><span>Culture</span><b>' + esc(cul.name) + '</b></div>' +
        '<div class="kv"><span>Faith</span><b>' + rel.icon + ' ' + esc(rel.name) + '</b></div>' +
        '<div class="kv"><span>Terrain</span><b>' + esc(pr.terrain) + (pr.coastal ? ', coastal' : '') + '</b></div>' +
        '<div class="kv"><span>Development</span><b>' + (s.dev[pid] || 1) + ' / ' + FB.devCap(s, pid) + '</b></div>' +
        '<div class="kv"><span>Province levy</span><b>~' + (s.dev[pid] || 1) * B.levyPerDev + ' men</b></div>';
      const setts = FB.settlementsOf(s, pid);
      if (setts.length) {
        h += '<div class="kv"><span>Settlements</span><b>' + setts.map(function (st) {
          return (st.kind === 'city' ? '🏙' : st.kind === 'town' ? '🏘' : '🏡') + ' ' + esc(st.name);
        }).join(' · ') + '</b></div>';
      }
      if (s.player.provs && s.player.provs.indexOf(pid) >= 0) {
        h += '<div class="progressnote">🏰 You hold this province.</div>';
      }
      if (realm && !myRealm && s.player.tier >= 3) {
        h += '<div class="progressnote">🛡 They can field ~' + realmMen + ' men — you can field ~' + FB.playerLevy(s) + '.</div>';
      }
      if (realm && FB.isRealmAtWar(s, rid)) h += '<div class="progressnote warnote">⚔ This realm is at war.</div>';
      if (realm && s.pacts && s.pacts[rid] > s.turn) {
        h += '<div class="progressnote">🕊 A pact of peace holds until ' +
          (FBDATA.balance.startYear + Math.floor(s.pacts[rid] / 360)) + ' AD.</div>';
      }
      h += '<div class="panelh">Notable folk</div>';
      const nb = FB.provNotables(s, pid);
      if (nb.length) {
        for (const c of nb) {
          let meta = c.epithet || (c.role ? c.role.charAt(0).toUpperCase() + c.role.slice(1) : '');
          meta = (meta ? meta + ' · ' : '') + 'age ' + FB.ageOf(c, s.date.year);
          h += charRow(s, c, meta, true);
        }
        h += '<div class="hint" style="margin:4px 0 0">Tap a person for their sheet — and your dealings with them.</div>';
      } else {
        h += '<div class="cmeta" style="font-size:13px">No one of note.</div>';
      }
    }
    h += '<div style="margin-top:10px"><button class="btn small" id="btn-center-home">⌂ Center on home</button></div>';
    $('tab-prov').innerHTML = h;
    FB.paintFaces($('tab-prov'), s);
    const b = $('btn-center-home');
    if (b) b.addEventListener('click', function () { FB.map.centerOn(FB.state.player.provinceId, 2.2); });
  }

  function renderLog() {
    const s = FB.state;
    let h = '<div class="panelh">Chronicle of ' + esc(s.chars[s.player.charId].dyn || 'your line') + '</div>';
    for (let i = s.log.length - 1; i >= 0 && i > s.log.length - 80; i--) {
      const e = s.log[i];
      h += '<div class="logentry"><span class="ldate">' + FB.SEASONS[e.s] +
        (e.d ? ' ' + e.d : '') + ', ' + e.y + '</span><br>' + esc(e.t) + '</div>';
    }
    $('tab-log').innerHTML = h;
  }

  function setTab(name) {
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
    const order = ['actions', 'prov', 'log'];
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

  function autoWants(ev, item) {
    const a = FB.game.auto;
    if (!a || !a.on) return false;
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
    let outcome = '';
    if (pick.chance !== undefined) {
      const p = typeof pick.chance === 'string' ? FB.namedChance(s, pick.chance) : pick.chance;
      const ok = FB.chance(p);
      if (pick.chance === 'battle' || pick.chance === 'war_battle') delete s.player.flags.blessed_war;
      if (pick.effects) FB.applyEffects(s, pick.effects, ctx);
      const branch = ok ? pick.success : pick.failure;
      if (branch) {
        if (branch.effects) FB.applyEffects(s, branch.effects, ctx);
        outcome = branch.text ? FB.fmt(s, branch.text, ctx) : (ok ? 'It goes well.' : 'It goes poorly.');
      }
    } else if (pick.effects) {
      FB.applyEffects(s, pick.effects, ctx);
    }
    FB.news(s, '⚙ ' + FB.fmt(s, ev.title, ctx) + ': ' + FB.fmt(s, pick.label, ctx) +
      (outcome ? ' — ' + outcome : ''));
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
    let h = '<div class="gm-body-text"><p>While the days flow (or fast-forward), the chosen kinds of ' +
      'events resolve themselves. Every outcome is written to the Chronicle.</p></div>';
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

  function showEvent(ev, ctx) {
    const s = FB.state;
    eventOpen = true;
    FB.markFired(s, ev);
    $('eventmodal').classList.remove('hidden');
    $('ev-title').textContent = FB.fmt(s, ev.title, ctx);
    let bodyHtml = esc(FB.fmt(s, ev.text, ctx));
    if (ev.charCard) {
      const cc = FB.getRole(s, ev.charCard, true);
      if (cc) bodyHtml += UI.charCardHtml(s, cc);
    }
    $('ev-text').innerHTML = bodyHtml;
    FB.paintFaces($('ev-text'), s);
    const box = $('ev-options');
    box.innerHTML = '';
    let opts = (ev.options || []).filter(function (o) {
      return !o.require || FB.checkTrigger(s, o.require);
    });
    if (!opts.length) opts = [{ label: 'So it goes.', effects: {} }];
    for (let i = 0; i < opts.length; i++) {
      const o = opts[i];
      const btn = document.createElement('button');
      btn.className = 'evopt';
      btn.innerHTML = hintFor(i) +
        esc(FB.fmt(s, o.label, ctx)) +
        (o.desc ? '<span class="odesc">' + esc(FB.fmt(s, o.desc, ctx)) + '</span>' : '');
      (function (opt) {
        btn.addEventListener('click', function () { chooseOption(ev, opt, ctx); });
      })(o);
      box.appendChild(btn);
    }
    setTimeout(function () {
      const b = box.querySelector('.evopt');
      if (b) b.focus();
    }, 0);
  }

  function chooseOption(ev, opt, ctx) {
    const s = FB.state;
    if (opt.chance !== undefined) {
      const p = typeof opt.chance === 'string' ? FB.namedChance(s, opt.chance) : opt.chance;
      const ok = FB.chance(p);
      // a blessed sword is spent on the battle it blesses, won or lost
      if (opt.chance === 'battle' || opt.chance === 'war_battle') delete s.player.flags.blessed_war;
      const branch = ok ? opt.success : opt.failure;
      if (opt.effects) FB.applyEffects(s, opt.effects, ctx);
      if (branch) {
        if (branch.effects) FB.applyEffects(s, branch.effects, ctx);
        showOutcome(branch.text ? FB.fmt(s, branch.text, ctx) : (ok ? 'It goes well.' : 'It goes poorly.'));
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
    btn.textContent = 'Continue';
    btn.addEventListener('click', nextEvent);
    box.appendChild(btn);
    btn.focus();
  }

  UI.eventsBusy = function () { return eventOpen; };

  /* ================= generic modal ================= */
  function openModal(title, bodyHtml, opts) {
    UI._gmDismiss = !(opts && opts.dismissable === false);
    $('genmodal').classList.remove('hidden');
    $('gm-title').textContent = title;
    $('gm-body').innerHTML = bodyHtml;
    if (!FB.isTouch) {
      const btns = $('gm-body').querySelectorAll('.actionbtn');
      for (let i = 0; i < btns.length && i < 18; i++) {
        btns[i].insertAdjacentHTML('afterbegin', hintFor(i));
      }
    }
    setTimeout(function () {
      const b = $('gm-body').querySelector('button, input, textarea');
      if (b) b.focus();
    }, 0);
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
      const enMen = Math.round(FB.realmStrength(s, rid) * FBDATA.balance.levyPerDev * 0.3);
      h += '<button class="actionbtn" data-war="' + esc(pid) + '">⚔ ' + esc(pr.name) +
        '<span class="adesc">Held by ' + esc(realm ? realm.name : '?') + ' (' +
        FB.realmProvinces(s, rid).length + ' provinces) · they can field ~' + enMen +
        ' against your ~' + FB.playerLevy(s) + ' men</span></button>';
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
          '<span class="adesc">development ' + (s.dev[id] || 1) + ' · ' + FB.builtIn(s, id).length + ' built · ' +
          (open ? open + ' possible' : 'nothing more to raise') + '</span></button>';
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
        b.def.icon + ' ' + esc(FB.fmt(s, b.def.name, {})) + ' — ' + b.cost + ' gold' +
        '<span class="adesc">' + esc(FB.fmt(s, b.def.desc, {})) + (short ? ' (not enough gold)' : '') + '</span></button>';
    }
    h += '</div>';
    if (done.length) {
      h += '<p class="hint">Already standing in ' + esc(pr.name) + ': ' + done.map(function (id) {
        const d = FBDATA.buildings[id];
        return d ? d.icon + ' ' + esc(FB.fmt(s, d.name, {})) : esc(id);
      }).join(' · ') + '</p>';
    }
    h += '<button class="btn" id="gm-cancel">' + (provs.length > 1 ? 'Back' : 'Not now') + '</button>';
    openModal('Raise a Building in ' + esc(pr.name), h);
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
        '<span class="adesc">' + st.kind + ' · a day’s outing</span></button>';
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
    let h = '<p class="hint">A plot claims your daily focus until it is ready to spring — ' +
      'and every day of weaving risks discovery.</p><div class="gm-list">';
    for (const t of FB.plotAvailable(s)) {
      h += '<button class="actionbtn" data-plot="' + esc(t.id) + '">' +
        t.def.icon + ' ' + esc(FB.fmt(s, t.def.name, {})) +
        '<span class="adesc">' + esc(FB.fmt(s, t.def.desc, {})) + ' (' + t.def.need + ' days’ weaving, roughly)</span></button>';
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
    let h = '<p class="hint">10 gold in gifts; a pact of peace holds two years, and your ' +
      'diplomacy carries the rest.</p><div class="gm-list">';
    for (const rid of FB.envoyTargets(s)) {
      const r = s.realms[rid];
      const men = Math.round(FB.realmStrength(s, rid) * FBDATA.balance.levyPerDev * 0.3);
      h += '<button class="actionbtn" data-envoy="' + esc(rid) + '">🕊 ' + esc(r.name) +
        '<span class="adesc">' + FB.realmProvinces(s, rid).length + ' provinces · fields ~' + men + ' men</span></button>';
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
      h += '<button class="actionbtn" data-rid="' + esc(rid) + '">🙇 ' + esc(FB.realmRankTitle(s, r)) + ' ' + esc(r.ruler.name) +
        '<span class="adesc">' + esc(r.name) + ' · opinion ' + FB.liegeOpOf(s, rid) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Pay Homage', h);
    document.querySelectorAll('[data-rid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.payHomage(FB.state, btn.dataset.rid);
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* appeal to a lord ABOVE your direct liege */
  UI.showAppeal = function () {
    const s = FB.state;
    const chain = FB.liegeChain(s, s.player.liege).slice(1);
    let h = '<p class="hint">Carry your suit past your own lord to a greater one. Success makes you HIS direct man — and an enemy of the man you passed over.</p><div class="gm-list">';
    for (const rid of chain) {
      const r = s.realms[rid];
      h += '<button class="actionbtn" data-rid="' + esc(rid) + '">⚖ ' + esc(FB.realmRankTitle(s, r)) + ' ' + esc(r.ruler.name) +
        '<span class="adesc">' + esc(r.name) + ' · opinion ' + FB.liegeOpOf(s, rid) + '</span></button>';
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
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* offer your lands to a neighboring sovereign */
  UI.showFealty = function () {
    const s = FB.state;
    let h = '<p class="hint">Kneel to a neighboring sovereign: your lands join his realm and he becomes your liege. If you already serve another, he may call it treason.</p><div class="gm-list">';
    for (const rid of FB.fealtyTargets(s)) {
      const r = s.realms[rid];
      const men = Math.round(FB.realmStrength(s, rid) * FBDATA.balance.levyPerDev * 0.3);
      h += '<button class="actionbtn" data-rid="' + esc(rid) + '">🤝 ' + esc(r.name) +
        '<span class="adesc">' + esc(FB.realmRankTitle(s, r)) + ' ' + esc(r.ruler.name) + ' · fields ~' + men + ' men</span></button>';
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

  /* give a demesne county to a sworn man */
  UI.showGrantCounty = function () {
    const s = FB.state;
    let h = '<p class="hint">A vassal holds the county in your name, pays taxes each season, and remembers the favor. You keep everything else.</p><div class="gm-list">';
    for (const pid of s.player.provs) {
      const pr = FB.world.byId[pid];
      h += '<button class="actionbtn" data-pid="' + esc(pid) + '">🏰 ' + esc(pr.name) +
        '<span class="adesc">dev ' + (s.dev[pid] || 1) + ' · ' + esc(pr.terrain) + '</span></button>';
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
        '<span class="adesc">' + esc(r.ruler.name) + ' · opinion ' + FB.liegeOpOf(s, vid) + '</span></button>';
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
    let h = '<p class="hint">Property passes to your heirs — a household built up over ' +
      'generations is its own kind of greatness.</p><div class="gm-list">';
    for (const t of FB.holdingAvailable(s)) {
      const short = s.player.gold < t.def.cost;
      h += '<button class="actionbtn" data-holding="' + esc(t.id) + '"' + (short ? ' disabled' : '') + '>' +
        t.def.icon + ' ' + esc(FB.fmt(s, t.def.name, {})) + ' — ' + t.def.cost + ' gold' +
        '<span class="adesc">' + esc(FB.fmt(s, t.def.desc, {})) + (short ? ' (not enough gold)' : '') + '</span></button>';
    }
    h += '</div>';
    const done = FB.holdingList(s);
    if (done.length) {
      h += '<p class="hint">The household owns: ' + done.map(function (id) {
        const d = FBDATA.holdings[id];
        return d ? d.icon + ' ' + esc(FB.fmt(s, d.name, {})) : esc(id);
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
    let h = '<p class="hint">Scholarship: <b>' + pts + '</b> — earned by patronizing scholars, libraries, ' +
      'and learned guests. Innovations persist across the generations.</p><div class="gm-list">';
    for (const t of FB.techAvailable(s)) {
      const short = pts < t.def.cost;
      h += '<button class="actionbtn" data-tech="' + esc(t.id) + '"' + (short ? ' disabled' : '') + '>' +
        t.def.icon + ' ' + esc(FB.fmt(s, t.def.name, {})) + ' — ' + t.def.cost + ' scholarship' +
        '<span class="adesc">' + esc(FB.fmt(s, t.def.desc, {})) + (short ? ' (not enough scholarship)' : '') + '</span></button>';
    }
    h += '</div>';
    const done = FB.techList(s);
    if (done.length) {
      h += '<p class="hint">Already adopted: ' + done.map(function (id) {
        const d = FBDATA.tech[id];
        return d ? d.icon + ' ' + esc(FB.fmt(s, d.name, {})) : esc(id);
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
    if (!c || c.dead) return;
    const me = s.chars[s.player.charId];
    let h = UI.charCardHtml(s, c);
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
              '>🕊 Pronounce the divorce (' + divCost + ' gold)' +
              '<span class="adesc">Spoken before witnesses — and the mahr owed to ' + esc(c.name) + ' is paid out. (spends the day)</span></button>';
          } else if (doc.divorce === 'get') {
            h += '<button class="actionbtn" id="cm-divorce"' + (s.player.gold < divCost ? ' disabled' : '') +
              '>📜 Grant a get (' + divCost + ' gold)' +
              '<span class="adesc">A writ written and witnessed; the ketubah owed to ' + esc(c.name) + ' is paid out. (spends the day)</span></button>';
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
        h += '<button class="actionbtn" id="cm-court">🌷 Begin courtship' + (switching ? ' (abandon your current suit)' : '') +
          '<span class="adesc">Pursue marriage with ' + esc(c.name) + ': court them daily, then propose.</span></button>';
        if (FB.stationOf(c) - FB.playerStation(s) > 0) {
          h += '<div class="progressnote">⚖ ' + esc(c.name) + ' stands above your station — the family will expect great regard and renown before they bless such a match.</div>';
        }
      } else if (s.player.courtingId === c.id) {
        if (Math.round(c.opinion) >= 5) {
          h += '<button class="actionbtn" id="cm-propose">💒 Propose marriage' +
            '<span class="adesc">Ask for their hand. Standing, wealth, and their regard decide.</span></button>';
        } else {
          h += '<div class="progressnote">🌷 You are courting ' + esc(c.name) +
            '. Win more of their regard (5+) before proposing — the courtship focus works day by day.</div>';
        }
        h += '<button class="actionbtn" id="cm-breakoff">💔 Break off the courtship' +
          '<span class="adesc">Part ways without a wedding.</span></button>';
      } else {
        const why = courtBlockReason(s, c);
        if (why) h += '<div class="progressnote">💒 No marriage possible: ' + esc(why) + '</div>';
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
      h += '<button class="actionbtn" id="cm-edufocus">🎓 Choose ' + (self ? 'your' : 'their') + ' education focus…' +
        '<span class="adesc">Direct ' + (self ? 'your' : 'their') + ' formative years toward one art.</span></button>';
      h += '<button class="actionbtn" id="cm-tutor">🧑‍🏫 ' + (self ? 'Choose a tutor…' : 'Appoint a tutor…') +
        '<span class="adesc">A skilled teacher shapes ' + (self ? 'you' : 'them') + ' faster — and leaves their mark.</span></button>';
    }
    // a parent may pledge an unwed child's hand from age twelve
    if (me.childrenIds.indexOf(c.id) >= 0 && !FB.spouseOf(s, c)) {
      const bt = c.betrothedId ? s.chars[c.betrothedId] : null;
      if (bt && !bt.dead) {
        h += '<div class="progressnote">🤝 Betrothed to ' + esc(bt.name) +
          ' — the wedding follows once both are of age.</div>';
      } else if (FB.ageOf(c, s.date.year) >= 12) {
        h += '<button class="actionbtn" id="cm-match">💍 Arrange a match…' +
          '<span class="adesc">Sound out families for ' + (c.sex === 'f' ? 'her' : 'his') +
          ' hand. A pledge binds; the wedding follows at sixteen. (sealing one spends the day)</span></button>';
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
          FB.news(s, '⚡ ' + c.name + ' now counts you an enemy.');
        }
      }
    }
    const bf = $('cm-befriend');
    if (bf) bf.addEventListener('click', function () {
      actThen(function () {
        c.opinion = FB.clamp(c.opinion + 4 + Math.floor(FB.skillOf(me, 'dip') / 3), -100, 100);
        FB.news(s, c.name + ' warms to your company. (regard ' + Math.round(c.opinion) + ')');
      });
    });
    const gf = $('cm-gift');
    if (gf) gf.addEventListener('click', function () {
      actThen(function () {
        s.player.gold = Math.max(0, s.player.gold - 5);
        c.opinion = FB.clamp(c.opinion + 12, -100, 100);
        FB.news(s, 'Your gift pleases ' + c.name + '. (regard ' + Math.round(c.opinion) + ')');
      });
    });
    const ct = $('cm-court');
    if (ct) ct.addEventListener('click', function () {
      actThen(function () {
        s.player.courtingId = c.id;
        s.player.flags.courting = 1;
        s.player.focus = 'court_suitor';
        FB.news(s, '🌷 You begin courting ' + FB.fullName(c) + '.');
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
        FB.news(s, doc.divorce === 'talaq' ?
          '🕊 You pronounce the divorce from ' + c.name + '; the mahr of ' + cost + ' gold is paid.' :
          doc.divorce === 'get' ?
            '📜 A get is written and witnessed; ' + c.name + ' departs with the ketubah of ' + cost + ' gold.' :
            '💔 Before witnesses, the marriage to ' + c.name + ' is declared sundered.');
        if (gap > 0) FB.news(s, '🗣 The house of ' + c.name + ' does not forgive the slight.');
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
      FB.news(s, '💔 The courtship of ' + c.name + ' is ended.');
      FB.validateFocus(s);
      UI.refresh();
    });
    const ins = $('cm-insult');
    if (ins) ins.addEventListener('click', function () {
      actThen(function () {
        c.opinion = FB.clamp(c.opinion - 12, -100, 100);
        if (FB.chance(0.5 + FB.skillOf(me, 'dip') * 0.015)) {
          s.player.prestige += 4;
          FB.news(s, 'Your barb lands perfectly. ' + c.name + ' fumes; the crowd laughs.');
        } else {
          s.player.prestige = Math.max(0, s.player.prestige - 5);
          FB.news(s, 'The insult falls flat. ' + c.name + ' answers better, and the laughter is theirs.');
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
          FB.news(s, 'Your quiet work costs ' + c.name + ' dearly, and no one can prove a thing.');
        } else {
          c.opinion = FB.clamp(c.opinion - 20, -100, 100);
          s.player.prestige = Math.max(0, s.player.prestige - 6);
          FB.news(s, 'The scheme unravels — and ' + c.name + ' knows exactly whose hand was in it.');
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
    let h = '<div class="gm-body-text"><p>Families willing to hear an offer for ' +
      esc(c.name) + '’s hand:</p></div><div class="gm-list">';
    for (const m of cands) {
      if (s.player.courtingId === m.id) continue; // no pledging your own paramour
      const gap = FB.stationOf(m) - ps;
      const need = gap > 0 ? gap * 20 : 0;
      const ask = m.dowryAsk || 0;
      const ok = s.player.gold >= ask && s.player.prestige >= need;
      let d = FB.STATION_NAMES[FB.stationOf(m)] + ' · age ' + FB.ageOf(m, s.date.year);
      if (ask) d += ' · their kin ask a dowry of ' + ask + ' gold';
      if (m.dowryDue) d += ' · she would bring a dowry of ' + m.dowryDue + ' gold';
      if (need) {
        d += ' · needs ' + need + ' prestige' +
          (s.player.prestige >= need ? '' : ' (you have ' + Math.floor(s.player.prestige) + ')');
      } else if (gap < 0) d += ' · a step down — folk will mark it';
      h += '<button class="actionbtn" data-match="' + m.id + '"' + (ok ? '' : ' disabled') +
        '>💍 ' + esc((m.epithet ? m.epithet + ' — ' : '') + m.name) +
        '<span class="adesc">' + esc(d) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Decide nothing today</button>';
    openModal('A Match for ' + c.name, h);
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
      if (fx[k]) parts.push((fx[k] > 0 ? '+' : '') + fx[k] + ' ' + FB.SKILL_NAMES[k]);
    }
    if (fx.battle) parts.push((fx.battle > 0 ? '+' : '') + Math.round(fx.battle * 100) + '% battle odds');
    if (fx.prestige) parts.push((fx.prestige > 0 ? '+' : '') + fx.prestige + ' prestige a season');
    if (fx.piety) parts.push((fx.piety > 0 ? '+' : '') + fx.piety + ' piety a season');
    if (fx.health) parts.push('wards off sickness and death');
    return parts.join(' · ');
  }

  UI.showItemModal = function (id, viewOnly) {
    const s = FB.state;
    const def = FBDATA.items[id];
    if (!s || !def) return;
    const name = FB.fmt(s, def.name, {});
    const owned = !viewOnly && FB.itemList(s).indexOf(id) >= 0;
    const fx = itemFxText(def);
    const sell = Math.round(def.value * (FBDATA.balance.itemSellRatio || 0.5));
    let h = '<div class="gm-body-text">' +
      '<p style="font-size:16px"><b>' + def.icon + ' ' + esc(name) + '</b> · <span class="cmeta">' + esc(def.rarity) + '</span></p>' +
      '<p><i>' + esc(FB.fmt(s, def.desc, {})) + '</i></p>' +
      (fx ? '<p>⚜ ' + esc(fx) + '</p>' : '<p class="cmeta">No power but its worth.</p>') +
      (fx && !viewOnly ? '<p class="cmeta">Its powers serve whoever heads the family.</p>' : '') +
      '<p class="cmeta">Worth about ' + def.value + ' gold.</p></div>';
    if (owned) {
      h += '<div class="gm-list">' +
        '<button class="actionbtn" id="im-give">🎁 Give it as a gift…' +
        '<span class="adesc">A treasure warms regard as mere silver never could. (spends the day)</span></button>' +
        '<button class="actionbtn" id="im-sell">💰 Sell it (' + sell + ' gold)' +
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
    for (const sp of FB.spousesOf(s, me)) add(sp, 'your spouse');
    if (s.player.courtingId) add(s.chars[s.player.courtingId], 'courting');
    const kin = FB.kinOf(s);
    for (const g of ['children', 'parents', 'siblings', 'grandchildren',
      'niecesNephews', 'unclesAunts', 'cousins', 'grandparents']) {
      for (const e of kin[g]) add(e.c, e.rel.toLowerCase());
    }
    for (const role of ['lord', 'priest', 'friend', 'rival']) add(FB.getRole(s, role, false), 'your ' + role);
    if (!folk.length) {
      UI.toast('You know no one to honor with it.');
      return;
    }
    const boost = FB.giftOpinion(def);
    let h = '<div class="gm-body-text"><p>Whom to honor with ' + def.icon + ' ' +
      esc(FB.fmt(s, def.name, {})) + '? Such largesse is worth +' + boost + ' regard.</p></div><div class="gm-list">';
    for (const e of folk) {
      const op = Math.round(e.c.opinion);
      h += '<button class="actionbtn" data-give="' + e.c.id + '">🎁 ' + esc(FB.fullName(e.c)) +
        '<span class="adesc">' + esc(e.rel) + ' · regard <span class="' + FB.opClass(op) + '">' +
        (op > 0 ? '+' : '') + op + '</span>' +
        (s.roles.lord === e.c.id ? ' · your lord’s favor rises with it' : '') + '</span></button>';
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
        esc(FB.SKILL_NAMES[k]) + '<span class="adesc">' + esc(EDU_DESC[k]) + '</span></button>';
    }
    h += '<button class="actionbtn" data-edufocus="">○ No directed study' +
      '<span class="adesc">' + (self ? 'Find your own way.' : 'Let the child find their own way.') + '</span></button>';
    h += '</div><button class="btn" id="edu-back">Back</button>';
    openModal(self ? '🎓 Your education' : '🎓 Education of ' + esc(c.name), h);
    document.querySelectorAll('[data-edufocus]').forEach(function (b) {
      b.addEventListener('click', function () {
        const k = b.getAttribute('data-edufocus');
        c.edu = c.edu || {};
        c.edu.focus = k || null;
        FB.news(s, self ?
          ('🎓 You ' + (k ? 'will be schooled in ' + FB.SKILL_NAMES[k].toLowerCase() + '.' : 'are left to your own devices.')) :
          ('🎓 ' + c.name + (k ? ' will be schooled in ' + FB.SKILL_NAMES[k].toLowerCase() + '.' : ' is left to their own devices.')));
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
      if (focus) return FB.SKILL_NAMES[focus] + ' ' + FB.skillOf(t, focus);
      let best = 'dip';
      for (const k of FB.SKILLS) if (FB.skillOf(t, k) > FB.skillOf(t, best)) best = k;
      return 'best: ' + FB.SKILL_NAMES[best] + ' ' + FB.skillOf(t, best);
    }
    const cands = [];
    if (self) {
      // a child player is taught by their elders, not by themselves
      const f = me.fatherId ? s.chars[me.fatherId] : null;
      const m = me.motherId ? s.chars[me.motherId] : null;
      if (f && !f.dead) cands.push({ id: f.id, c: f, name: f.name + ' (your father)' });
      if (m && !m.dead) cands.push({ id: m.id, c: m, name: m.name + ' (your mother)' });
    } else {
      cands.push({ id: 'self', c: me, name: 'Teach them yourself' });
      for (const sp of FB.spousesOf(s, me)) {
        cands.push({ id: sp.id, c: sp, name: sp.name + ' (your ' + (sp.sex === 'f' ? 'wife' : 'husband') + ')' });
      }
    }
    for (const r of ['priest', 'friend', 'lord']) {
      const rc = FB.getRole(s, r, false);
      if (rc && !rc.dead && (r !== 'lord' || rc.opinion >= 0)) {
        cands.push({ id: rc.id, c: rc, name: rc.name + ' (' + (r === 'priest' ? FB.holyWord(me.religion) : r) + ')' });
      }
    }
    let h = '<div class="gm-list">';
    for (const cd of cands) {
      const cur = c.edu && c.edu.tutorId === cd.id;
      h += '<button class="actionbtn" data-tutor="' + cd.id + '">' + (cur ? '◉ ' : '○ ') + esc(cd.name) +
        '<span class="adesc">' + esc(skillNote(cd.c)) + '</span></button>';
    }
    h += '<button class="actionbtn" data-tutor="~hire"' + (s.player.gold < 25 ? ' disabled' : '') + '>🎓 Hire a learned master (25 gold)' +
      '<span class="adesc">A stranger of real accomplishment' + (focus ? ' in ' + FB.SKILL_NAMES[focus].toLowerCase() : '') + '.</span></button>';
    if (c.edu && c.edu.tutorId) {
      h += '<button class="actionbtn" data-tutor="~none">✖ Dismiss the tutor<span class="adesc">The lessons end.</span></button>';
    }
    h += '</div><button class="btn" id="tut-back">Back</button>';
    openModal(self ? '🧑‍🏫 Your tutor' : '🧑‍🏫 A Tutor for ' + esc(c.name), h);
    document.querySelectorAll('[data-tutor]').forEach(function (b) {
      b.addEventListener('click', function () {
        const v = b.getAttribute('data-tutor');
        c.edu = c.edu || {};
        if (v === '~none') {
          c.edu.tutorId = null;
          FB.news(s, self ? 'Your tutor is dismissed.' : 'The tutor of ' + c.name + ' is dismissed.');
        } else if (v === '~hire') {
          if (s.player.gold < 25) return;
          s.player.gold -= 25;
          const pr = FB.world.byId[s.player.provinceId];
          const master = FB.makeCharacter(s, {
            culture: pr.culture, religion: pr.religion,
            born: s.date.year - FB.ri(35, 60), quality: 3, role: 'tutor'
          });
          master.epithet = 'Hired master';
          if (focus) master.skills[focus] = FB.clamp(FB.ri(11, 16), 0, FBDATA.balance.skillHardCap || 40);
          else master.skills.lea = FB.clamp(FB.ri(11, 16), 0, FBDATA.balance.skillHardCap || 40);
          c.edu.tutorId = master.id;
          FB.news(s, '🎓 ' + master.name + ', a learned master, takes charge of ' +
            (self ? 'your' : c.name + '’s') + ' education.');
        } else {
          c.edu.tutorId = v;
          FB.news(s, '🎓 ' + (v === 'self' ? 'You take' : (s.chars[v] ? s.chars[v].name : 'A tutor') + ' takes') +
            ' charge of ' + (self ? 'your' : c.name + '’s') + ' lessons.');
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
      h += '<button class="actionbtn" data-namedheir="' + c.id + '">' + FB.faceTag(c, 32, 38) + ' ' +
        (s.player.namedHeirId === c.id ? '★ ' : '') + esc(FB.fullName(c)) +
        '<span class="adesc">Age ' + FB.ageOf(c, s.date.year) + ' · Mar ' + FB.skillOf(c, 'mar') +
        ' · Ste ' + FB.skillOf(c, 'ste') + ' · Dip ' + FB.skillOf(c, 'dip') + '</span></button>';
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
        FB.news(s, '📜 ' + FB.fullName(c) + ' is named heir before witnesses.');
        UI.closeModal();
      });
    });
    $('hp-close').addEventListener('click', UI.closeModal);
  };

  UI.showTraitModal = function (tid) {
    const t = FBDATA.traits[tid];
    if (!t) return;
    let fx = '';
    for (const k of FB.SKILLS) {
      if (t[k]) fx += '<div class="kv"><span>' + FB.SKILL_NAMES[k] + '</span><b>' + (t[k] > 0 ? '+' : '') + t[k] + '</b></div>';
    }
    if (t.health) fx += '<div class="kv"><span>Constitution</span><b>' + (t.health > 0 ? 'hardier' : 'frailer') + '</b></div>';
    if (t.fert && t.fert !== 1) fx += '<div class="kv"><span>Fertility</span><b>' + (t.fert > 1 ? 'higher' : 'lower') + '</b></div>';
    if (t.opinion) fx += '<div class="kv"><span>Others’ regard</span><b>' + (t.opinion > 0 ? '+' : '') + t.opinion + '</b></div>';
    if (t.opposite && FBDATA.traits[t.opposite]) {
      fx += '<div class="kv"><span>Opposite of</span><b>' + esc(FBDATA.traits[t.opposite].name) + '</b></div>';
    }
    openModal(t.icon + ' ' + t.name,
      '<div class="gm-body-text"><p><i>' + esc(t.desc) + '</i></p>' +
      (fx || '<p class="hint">No lasting effects — only a story people tell about you.</p>') +
      '</div><button class="btn" id="tm-close">Close</button>');
    $('tm-close').addEventListener('click', UI.closeModal);
  };

  /* ================= death & succession ================= */
  UI.showDeath = function (heirs, causeText) {
    const s = FB.state;
    const me = s.chars[s.player.charId];
    let h = '<div class="gm-body-text"><p>' + esc(causeText) + '</p>';
    if (heirs.length) {
      h += '<p>But a house is more than one life. Who carries the name onward?</p></div><div class="gm-list">';
      for (const c of heirs) {
        h += '<button class="actionbtn" data-heir="' + c.id + '">' + FB.faceTag(c, 32, 38) + ' ' +
          esc(FB.fullName(c)) + '<span class="adesc">Age ' + FB.ageOf(c, s.date.year) +
          ' · Mar ' + FB.skillOf(c, 'mar') + ' · Ste ' + FB.skillOf(c, 'ste') + ' · Dip ' + FB.skillOf(c, 'dip') + '</span></button>';
      }
      h += '</div>';
      openModal('☠ ' + esc(me.name) + ' is Dead', h, { dismissable: false });
      FB.paintFaces($('gm-body'), s);
      document.querySelectorAll('[data-heir]').forEach(function (b) {
        b.addEventListener('click', function () {
          UI.closeModal();
          FB.game.succeedTo(b.dataset.heir);
        });
      });
    } else {
      h += '<p><b>There is no heir.</b> The house of ' + esc(me.dyn || me.name) +
        ' passes out of memory, as all things must.</p></div>';
      openModal('☠ The Line is Ended', h + '<button class="btn primary" id="gm-gameover">See the chronicle</button>', { dismissable: false });
      $('gm-gameover').addEventListener('click', function () {
        UI.closeModal(); UI.gameOver();
      });
    }
  };

  UI.gameOver = function () {
    const s = FB.state;
    const years = s.date.year - FBDATA.balance.startYear;
    let h = '<div class="gm-body-text">' +
      '<p>Your saga spanned <b>' + years + ' years</b> and <b>' + (s.generation || 1) + ' generation(s)</b>.</p>' +
      '<div class="kv"><span>Highest rank attained</span><b>' + esc(s.peakTitle || 'Serf') + '</b></div>' +
      '<div class="kv"><span>Final wealth</span><b>' + Math.floor(s.player.gold) + ' gold</b></div>' +
      '<div class="kv"><span>Prestige</span><b>' + Math.floor(s.player.prestige) + '</b></div>' +
      '<div class="kv"><span>Piety</span><b>' + Math.floor(s.player.piety) + '</b></div>' +
      '<h4>Last lines of the chronicle</h4>';
    for (let i = Math.max(0, s.log.length - 6); i < s.log.length; i++) {
      h += '<p>· ' + esc(s.log[i].t) + '</p>';
    }
    h += '</div><button class="btn primary" id="gm-title-btn">Return to title</button>';
    openModal('The Chronicle Closes', h, { dismissable: false });
    $('gm-title-btn').addEventListener('click', function () {
      UI.closeModal();
      FB.game.toTitle();
    });
  };

  /* ================= menu ================= */
  UI.showMenu = function () {
    let h = '<div class="gm-list">' +
      '<button class="actionbtn" id="m-resume">▶ Resume</button>' +
      '<button class="actionbtn" id="m-save">💾 Save game</button>' +
      '<button class="actionbtn" id="m-load">📂 Load game</button>' +
      '<button class="actionbtn" id="m-help">❓ How to play</button>' +
      '<button class="actionbtn" id="m-mods">🧩 Mods</button>' +
      '<button class="actionbtn" id="m-quit">🏳 Abandon to title</button>' +
      '</div>';
    openModal('Menu', h);
    $('m-resume').addEventListener('click', UI.closeModal);
    $('m-save').addEventListener('click', function () { UI.showSaveLoad(true); });
    $('m-load').addEventListener('click', function () { UI.showSaveLoad(false); });
    $('m-help').addEventListener('click', function () { UI.showHelp(); });
    $('m-mods').addEventListener('click', function () { UI.showMods(); });
    $('m-quit').addEventListener('click', function () {
      UI.closeModal(); FB.game.toTitle();
    });
  };

  UI.showSaveLoad = function (saving) {
    let h = '<div class="gm-list">';
    for (let i = 1; i <= 3; i++) {
      const meta = FB.save.slotMeta(i);
      const other = !saving && meta && FB.save.otherWorld(FB.save.read(i));
      h += '<button class="actionbtn" data-slot="' + i + '">' +
        (saving ? '💾 Save to slot ' : '📂 Load slot ') + i +
        '<span class="adesc">' + esc(meta || 'Empty') +
        (other ? ' · 🧩 another world — its mods are not the ones active now' : '') + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-back">Back</button>';
    openModal(saving ? 'Save Game' : 'Load Game', h);
    document.querySelectorAll('[data-slot]').forEach(function (b) {
      b.addEventListener('click', function () {
        const n = parseInt(b.dataset.slot, 10);
        if (saving) { FB.save.toSlot(n); UI.toast('Saved to slot ' + n + '.'); UI.closeModal(); }
        else {
          if (FB.save.slotMeta(n)) { UI.closeModal(); FB.game.loadSlot(n); }
        }
      });
    });
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
      '<p><b>Arrows</b> pan the map · <b>Shift+arrows</b> hop between neighboring provinces · <b>+/−</b> zoom · <b>H</b> center home · <b>Enter</b> select the province at screen center.</p>' +
      '<p><b>Space</b> plays / pauses the flow of days · <b>F</b> skips to the next happening (and pauses) · <b>D S K L C</b> open the Deeds / Self / Kin / Land / Chronicle panels · <b>1–9</b> choose focuses, deeds, event options, and dialog items · <b>[</b> and <b>]</b> cycle panels · <b>Esc</b> menu / back / close · <b>Tab</b> moves between buttons.</p>' +
      '<h4>Saving</h4><p>The game autosaves each spring. Manual slots are in the menu.</p>' +
      '</div><button class="btn primary" id="gm-ok">Close</button>');
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
          '<div style="flex:1"><b>' + esc(mod.name) + '</b>' +
          (mod.desc ? '<br><span class="hint">' + esc(mod.desc) + '</span>' : '') +
          '</div>' +
          '<button class="btn ' + (on ? '' : 'primary') + '" id="mod-bundled-' + i + '">' + (on ? 'Disable' : 'Enable') + '</button></div>';
      });
    }
    h += '<div class="gm-body-text">' +
      '<p>Mods are JSON files merged over the game data (events, provinces, realms, cultures, traits, balance). See <b>docs/MODDING.md</b> in the game folder for the format. You can also edit the files in <b>data/</b> directly.</p>' +
      '<p>Mods stay on until removed, and saves remember their world — a life begun with a mod continues only while that mod is active.</p></div>' +
      '<div class="panelh">Active mods</div>';
    if (mods.length) {
      for (let i = 0; i < mods.length; i++) {
        h += '<div class="modrow">🧩 ' + esc(mods[i].name) +
          ' <span class="cmeta">(' + mods[i].kb + ' kB)</span>' +
          '<button class="btn small danger" data-unmod="' + i + '">Remove</button></div>';
      }
    } else {
      h += '<p class="cmeta" style="font-size:13px;margin:4px 0">None — no JSON mods applied.</p>';
    }
    h += '<div class="panelh">Add a mod</div>' +
      '<p style="margin:8px 0"><input type="file" id="modfile" accept=".json"></p>' +
      '<textarea class="modjson" id="modpaste" placeholder=\'Or paste mod JSON here, e.g. {"events":[...]}\'></textarea>' +
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
      // underline each panel's hotkey letter
      const hot = { actions: '<u>D</u>eeds', char: '<u>S</u>elf', family: '<u>K</u>in', prov: '<u>L</u>and', log: '<u>C</u>hronicle' };
      document.querySelectorAll('#sidetabs .tab, #lefttabs .tab').forEach(function (t) {
        if (hot[t.dataset.tab]) t.innerHTML = hot[t.dataset.tab];
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
      if (FB.state) FB.map.centerOn(FB.state.player.provinceId, 2.2);
    });
    FB.map.onTap = function (pr) {
      if (FB.game.pickMode) { FB.game.pickProvince(pr); return; }
      if (pr) UI.selectProvince(pr.id);
    };
    // click any character row → their sheet; any trait chip → its meaning;
    // item chips open the item card (a toast while an event holds the stage)
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      const chip = e.target.closest('.traitchip[data-trait]');
      if (chip) { UI.showTraitModal(chip.getAttribute('data-trait')); return; }
      const ichip = e.target.closest('.traitchip[data-item], .traitchip[data-itemview]');
      if (ichip && FB.state) {
        const iid = ichip.getAttribute('data-item') || ichip.getAttribute('data-itemview');
        const d = FBDATA.items[iid];
        if (d && UI.eventsBusy()) {
          UI.toast(d.icon + ' ' + FB.fmt(FB.state, d.name, {}) + ' — ' + FB.fmt(FB.state, d.desc, {}));
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
          e.target.closest('.traitchip[data-trait], .traitchip[data-item], .traitchip[data-itemview]') : null;
        if (!chip) { tip.classList.add('hidden'); return; }
        if (chip.hasAttribute('data-trait')) {
          const t = FBDATA.traits[chip.getAttribute('data-trait')];
          if (!t) return;
          const fx = traitFxText(t);
          tip.innerHTML = '<b>' + t.icon + ' ' + esc(t.name) + '</b><br>' + esc(t.desc) +
            (fx ? '<br><i>' + esc(fx) + '</i>' : '');
        } else {
          const d = FBDATA.items[chip.getAttribute('data-item') || chip.getAttribute('data-itemview')];
          if (!d || !FB.state) return;
          const ifx = itemFxText(d);
          tip.innerHTML = '<b>' + d.icon + ' ' + esc(FB.fmt(FB.state, d.name, {})) + '</b> · ' + esc(d.rarity) +
            '<br>' + esc(FB.fmt(FB.state, d.desc, {})) +
            (ifx ? '<br><i>' + esc(ifx) + '</i>' : '') +
            '<br><i>worth ~' + d.value + ' gold</i>';
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
    for (const k of FB.SKILLS) if (t[k]) parts.push((t[k] > 0 ? '+' : '') + t[k] + ' ' + FB.SKILL_NAMES[k]);
    if (t.opinion) parts.push('regard ' + (t.opinion > 0 ? '+' : '') + t.opinion);
    if (t.health) parts.push(t.health > 0 ? 'hardier' : 'frailer');
    if (t.fert && t.fert !== 1) parts.push(t.fert > 1 ? 'more fertile' : 'less fertile');
    return parts.join(' · ');
  }
})();
