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
  function rivalryHeatName(heat) {
    if (heat >= 70) return FB.T('blood feud');
    if (heat >= 40) return FB.T('open feud');
    if (heat >= 20) return FB.T('simmering');
    return FB.T('cooling');
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
  function signedOpinion(value) {
    const rounded = Math.round(value);
    return (rounded > 0 ? '+' : '') + rounded;
  }
  function opinionBand(value) {
    if (value >= 60) return FB.T('Warm');
    if (value >= 20) return FB.T('Favorable');
    if (value <= -60) return FB.T('Hostile');
    if (value <= -20) return FB.T('Guarded');
    return FB.T('Neutral');
  }
  function allianceSourceText(source) {
    if (source === 'royal_marriage') return FB.T('royal marriage');
    if (source === 'envoy') return FB.T('envoy compact');
    return FB.T('dynastic compact');
  }
  function allianceText(s, rid) {
    const a = FB.allianceOf(s, rid);
    if (!a) return FB.T('None');
    const partner = a.a === rid ? a.b : a.a;
    const r = s.realms[partner];
    const support = FB.alliedReinforcement(s, rid);
    return FB.T('{realm} · {source} · until either ruler changes · defensive support ~{men}', {
      realm: r ? r.name : partner,
      source: allianceSourceText(a.source),
      men: menText(s, support.men)
    });
  }
  function foreignPolicyStanceText(s, rid) {
    const stance = FB.foreignPolicyStance(s, rid);
    const text = stance > 0 ? FB.T('Improve relations')
      : (stance < 0 ? FB.T('Provoke') : FB.T('Neutral'));
    if (stance && s.player.war && s.player.war.enemy === rid) {
      return FB.T('{stance} — suspended during war', { stance: text });
    }
    return text;
  }
  function foreignPolicyStatusText(s, rid) {
    if (s.player.war && s.player.war.enemy === rid) {
      return FB.T('At war — policy is suspended');
    }
    if (FB.areAllied(s, 'player', rid)) {
      return FB.T('Defensive allies - neither realm may attack the other');
    }
    if (s.pacts && s.pacts[rid] > s.turn) {
      const year = FBDATA.balance.startYear + Math.floor(s.pacts[rid] / 360);
      return FB.isRealmAtWar(s, rid)
        ? FB.T('Peace pact until {year} AD · at war elsewhere', { year: year })
        : FB.T('Peace pact until {year} AD', { year: year });
    }
    if (FB.isRealmAtWar(s, rid)) return FB.T('At war with another realm');
    return FB.T('No pact or war');
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

  /* Touch mis-tap guard. On mobile the event modal is a bottom sheet that can
     appear just as the player's thumb is already coming down toward the time
     bar, so an in-flight tap lands on a freshly drawn option and chooses an
     outcome by accident. Briefly drop input after each set of action buttons
     renders: long enough to catch an instant follow-up tap, but short enough
     that deliberately moving through events stays responsive. Autoresolved
     events render no buttons and never arm this guard. Desktop mouse users act
     on a centered modal with no button under the pointer, so the guard is
     limited to touch. */
  const EVENT_INPUT_GUARD_MS = 350;
  let eventGuardUntil = 0;
  function armEventGuard() { eventGuardUntil = Date.now() + EVENT_INPUT_GUARD_MS; }
  function eventInputGuarded() { return FB.isTouch && Date.now() < eventGuardUntil; }

  /* ================= screens ================= */
  UI.showScreen = function (id) {
    if (id !== null && travelPicker) closeTravelPicker(false);
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
    if (travelPicker) closeTravelPicker(false);
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
        esc(FB.T('No steady sources yet — deeds and events still move it.')) + '</div>';
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
    return h;
  }

  let portraitKey = '';
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
    $('tb-name').textContent = FB.fullName(me);
    // the topbar portrait and crest change rarely; repaint only when
    // something they draw from has moved
    const pk = me.id + '|' + (me.dyn || me.name) + '|' + s.date.year + '|' +
      s.player.profession + '|' + s.player.tier + '|' + me.health + '|' +
      me.traits.join(',') + '|' +
      (me.ailments || []).map(function (ail) {
        return typeof ail === 'string' ? ail : (ail && (ail.id || ail.kind) || '');
      }).join(',') + '|' +
      (FB.loadoutVisualKey ? FB.loadoutVisualKey(s, me.id) : '');
    if (pk !== portraitKey) {
      portraitKey = pk;
      FB.paintPortrait($('tb-portrait'), me, s.date.year, {
        state:s, profession:s.player.profession, tier:s.player.tier
      });
      FB.drawCrest($('crest'), me.dyn || me.name);
    }
    const pr = FB.world.byId[s.player.provinceId];
    $('tb-title').textContent = FB.styledTitle(s) + ' · ' + (pr ? pr.name : '?');
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
    $('tb-piety').innerHTML = FB.religionOf(me.religion).icon + ' <span class="mono">' + Math.floor(s.player.piety) + '</span>' + netBadge(net.piety);
    $('tb-health').innerHTML = '❤️ <span class="mono">' + Math.round(me.health) + '</span>';
    $('tb-date').innerHTML = '<span class="mono">' + dateStr + '</span>';
    const kh = FB.isTouch ? '' : '<span class="keyhint">Space</span> ';
    $('btn-endturn').innerHTML = kh + '<span class="pp">' +
      esc(FB.T(FB.game.paused ? '▶ Play' : '❚❚ Pause')) + '</span>';
    $('btn-auto').innerHTML = (FB.isTouch ? '' : '<span class="keyhint">Z</span> ') + '⚙' +
      (FB.game.auto && (FB.game.auto.minor || FB.game.auto.major || FB.game.auto.war || FB.game.auto.all ||
        (FB.game.auto.hosts && FB.game.auto.hosts !== 'manual')) ? '✓' : '');
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
  const actionGroupsOpen = { work:true, life:false, faith:false, realm:false, war:false };
  const ACTION_GROUPS = [
    { id:'work', label:'🧰 Work & Wealth' },
    { id:'life', label:'🌿 Life & Family' },
    { id:'faith', label:'🕯 Faith & Community' },
    { id:'realm', label:'👑 Rank & Realm' },
    { id:'war', label:'⚔ War & Diplomacy' }
  ];
  const FOCUS_GROUP = {
    study:'life', play:'life', rest:'life', pray:'faith', court_suitor:'life',
    toil:'work', work_land:'work', market:'work', keep_house:'work',
    craft_work:'work', trade_run:'work', copy_books:'faith', serve_church:'faith',
    militia:'war', drill:'war', stand_guard:'war', train_arms:'war', lead_host:'war',
    manage_manor:'realm', serve_lord:'realm', courtly_graces:'realm',
    scheming:'realm', govern:'realm', patronize:'realm'
  };
  const DEED_GROUP = {
    poach:'work', go_to_town:'work', better_household:'work', livelihoods:'work',
    buy_freedom:'realm', buy_land:'realm', declare_manor:'realm',
    build:'realm', adopt_tech:'realm',
    squeeze_taxes:'realm', hold_court:'realm', petition_barony:'realm',
    petition_liege:'realm', petition_county:'realm', buy_county:'realm',
    settle_waste:'realm', grant_land:'realm', demand_taxes:'realm',
    revoke_county:'realm', royal_council:'realm', coin_credit:'work',
    debase_coinage:'realm',
    seek_match:'life', propose:'life', mediate:'life', swear_friend:'life',
    scheme_rival:'life', begin_plot:'life', take_road:'life', travel_turn_back:'life',
    travel_settle_here:'life',
    seek_blessing:'faith', give_alms:'faith', hold_feast:'faith',
    send_envoy:'war', foreign_policy:'war', muster_host:'war', hire_mercs:'war', declare_war:'war',
    declare_independence:'war', pay_homage:'war', appeal_lord:'war',
    swear_fealty:'war'
  };

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
    const travel = s.player.travel;
    if (travel) {
      const here = FB.world.byId[travel.currentId];
      const destination = FB.world.byId[travel.destinationId];
      const def = FBDATA.travelPurposes[travel.purpose];
      const purposeName = def
        ? dt(s, 'travelPurpose', travel.purpose, def, 'name') : travel.purpose;
      const phase = travel.phase === 'outbound' ? FB.T('outbound')
        : (travel.phase === 'return' ? FB.T('returning home') : FB.T('at the destination'));
      const days = travel.remainingRoute && travel.remainingRoute.length
        ? travel.legDaysLeft + Math.max(0, travel.remainingRoute.length - 1) * travel.legDays
        : 0;
      h += '<div class="progressnote">🧭 ' + esc(FB.T(
        '{purpose} · {phase} · now in {location} · destination {destination}', {
          purpose:purposeName,
          phase:phase,
          location:here ? here.name : '?',
          destination:destination ? destination.name : '?'
        })) + (days ? ' · ' + esc(FB.T('{days} travel days remain', {days:days})) : '') +
        (travel.phase === 'arrived' && FB.travelStayDays
          ? ' · ' + esc(FB.T('{days} days living and working here', {
              days:FB.travelStayDays(s)
            })) : '') +
        '</div>';
    }
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
      const pHost = FB.playerHost ? FB.playerHost(s) : null;
      if (pHost && (!pHost.path || !pHost.path.length) && !pHost.goal) {
        h += '<div class="hint">' + esc(FB.T('Tap the 🚩 on the map to give march orders.')) + '</div>';
      }
    }
    const attentionCapacity = FB.politicalAttentionCapacity(s);
    if (attentionCapacity) {
      const assigned = FB.foreignPolicyAssignments(s);
      const assignmentText = assigned.map(function (rid) {
        const r = s.realms[rid], stance = FB.foreignPolicyStance(s, rid);
        return FB.T('{realm} {direction} {opinion}', {
          realm: r.name,
          direction: stance > 0 ? '↑' : '↓',
          opinion: signedOpinion(FB.realmOpinionOf(s, rid))
        });
      }).join(' · ');
      h += '<div class="progressnote">' + esc(assignmentText
        ? FB.T('🕊 Political attention {used}/{capacity} · {assignments}', {
          used: assigned.length, capacity: attentionCapacity, assignments: assignmentText
        })
        : FB.T('🕊 Political attention {used}/{capacity} · no assignments', {
          used: 0, capacity: attentionCapacity
        })) + '</div>';
    }
    const hl = FB.holdingList(s);
    if (hl.length) {
      const hg = FB.holdingBonus(s, 'gold');
      h += '<div class="progressnote">🏠 ' + hl.map(function (id) {
        const d = FBDATA.holdings[id];
        return d ? d.icon : '?';
      }).join('') + (hg ? ' · ' + esc(FB.T('+{money:amount}/season',
        { amount: Math.round(hg * 10) / 10 })) : '') + '</div>';
    }
    const land = FB.landPlots(s);
    if (land.length) {
      const cluster = FB.largestLandCluster(s);
      h += '<div class="progressnote">' + esc(FB.T(
        '🌾 {plots} land plots · largest holding {cluster}/{needed} at {settlement} · +{money:gold}/season',
        {
          plots:land.length,
          cluster:cluster ? cluster.count : 0,
          needed:FBDATA.balance.manorPlotRequirement,
          settlement:cluster ? cluster.settlementName : '?',
          gold:Math.round(FB.landYield(s) * 10) / 10
        })) + '</div>';
    }
    if (s.player.tier >= 3) {
      const lg = s.player.liege && s.player.liege !== 'player' && s.realms[s.player.liege];
      h += '<div class="progressnote">' + esc(FB.T('💰 Seasonal revenue ~{money:gold} · 🛡 levy ~{men} men', {
        gold: FB.playerTax(s), men: FB.playerLevy(s)
      })) + (lg ? ' · ' + esc(FB.T('vassal of')) +
        ' <span class="linklike" data-liege="' + esc(s.player.liege) +
        '" title="' + esc(FB.T('See your liege’s sheet')) + '">' + esc(lg.name) + '</span>' :
        ' · ' + esc(FB.T('independent'))) + '</div>';
      if (s.player.provs && s.player.provs.length) {
        const dcap = FB.domainCap(s), dheld = s.player.provs.length, dover = dheld > dcap;
        h += '<div class="progressnote' + (dover ? ' warnote' : '') + '">' +
          esc(FB.T('🏰 Domain {held}/{cap} held directly', { held: dheld, cap: dcap })) +
          (dover ? ' · ' + esc(FB.T('overextended — your income & levy cut {pct}%', {
            pct: Math.round((1 - FB.domainPenalty(s)) * 100)
          })) : '') + '</div>';
      }
      const parts = [];
      for (const bp of FB.demesne(s)) {
        const blt = FB.builtIn(s, bp).filter(function (e) { return !e.ruined; });
        if (blt.length) {
          parts.push(esc(FB.world.byId[bp].name) + ' ' + blt.map(function (e) {
            const d = FBDATA.buildings[e.id];
            return d ? d.icon : '?';
          }).join(''));
        }
      }
      if (parts.length) h += '<div class="progressnote">🏗 ' + parts.join(' · ') + '</div>';
      const tk = FB.techList(s);
      const tkRanks = {}, tkOrder = []; // collapse repeatable capstones: icon ×rank
      for (const tid of tk) {
        if (tkRanks[tid] === undefined) { tkRanks[tid] = 0; tkOrder.push(tid); }
        tkRanks[tid]++;
      }
      h += '<div class="progressnote">' + esc(FB.T('📜 Scholarship {amount}',
        { amount: Math.floor(s.player.research || 0) })) +
        (tkOrder.length ? ' · ' + tkOrder.map(function (id) {
          const d = FBDATA.tech[id];
          return (d ? d.icon : '?') + (tkRanks[id] > 1 ? '×' + tkRanks[id] : '');
        }).join('') : '') + '</div>';
    }
    h += nextStepHint(s);
    let currentFocus = null;
    for (const focus of FB.focuses) if (focus.id === s.player.focus) currentFocus = focus;
    if (currentFocus && !travel) {
      h += '<div class="progressnote">' + esc(FB.T('◉ Current focus: {focus}', {
        focus:dt(s, 'focus', currentFocus.id, currentFocus, 'label')
      })) + '</div>';
    }
    box.innerHTML = h;
    let n = 0; // hotkey numbering covers only actions visible in open groups
    const focuses = FB.listFocuses(s);
    const instants = FB.listInstants(s);
    for (const group of ACTION_GROUPS) {
      const gf = focuses.filter(function (f) { return (FOCUS_GROUP[f.id] || 'realm') === group.id; });
      const ga = instants.filter(function (item) { return (DEED_GROUP[item.a.id] || 'realm') === group.id; });
      if (!gf.length && !ga.length) continue;
      const toggle = document.createElement('button');
      const open = !!actionGroupsOpen[group.id];
      toggle.className = 'actiongroup-toggle';
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.innerHTML = '<span>' + esc(FB.T(group.label)) + '</span><span>' +
        esc(String(gf.length + ga.length)) + ' ' +
        (open ? '▾' : '▸') + '</span>';
      (function (id) {
        toggle.addEventListener('click', function () {
          actionGroupsOpen[id] = !actionGroupsOpen[id];
          renderActions();
        });
      })(group.id);
      box.appendChild(toggle);
      if (!open) continue;
      if (gf.length) {
        const fh = document.createElement('div');
        fh.className = 'actionsubhead';
        fh.textContent = FB.T('Daily focus — continues until changed');
        box.appendChild(fh);
      }
      for (const f of gf) {
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
      if (ga.length) {
        const ih = document.createElement('div');
        ih.className = 'actionsubhead';
        ih.textContent = FB.T('Deeds — done at once unless noted');
        box.appendChild(ih);
      }
      for (const item of ga) {
        const btn = document.createElement('button');
        btn.className = 'actionbtn';
        btn.setAttribute('data-action-id', item.a.id);
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
    }
    FB.localizeTree(box);
  }

  function nextStepHint(s) {
    if (s.player.tier === 0) {
      return '<div class="progressnote">🧭 ' + esc(FB.T(
        'Path: save {money:gold} (or win your lord’s favor) to buy freedom.',
        { gold: FBDATA.balance.freedomCost })) + '</div>';
    }
    if (s.player.tier === 1) {
      const cluster = FB.largestLandCluster(s);
      return '<div class="progressnote">🧭 ' + esc(FB.T(
        'Path: assemble {needed} plots in one settlement ({cluster}/{needed}), then reach {prestige} prestige and declare a manor. Soldiering and the church offer other roads.',
        {
          cluster:cluster ? cluster.count : 0,
          needed:FBDATA.balance.manorPlotRequirement,
          prestige:FBDATA.balance.manorPrestige
        })) + '</div>';
    }
    if (s.player.tier === 2) {
      const text = FB.gentryEstablished(s)
        ? FB.T('Path: serve your lord, win renown ({prestige}+ prestige, lord’s favor {favor}+), and petition for a barony.',
          { prestige:FBDATA.balance.baronyPrestige, favor:FBDATA.balance.baronyOpinion })
        : FB.T('Path: establish your gentle house. An heir who inherits its standing may petition for a barony; battlefield and church elevations remain exceptional roads.');
      return '<div class="progressnote">🧭 ' + esc(text) + '</div>';
    }
    const tips = {
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
    const schoolId = FB.schoolingId(s, c);
    let instruction = FB.T('home instruction');
    if (schoolId && FBDATA.schooling[schoolId]) {
      instruction = dt(s, 'schooling', schoolId, FBDATA.schooling[schoolId], 'name');
    } else if (c.edu && c.edu.tutorId === 'self') instruction = FB.T('you yourself');
    else if (c.edu && c.edu.tutorId && s.chars[c.edu.tutorId] && !s.chars[c.edu.tutorId].dead) {
      instruction = s.chars[c.edu.tutorId].name;
    }
    const chance = Math.round(Math.min(FBDATA.balance.educationChanceCap || 0.9,
      FB.educationInstructionChance(s, c) + FB.holdingBonus(s, 'edu')) * 100);
    const fee = FB.schoolingCost(s, c);
    let note = FB.T('🎓 Upbringing — focus: {focus} · instruction: {instruction} · {chance}% yearly', {
      focus:focusName, instruction:instruction, chance:chance
    });
    if (fee) note = FB.T('{summary} · {money:amount} each season', {
      summary:note, amount:fee
    });
    if (c.edu && c.edu.schoolUnpaid) {
      note = FB.T('{summary} · fee unpaid; this term is paused', { summary:note });
    }
    return '<div class="progressnote">' + esc(note) +
      (FB.ageOf(c, s.date.year) < 6 ? ' <span class="cmeta">' +
      esc(FB.T('(lessons begin at age 6)')) + '</span>' : '') + '</div>';
  }

  function livelihoodNote(s, c) {
    const career = FB.careerOf(s, c);
    const def = career && FBDATA.careers[career.profession];
    if (!def) return '';
    let detail = FB.careerTitle(s, c);
    if (def.guild) detail += ' · ' + FB.guildTitle(career);
    let h = '<div class="progressnote">' + esc(FB.T('🧰 Work — {career}', {
      career:detail
    })) + '</div>';
    const religious = FB.religiousPathOf(s, c);
    if (religious) {
      h += '<div class="progressnote">' + esc(FB.T('🛐 Religious standing — {rank}', {
        rank:FB.religiousRankTitle(s, c, religious)
      })) + '</div>';
    }
    return h;
  }

  function itemSlotLabel(slot) {
    if (slot === 'head') return FB.T('Head');
    if (slot === 'neck') return FB.T('Neck');
    if (slot === 'body') return FB.T('Body');
    if (slot === 'waist') return FB.T('Waist');
    if (slot === 'feet') return FB.T('Feet');
    if (slot === 'leftHand') return FB.T('Left hand');
    if (slot === 'rightHand') return FB.T('Right hand');
    if (slot === 'ring') return FB.T('Ring');
    return slot;
  }
  function itemWearerText(s, ref) {
    const at = FB.itemAssignment && FB.itemAssignment(s, ref);
    if (!at) return FB.T('In the armory');
    const c = s.chars[at.cid];
    return c ? FB.T('Worn by {name}', { name:FB.fullName(c) }) : FB.T('Equipped');
  }
  function equipmentBlockedText(reason) {
    if (reason === 'travel') {
      return FB.T('Equipment cannot be changed while the household is traveling.');
    }
    if (reason === 'event') {
      return FB.T('Resolve the current event before changing equipment.');
    }
    return '';
  }
  function equipmentBonusHtml(s, c) {
    const fx = {};
    const keys = FB.SKILLS.concat(['battle', 'prestige', 'piety', 'gold', 'health']);
    for (let i = 0; i < keys.length; i++) {
      const value = FB.itemBonus(s, keys[i], c.id);
      if (value) fx[keys[i]] = value;
    }
    const summary = itemFxText({ fx:fx });
    return '<div class="equip-bonuses"><div class="equip-bonus-heading">' +
      esc(FB.T('Equipment bonuses')) + '</div><div' +
      (summary ? '' : ' class="cmeta"') + '>' +
      esc(summary || FB.T('No equipment bonuses.')) + '</div></div>';
  }
  function equipmentSheetHtml(s, c) {
    const loadout = FB.loadoutOf(s, c.id);
    const blocked = FB.equipmentBlockedReason ? FB.equipmentBlockedReason(s) : null;
    let h = '<div class="paper-sheet"><div class="paper-figure">' +
      '<canvas class="paperdoll" data-cid="' + c.id +
      '" width="240" height="450" role="img" aria-label="' +
      esc(FB.T('Full figure of {name}', { name:FB.fullName(c) })) + '"></canvas>' +
      equipmentBonusHtml(s, c) + '</div>' +
      '<div class="equip-panel"><div class="equip-heading">' + esc(FB.T('Equipment')) +
      '</div><div class="equip-grid">';
    for (const slot of FB.ITEM_SLOTS) {
      const ref = loadout[slot];
      const item = ref && FB.resolveItem(s, ref);
      let value = item ? item.def.icon + ' ' + FB.itemName(s, ref) : FB.T('Empty');
      if (item && item.grip === 2) value += ' - ' + FB.T('two-handed');
      const aria = FB.T('{slot}: {item}', {
        slot:itemSlotLabel(slot),
        item:item ? FB.itemName(s, ref) : FB.T('Empty')
      });
      h += '<button type="button" class="equip-slot" data-equip-cid="' + c.id +
        '" data-equip-slot="' + slot + '" aria-label="' + esc(aria) + '"' +
        (blocked ? ' disabled' : '') + '><span>' + esc(itemSlotLabel(slot)) +
        '</span><b>' + esc(value) + '</b></button>';
    }
    h += '</div>' + (blocked ? '<div class="progressnote warnote">' +
      esc(equipmentBlockedText(blocked)) + '</div>' :
      '<div class="equip-note">' + esc(FB.T(
        'Choose a slot, then choose an exact object from the family armory. Changes cost no day.')) +
      '</div>') + '</div></div>';
    return h;
  }
  function wireEquipmentButtons(root, returnMode) {
    if (!root) return;
    const buttons = root.querySelectorAll('[data-equip-cid][data-equip-slot]');
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        UI.showEquipSlot(buttons[i].getAttribute('data-equip-cid'),
          buttons[i].getAttribute('data-equip-slot'), returnMode);
      });
    }
  }

  function itemChips(s) {
    const ids = FB.itemList(s);
    if (!ids.length) return '<span class="cmeta">' + esc(FB.T('Nothing of note.')) + '</span>';
    let h = '';
    for (const ref of ids) {
      const item = FB.resolveItem(s, ref);
      if (item) {
        const pledged = FB.financeCollateralPledged &&
          FB.financeCollateralPledged(s, 'item', ref);
        h += '<span class="traitchip" data-item="' + esc(ref) + '" title="' +
          esc(pledged ? FB.T('Pledged to a lender') : itemWearerText(s, ref)) + '">' +
          item.def.icon + ' ' + esc(FB.itemName(s, ref)) +
          (pledged ? ' - ' + esc(FB.T('pledged')) : '') + '</span>';
      }
    }
    return h + '<div class="cmeta" style="font-size:12px;margin-top:2px">' +
      esc(FB.T('The armory is shared. Only equipped objects grant their powers.')) + '</div>';
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

  function dynasticStatusRows(s, me) {
    let h = '';
    const claim = FB.fabricatedClaimOf(s);
    if (claim) {
      const pr = FB.world.byId[claim.pid];
      h += kv('Fabricated claim', esc(pr ? pr.name : claim.pid));
    }
    if (me.restorationRight) {
      const rr = me.restorationRight;
      h += kv('Crown-restoration right', esc(rr.titleName || FB.T('Disputed crown')));
    }
    const compact = FB.royalCompactOf(s);
    if (compact) {
      const realm = s.realms[compact.realmId];
      h += kv('Royal marriage compact', esc(realm ? realm.name : compact.realmId));
    }
    if (FB.allianceOf(s, 'player')) {
      h += kv('Defensive alliance', esc(allianceText(s, 'player')));
    }
    return h;
  }

  function renderChar() {
    const s = FB.state, me = s.chars[s.player.charId];
    const rel = FB.religionOf(me.religion), cul = FB.cultureOf(me.culture);
    let h =
      '<canvas id="selfportrait" class="pface" data-cid="' + me.id +
      '" width="72" height="82"></canvas>' +
      '<button type="button" class="btn portrait-equip" id="self-equipment" ' +
      'data-action-id="self-equipment">' + esc(FB.T('Equip items…')) + '</button>' +
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
      dynasticStatusRows(s, me) +
      panelh('Skills') + skillBars(me) +
      panelh('Traits') + traitChips(me) +
      panelh('Possessions') + itemChips(s) +
      panelh('Dynasty') +
      kv('House', esc(me.dyn || '—')) +
      kv('Generation', (s.generation || 1));
    h += panelh('Livelihood') + livelihoodNote(s, me);
    if (FB.ageOf(me, s.date.year) >= 10) {
      h += '<button class="actionbtn" id="self-work">🧰 Work, training & enterprises…' +
        '<span class="adesc">Manage the occupations and productive property of your household.</span></button>';
    } else {
      h += '<div class="hint">' + esc(FB.T('Too young for an apprenticeship yet.')) + '</div>';
    }
    if (FB.ageOf(me, s.date.year) < 16) {
      h += panelh('Upbringing') + upbringingNote(s, me) +
        '<button class="actionbtn" id="self-edufocus">🎓 Choose your education focus…' +
        '<span class="adesc">Direct your formative years toward one art.</span></button>' +
        '<button class="actionbtn" id="self-tutor">🧑‍🏫 Choose schooling or a tutor…' +
        '<span class="adesc">Instruction raises your yearly learning chance; paid lessons charge each season.</span></button>';
    }
    $('tab-char').innerHTML = h;
    FB.localizeTree($('tab-char'));
    FB.paintFaces($('tab-char'), s);
    const seq = $('self-equipment');
    if (seq) seq.addEventListener('click', function () {
      UI.showEquipmentModal(me.id, 'close');
    });
    const sef = $('self-edufocus');
    if (sef) sef.addEventListener('click', function () { UI.showEduFocus(me.id); });
    const stu = $('self-tutor');
    if (stu) stu.addEventListener('click', function () { UI.showTutorPick(me.id); });
    const sw = $('self-work');
    if (sw) sw.addEventListener('click', UI.showLivelihoods);
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
  function royalLineHtml(s, c) {
    if (!c.royalLine) return '';
    const r = s.realms[c.royalLine.realmId];
    const succession = r && FB.ensureRealmSuccession(s, c.royalLine.realmId);
    if (!r || !succession) return '';
    let status = FB.T('in the succession');
    if (succession.rulerMemberId === c.royalLine.memberId) status = FB.T('reigning ruler');
    else if (succession.heirId === c.royalLine.memberId) status = FB.T('designated heir');
    return '<div class="ccmeta">' + esc(FB.T('👑 Royal line of {realm} · {status}', {
      realm: r.name, status: status
    })) + '</div>';
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
      for (const ref of c.items) {
        const item = FB.resolveItem(s, ref);
        if (item) {
          itc += '<span class="traitchip" data-itemview="' + esc(ref) + '">' +
            item.def.icon + ' ' + esc(FB.itemName(s, ref)) + '</span>';
        }
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
        royalLineHtml(s, c) +
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
      royalLineHtml(s, c) +
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
      if (s.player.flags.noChildren) {
        h += '<div class="hint" style="margin:2px 0 0">' + esc(FB.T(
          '🛑 No more children — open your spouse’s sheet to change this.')) + '</div>';
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
      h += '<div class="hint" style="margin:2px 0 0">Tap a child to set their education focus and schooling.</div>';
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
  let mapMode = 'realm'; // 'realm' | 'mine' | 'liege' | 'duchy' | 'kingdom'

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
    // de jure modes: the whole duchy/kingdom lights up, wherever it lies;
    // wastelands and settled colonies have no duchy, so they stay dark
    if (mapMode === 'duchy') {
      const pr = FB.world.byId[pid];
      return pr && pr.duchy ? 'duchy:' + pr.duchy : null;
    }
    if (mapMode === 'kingdom') {
      const k = FB.dejureOf(pid).kingdom;
      return k ? 'kingdom:' + k : null;
    }
    // realm: your own province lights YOUR realm, a foreign one its sovereign's
    return inPlayerRealm(s, pid) ? 'player' : (s.owner[pid] || null);
  }

  const MAPMODES = { realm: 'Realm', mine: 'Mine', liege: 'Liege', duchy: 'De jure duchies', kingdom: 'De jure kingdoms' };

  /* the player's strongest claim among the de jure titles of one level
     (most counties held, ties to the smallest title) — for the filter toast */
  function bestDejureClaim(s, mode) {
    let best = null;
    function offer(name, pr) {
      if (!pr.have) return;
      if (!best || pr.have > best.pr.have ||
          (pr.have === best.pr.have && pr.total < best.pr.total)) best = { name: name, pr: pr };
    }
    if (mode === 'duchy') {
      for (const did in FBDATA.duchies) {
        const pr = FB.duchyProgress(s, did);
        if (pr.titled) offer(FBDATA.duchies[did].name, pr);
      }
    } else {
      for (const kid in FBDATA.kingdoms) offer(FBDATA.kingdoms[kid].name, FB.kingdomProgress(s, kid));
    }
    return best;
  }

  UI.cycleMapMode = function () {
    const s = FB.state;
    if (!s) return;
    const order = ['realm', 'mine', 'liege', 'duchy', 'kingdom'];
    let next = order[(order.indexOf(mapMode) + 1) % order.length];
    if (next === 'liege' && !s.player.liege) {
      UI.toast('🗺 You answer to no one — no liege to show.');
      next = order[(order.indexOf(next) + 1) % order.length];
    }
    mapMode = next;
    const btn = $('btn-mapmode');
    if (btn) {
      btn.classList.toggle('on', mapMode !== 'realm');
      btn.title = FB.T('Map filter: {mode} (R)', { mode: FB.T(MAPMODES[mapMode]) });
      btn.setAttribute('aria-label', btn.title);
    }
    let toastText = '🗺 Map filter: {mode}';
    let toastParams = { mode: FB.T(MAPMODES[mapMode]) };
    if ((mapMode === 'duchy' || mapMode === 'kingdom') && s.player.provs && s.player.provs.length) {
      const claim = bestDejureClaim(s, mapMode);
      if (claim) {
        toastText = '🗺 {mode} — your best claim: {name}, {held} (need {need})';
        toastParams = { mode: toastParams.mode, name: claim.name,
          held: ofCountiesText(s, claim.pr.have, claim.pr.total), need: claim.pr.need };
      }
    }
    UI.toast(toastText, toastParams);
    FB.map.select(FB.map.selected || s.player.provinceId, mapGroupOf);
  };

  let selectedProv = null;
  UI.selectProvince = function (pid) {
    selectedProv = pid;
    FB.map.select(pid, mapGroupOf);
    activeTab = 'prov';
    setTab('prov');
  };

  /* "{have} of {total} counties/kingdoms" fragments — the noun agrees with the
     whole through a complete-phrase plural selector, never a spliced suffix
     (docs/designs/i18n.md); modelled on countyCountText above */
  function ofCountiesText(s, have, total) {
    return FB.renderMessage(FB.msg('fx.ui.of_total_counties', {
      forms: {
        select: 'plural', param: 'total', cases: {
          one: '{have} of {total} county',
          other: '{have} of {total} counties'
        }
      }
    }, { have: have, total: total }), { state: s, viewer: s.player.charId });
  }
  function ofKingdomsText(s, have, total) {
    return FB.renderMessage(FB.msg('fx.ui.of_total_kingdoms', {
      forms: {
        select: 'plural', param: 'total', cases: {
          one: '{have} of {total} kingdom',
          other: '{have} of {total} kingdoms'
        }
      }
    }, { have: have, total: total }), { state: s, viewer: s.player.charId });
  }

  /* what the tapped county feeds: have/need toward its duke, king, emperor —
     the same rules checkTierPromotions promotes by. Shown only to landed
     players; a landless dreamer has no claim to weigh */
  function dejureNotes(s, dj) {
    const indep = FB.isPlayerSovereign(s);
    let out = '';
    function note(text) { return '<div class="progressnote">' + esc(text) + '</div>'; }
    const dp = FB.duchyProgress(s, dj.duchy), dname = FBDATA.duchies[dj.duchy].name;
    if (!dp.titled) {
      out += note(FB.T('⚜ {name} is one county alone — no duke’s title to claim.',
        { name: dname }));
    } else if (dp.have >= dp.need) {
      out += note(FB.T('⚜ {name}: you hold the majority, {held}.',
        { name: dname, held: ofCountiesText(s, dp.have, dp.total) }));
    } else {
      out += note(FB.T('⚜ {name}: you hold {held} — {need} make the duke.',
        { name: dname, held: ofCountiesText(s, dp.have, dp.total), need: dp.need }));
    }
    if (dj.kingdom) {
      const kp = FB.kingdomProgress(s, dj.kingdom), kname = FBDATA.kingdoms[dj.kingdom].name;
      if (kp.have >= kp.need) {
        out += note(indep
          ? FB.T('👑 {name}: you hold the majority, {held}.',
            { name: kname, held: ofCountiesText(s, kp.have, kp.total) })
          : FB.T('👑 {name}: you hold the majority, {held} — independence would make you its king.',
            { name: kname, held: ofCountiesText(s, kp.have, kp.total) }));
      } else {
        out += note(FB.T('👑 {name}: you hold {held} — {need} and independence make the king.',
          { name: kname, held: ofCountiesText(s, kp.have, kp.total), need: kp.need }));
      }
    }
    if (dj.empire) {
      const ep = FB.empireProgress(s, dj.empire), ename = FBDATA.empires[dj.empire].name;
      if (ep.have >= ep.need) {
        out += note(indep
          ? FB.T('🦅 {name}: you rule {share} — the imperial majority.',
            { name: ename, share: ofKingdomsText(s, ep.have, ep.total) })
          : FB.T('🦅 {name}: you rule {share} — independence would make you its emperor.',
            { name: ename, share: ofKingdomsText(s, ep.have, ep.total) }));
      } else {
        out += note(FB.T('🦅 {name}: you rule {share} — {need} and independence make the emperor.',
          { name: ename, share: ofKingdomsText(s, ep.have, ep.total), need: ep.need }));
      }
    }
    return out;
  }

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
      // what the host is made of (the same breakdown the war status shows)
      if (selA.units) {
        const u = selA.units;
        const compKeys = [
          ['levy', 'fx.warstate.comp_levy', { one: '{count} levyman', other: '{count} levy' }],
          ['arch', 'fx.warstate.comp_archers', { one: '{count} archer', other: '{count} archers' }],
          ['ret', 'fx.warstate.comp_retinue', { one: '{count} man-at-arms', other: '{count} men-at-arms' }],
          ['mercs', 'fx.warstate.comp_mercs', { one: '{count} mercenary', other: '{count} mercenaries' }]
        ];
        const parts = [];
        for (const ck of compKeys) {
          if (!u[ck[0]]) continue;
          parts.push(FB.renderKey(ck[1], {
            forms: { select: 'plural', param: 'count', cases: ck[2] }
          }, { count: u[ck[0]] }));
        }
        if (parts.length) h += '<div class="cmeta">' + esc(parts.join(', ')) + '</div>';
        if (selA.allied && selA.allied.men) {
          const ar = s.realms[selA.allied.ally];
          h += '<div class="cmeta">' + esc(FB.T(
            '🤝 {men} allied defenders from {realm}', {
              men: menText(s, selA.allied.men),
              realm: ar ? ar.name : selA.allied.ally
            })) + '</div>';
        }
      }
    }
    if (pr.wasteland) {
      h += '<div class="cmeta">' + esc(FB.T('Trackless {terrain}. No lord rules here — it feeds no duchy or crown.',
        { terrain: terrainName(pr.terrain) })) + '</div>';
    } else {
      const rid = s.owner[pid];
      const realm = s.realms[rid];
      const rel = FB.religionOf(pr.religion), cul = FB.cultureOf(pr.culture);
      const B = FBDATA.balance;
      const myRealm = rid === 'player';
      const realmMen = realm ? (myRealm ? FB.realmDefensiveStrength(s, 'player') :
        FB.realmDefensiveStrength(s, rid)) : 0;
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
          '</span><b><button class="linklike" data-liege="' + esc(cid) + '">' +
          esc(cr.name) + '</button>' + esc(mark) + '</b></div>';
      }
      const dj = FB.dejureOf(pid);
      if (dj.duchy) {
        const parts = [FBDATA.duchies[dj.duchy].name];
        if (dj.kingdom) parts.push(FBDATA.kingdoms[dj.kingdom].name);
        if (dj.empire) parts.push(FBDATA.empires[dj.empire].name);
        h += kv('De jure (rightful liege)', esc(parts.join(' › ')));
        if (s.player.provs && s.player.provs.length) h += dejureNotes(s, dj);
      } else {
        // a colony settled on empty land: owned, but tied to no title
        h += kv('De jure (rightful liege)', esc(FB.T('None — this land feeds no duchy or crown.')));
      }
      const sovereignHtml = realm
        ? '<button class="linklike" data-liege="' + esc(rid) + '" title="' +
          esc(FB.T('See this realm’s ruler')) + '">' + esc(realm.name) + '</button>'
        : '';
      h +=
        (realm ? kv('Sovereign', sovereignHtml) : '') +
        (realm ? kv('Realm size', esc(countyCountText(s, FB.realmProvinces(s, rid).length))) : '') +
        (realm ? kv('Realm host', '~' + esc(menText(s, realmMen))) : '') +
        (realm ? kv('Defensive alliance', esc(allianceText(s, rid))) : '') +
        kv('Culture', esc(cultureName(s, pr.culture))) +
        kv('Faith', rel.icon + ' ' + esc(religionName(s, pr.religion))) +
        kv('Terrain', esc(terrainName(pr.terrain)) + (pr.coastal ? ', ' + esc(FB.T('coastal')) : '')) +
        kv('Development', (s.dev[pid] || 1) + ' / ' + FB.devCap(s, pid)) +
        kv('Province levy', '~' + esc(menText(s, (s.dev[pid] || 1) * B.levyPerDev)));
      if (realm && !myRealm && FB.isPlayerSovereign(s)) {
        const realmOpinion = FB.realmOpinionOf(s, rid);
        h += kv('Their opinion of you', '<span class="' + FB.opClass(realmOpinion) + '">' +
          esc(FB.T('{opinion} ({band})', {
            opinion: signedOpinion(realmOpinion), band: opinionBand(realmOpinion)
          })) + '</span>');
        h += kv('Foreign policy', esc(FB.isForeignPolicyTarget(s, rid)
          ? foreignPolicyStanceText(s, rid) : FB.T('Out of reach')));
      }
      const setts = FB.settlementsOf(s, pid);
      if (setts.length) {
        // in your own demesne a settlement is a button: it opens the buildings
        // standing in THAT settlement and what each provides (UI.showSettlement)
        const own = FB.demesne(s).indexOf(pid) >= 0;
        h += kv('Settlements', setts.map(function (st, si) {
          const label = (st.kind === 'city' ? '🏙' : st.kind === 'town' ? '🏘' : '🏡') + ' ' + esc(st.name);
          return own
            ? '<button class="linklike settlink" data-sett="' + si + '" title="' +
              esc(FB.T('See the buildings of {settlement}', { settlement: st.name })) + '">' + label + '</button>'
            : label;
        }).join(' · '));
        if (own) {
          h += '<div class="hint">' + esc(FB.T('Each settlement keeps its own buildings — tap one to see them and raise more.')) + '</div>';
        }
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
    document.querySelectorAll('#tab-prov .settlink').forEach(function (btn) {
      btn.addEventListener('click', function () { UI.showSettlement(pid, +btn.dataset.sett); });
    });
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
    if (ev.travel && (ev.travel.kind === 'road' || ev.travel.kind === 'culture')) {
      return 'everyday';
    }
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

  /* Does any branch of this event ask for the naming of an heir? */
  function hasHeirPick(ev) {
    function has(fx) { return !!(fx && fx.pickHeir); }
    for (const o of (ev.options || [])) {
      if (has(o.effects) || has(o.success && o.success.effects) ||
        has(o.failure && o.failure.effects)) return true;
    }
    return false;
  }

  /* Titles and independence change the player's whole mode of play. Ordinary
     category automation may handle the surrounding story, but only the
     explicit "everything" setting may make this irreversible choice. */
  function hasTitleChoice(ev) {
    function has(fx) {
      return !!(fx && (fx.tierSet >= 3 || fx.tierUp || fx.declareIndependence ||
        fx.travelSettle));
    }
    for (const o of (ev.options || [])) {
      if (has(o.effects) || has(o.success && o.success.effects) ||
        has(o.failure && o.failure.effects)) return true;
    }
    return false;
  }

  function autoWants(ev, item) {
    const a = FB.game.auto;
    if (!a) return false;
    /* resolve everything: no event interrupts the days — only death itself
       (never an event) and the succession screen stop the flow */
    if (a.all) return true;
    /* the naming of an heir is a human choice, however automation is set */
    if (hasHeirPick(ev)) return false;
    /* accepting a title or declaring independence is likewise shown */
    if (hasTitleChoice(ev)) return false;
    /* an event that could drop the player to 0 health is always shown,
       however the automation is set — the killing blow is never silent */
    const s = FB.state;
    if (s && s.player && !s.player.dead) {
      const me = s.chars[s.player.charId];
      const hp = me && me.health !== undefined ? me.health : 8;
      if (hp + worstWound(ev) <= 0) return false;
    }
    const cat = autoCategory(ev, item);
    if (cat === 'everyday') return !!a.minor;
    if (cat === 'war') return !!a.war;
    return !!a.major;
  }

  /* Rough worth of an option for the auto-picker. Options needing a human
     (naming an heir) score far below anything else. */
  /* the war-council customs carry no numbers for fxScore to read — without
     these, "Fall back and refit" (health +1) outscored "Press the siege"
     every season and an automated war could never take land */
  const CUSTOM_FX_SCORE = { war_siege: 12, war_win: 8, war_hunt: 6, war_loss: -8 };
  function fxScore(fx) {
    if (!fx) return 0;
    let v = 0;
    if (fx.custom && CUSTOM_FX_SCORE[fx.custom]) v += CUSTOM_FX_SCORE[fx.custom];
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
    /* while the machine resolves, a pickHeir effect names the first in line
       silently (see applyEffects) instead of opening the heir modal */
    UI.autoResolving = true;
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
      if (pick.effects) FB.applyEffects(s, pick.effects, ctx, ev);
      const branch = ok ? pick.success : pick.failure;
      if (branch) {
        if (branch.effects) FB.applyEffects(s, branch.effects, ctx, ev);
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
      FB.applyEffects(s, pick.effects, ctx, ev);
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
    UI.autoResolving = false;
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
    function hr(val, label) {
      return '<label class="autorow"><input type="radio" name="ar-hosts" value="' + val + '"' +
        ((a.hosts || 'manual') === val ? ' checked' : '') + '> ' + label + '</label>';
    }
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'While the days flow (or fast-forward), the chosen kinds of events resolve themselves. Every outcome is written to the Chronicle.')) +
      '</p></div>';
    h += cb('ar-minor', a.minor, '<b>Autoresolve minor events</b>', 'Everyday happenings — the small incidents of daily life.');
    h += cb('ar-major', a.major, '<b>Autoresolve major events</b>', 'Once-in-a-life moments and story events — but never one that could cost you your life, name an heir, accept a title, or declare independence. Those are always shown.');
    h += cb('ar-war', a.war, '<b>Autoresolve war events</b>', 'Musters, war councils, tribute envoys, and battle reports. Your hosts still raise, march, and fight on the map by their own rules — this chooses your orders each season.');
    h += cb('ar-all', a.all, '<b>Autoresolve everything</b>', 'No event ever interrupts the days — even mortal danger and the naming of an heir resolve on their own. Only your death and the choice of a successor stop the flow.');
    h += '<div class="gm-body-text" style="margin-top:8px"><p>How to choose between options:</p></div>';
    h += rb('safe', 'Prudent — avoid risk, prefer sure gains');
    h += rb('bold', 'Bold — chase the bigger prize');
    h += rb('first', 'First option — take the default');
    h += '<div class="gm-body-text" style="margin-top:8px"><p>' + esc(FB.T(
      'Command your host in war (it marches only while standing idle — a route you tap by hand always plays out, and a halted host holds):')) + '</p></div>';
    h += hr('manual', 'Manually — you march the host yourself');
    h += hr('def', 'Defensive — throw back invaders, then refit at home');
    h += hr('off', 'Offensive — hunt their host when stronger, then besiege the prize');
    h += '<div class="gm-body-text" style="margin-top:8px"><p>Stewardship (tier 3+, once a season):</p></div>';
    h += cb('ar-build', a.build, 'Raise buildings automatically', 'The cheapest available building, when the treasury can spare it.');
    h += cb('ar-research', a.research, 'Adopt innovations automatically', 'The cheapest innovation within reach of your scholarship.');
    h += '<div class="gm-footer"><button class="btn primary" id="ar-done">Done</button></div>';
    openModal('⚙ Automation', h, { modalClass: 'fullsheet-modal' });
    function sync() {
      a.minor = $('ar-minor').checked;
      a.major = $('ar-major').checked;
      a.war = $('ar-war').checked;
      a.all = $('ar-all').checked;
      a.build = $('ar-build').checked;
      a.research = $('ar-research').checked;
      const r = document.querySelector('input[name=ar-style]:checked');
      if (r) a.style = r.value;
      const hsel = document.querySelector('input[name=ar-hosts]:checked');
      if (hsel) a.hosts = hsel.value;
      FB.game.saveAuto();
      if (FB.state) UI.refresh();
    }
    ['ar-minor', 'ar-major', 'ar-war', 'ar-all', 'ar-build', 'ar-research'].forEach(function (id) { $(id).addEventListener('change', sync); });
    document.querySelectorAll('input[name=ar-style]').forEach(function (r) { r.addEventListener('change', sync); });
    document.querySelectorAll('input[name=ar-hosts]').forEach(function (r) { r.addEventListener('change', sync); });
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
  UI.cancelTravelEvents = function () {
    pendingEvents = pendingEvents.filter(function (item) { return !item.travel; });
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
        btn.addEventListener('click', function () { if (eventInputGuarded()) return; chooseOption(ev, opt, ctx); });
      })(o);
      box.appendChild(btn);
    }
    FB.localizeTree(box);
    armEventGuard();
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
      if (opt.effects) FB.applyEffects(s, opt.effects, ctx, ev);
      if (branch) {
        if (branch.effects) FB.applyEffects(s, branch.effects, ctx, ev);
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
      FB.applyEffects(s, opt.effects, ctx, ev);
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
    btn.addEventListener('click', function () { if (eventInputGuarded()) return; nextEvent(); });
    box.appendChild(btn);
    armEventGuard();
    btn.focus();
  }

  UI.eventsBusy = function () { return eventOpen; };

  /* ================= generic modal ================= */
  function openModal(title, bodyHtml, opts) {
    UI._gmDismiss = !(opts && opts.dismissable === false);
    const gm = $('genmodal');
    if (gm.classList.contains('hidden')) {
      UI._gmReturnFocus = document.activeElement;
      UI._gmReturnAction = UI._gmReturnFocus && UI._gmReturnFocus.dataset
        ? UI._gmReturnFocus.dataset.actionId : null;
    }
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
        const b = $('gm-body').querySelector(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]');
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
    const back = UI._gmReturnFocus;
    const actionId = UI._gmReturnAction;
    UI._gmReturnFocus = null;
    UI._gmReturnAction = null;
    if (back && document.documentElement.contains(back)) {
      back.focus();
      return;
    }
    if (actionId) {
      const actions = document.querySelectorAll('[data-action-id]');
      for (const action of actions) {
        if (action.dataset.actionId === actionId) {
          action.focus();
          return;
        }
      }
    }
    if (FB.state && !$('game').classList.contains('hidden') &&
      $('eventmodal').classList.contains('hidden')) $('btn-endturn').focus();
  };

  /* ================= overland travel picker ================= */
  let travelPicker = null;

  function travelPurposeText(s, id, path) {
    const def = FBDATA.travelPurposes[id];
    return def ? FB.dataText(s, s.player.charId, 'travelPurpose', id, def, path, {}) : id;
  }

  UI.showTravelPurposes = function () {
    const s = FB.state;
    const eligible = FB.travelEligible(s);
    if (eligible !== true) { UI.toast(eligible); return; }
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Choose why you are leaving. The next screen marks every valid county and keeps an accessible destination list beside the map.')) +
      '</p></div><div class="gm-list">';
    for (const id in FBDATA.travelPurposes) {
      const def = FBDATA.travelPurposes[id];
      const destinations = FB.travelDestinations(s, id);
      const affordable = destinations.some(function (item) { return item.cost <= s.player.gold; });
      h += '<button class="actionbtn" data-travel-purpose="' + esc(id) + '"' +
        (destinations.length && affordable ? '' : ' disabled') + '>' +
        esc((def.icon || '🧭') + ' ' + travelPurposeText(s, id, 'name')) +
        '<span class="adesc">' + esc(travelPurposeText(s, id, 'desc')) + ' ' +
        esc(destinations.length
          ? FB.T('{count} destinations in reach.', {count:destinations.length})
          : FB.T('No qualifying destination can be reached.')) + '</span></button>';
    }
    h += '</div><div class="gm-footer"><button class="btn" id="travel-purpose-cancel">' +
      esc(FB.T('Cancel')) + '</button></div>';
    openModal('🧭 Take to the road…', h);
    document.querySelectorAll('[data-travel-purpose]').forEach(function (button) {
      button.addEventListener('click', function () {
        UI.closeModal();
        UI.showTravelDestinations(button.getAttribute('data-travel-purpose'));
      });
    });
    $('travel-purpose-cancel').addEventListener('click', UI.closeModal);
  };

  UI.showTravelDestinations = function (purposeId) {
    const s = FB.state;
    const choices = FB.travelDestinations(s, purposeId);
    if (!choices.length) {
      UI.toast(FB.T('No qualifying destination can be reached.'));
      return;
    }
    const wasPaused = FB.game.paused;
    FB.game.setPaused(true);
    travelPicker = {
      purpose:purposeId,
      choices:choices,
      selected:null,
      wasPaused:wasPaused
    };
    document.body.classList.add('travel-picking');
    $('travel-picker').classList.remove('hidden');
    $('travel-picker-title').textContent = FB.T('Choose a destination for {purpose}', {
      purpose:travelPurposeText(s, purposeId, 'name')
    });
    const list = $('travel-destination-list');
    let h = '';
    for (let i = 0; i < choices.length; i++) {
      const item = choices[i];
      const pr = FB.world.byId[item.destinationId];
      const short = item.cost > s.player.gold;
      h += '<button class="travel-destination" data-travel-destination="' +
        esc(item.destinationId) + '" data-choice-index="' + i + '">' +
        esc(pr ? pr.name : item.destinationId) +
        '<span class="adesc">' + esc(FB.T(
          '{legs} county legs · {days} days each way · {money:cost}', {
            legs:item.legs, days:item.days, cost:item.cost
          })) + (short ? ' · ' + esc(FB.T('not enough money')) : '') +
        '</span></button>';
    }
    list.innerHTML = h;
    FB.map.travelTargets = choices.map(function (item) { return item.destinationId; });
    FB.map.travelSelected = null;
    FB.map.travelPreview = null;
    FB.map.select(null);
    FB.map.request();
    $('travel-picker-summary').textContent = FB.T(
      'Tap a marked county or choose it from the list. Routes use settled counties and authored straits.');
    $('travel-picker-continue').disabled = true;
    document.querySelectorAll('[data-travel-destination]').forEach(function (button) {
      button.addEventListener('click', function () {
        UI.travelPickProvince(button.getAttribute('data-travel-destination'), true);
      });
    });
    setTimeout(function () {
      const first = list.querySelector('button');
      if (first) first.focus();
    }, 0);
  };

  UI.travelPickerOpen = function () {
    return !!travelPicker && !$('travel-picker').classList.contains('hidden');
  };

  UI.travelPickProvince = function (pid, center) {
    if (!travelPicker) return false;
    let item = null;
    for (let i = 0; i < travelPicker.choices.length; i++) {
      if (travelPicker.choices[i].destinationId === pid) {
        item = travelPicker.choices[i];
        break;
      }
    }
    if (!item) {
      UI.toast(FB.T('That county does not qualify for this journey.'));
      return false;
    }
    travelPicker.selected = item;
    FB.map.travelSelected = pid;
    FB.map.travelPreview = [FB.state.player.provinceId].concat(item.route);
    FB.map.select(pid, function (id) { return id; });
    if (center) FB.map.centerOn(pid, FB.map.zoom);
    let selectedButton = null;
    document.querySelectorAll('[data-travel-destination]').forEach(function (button) {
      const selected = button.getAttribute('data-travel-destination') === pid;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      if (selected) selectedButton = button;
    });
    if (selectedButton && !center) selectedButton.scrollIntoView({block:'nearest'});
    const pr = FB.world.byId[pid];
    const affordable = item.cost <= FB.state.player.gold;
    $('travel-picker-summary').textContent = affordable
      ? FB.T('{destination}: {legs} legs, {days} days each way, {money:cost}.', {
          destination:pr.name, legs:item.legs, days:item.days, cost:item.cost
        })
      : FB.T('{destination} costs {money:cost}; you have {money:gold}.', {
          destination:pr.name, cost:item.cost, gold:Math.floor(FB.state.player.gold)
        });
    $('travel-picker-continue').disabled = !affordable;
    FB.map.request();
    return true;
  };

  function reviewTravelChoice() {
    if (!travelPicker || !travelPicker.selected) return;
    const item = travelPicker.selected;
    const s = FB.state;
    const def = FBDATA.travelPurposes[travelPicker.purpose];
    const pr = FB.world.byId[item.destinationId];
    const legDays = FBDATA.balance.travelLegDays || 3;
    let h = '<div class="gm-body-text">' +
      '<p><b>' + esc((def.icon || '🧭') + ' ' +
        travelPurposeText(s, travelPicker.purpose, 'name')) + '</b></p>' +
      '<p>' + esc(FB.T(
        '{destination} lies {legs} county legs away. The outbound road takes {outbound} days and the return takes {returnDays} days before encounters or decisions.', {
          destination:pr.name,
          legs:item.legs,
          outbound:item.legs * legDays,
          returnDays:item.legs * legDays
        })) + '</p>' +
      '<p>' + esc(FB.T(
        'At the destination you must stay and find local work for at least {days} days before returning home.', {
          days:FBDATA.balance.travelMinStayDays || 90
        })) + '</p>' +
      '<p>' + esc(s.player.travelSettlement
        ? FB.T('This character has already made their one permanent move; this journey cannot relocate the household again.')
        : FB.T('After a year of local life, permanent settlement may become available. Each character can relocate the household only once in their lifetime.')) + '</p>' +
      '<p><b>' + esc(FB.T('Exact upfront cost: {money:cost}.', {cost:item.cost})) +
      '</b> ' + esc(FB.T('Turning back refunds nothing.')) + '</p></div>' +
      '<div class="gm-list"><button class="actionbtn" id="travel-depart">🧭 ' +
      esc(FB.T('Depart for {destination}', {destination:pr.name})) +
      '</button><button class="actionbtn" id="travel-review-back">' +
      esc(FB.T('Back to destinations')) + '</button></div>';
    openModal('Review journey', h, {dismissable:false});
    $('travel-depart').addEventListener('click', function () {
      if (FB.travelStart(s, travelPicker.purpose, item.destinationId, item.destinationRealm)) {
        UI.cancelTravelPicker();
        UI.closeModal();
      }
    });
    $('travel-review-back').addEventListener('click', function () {
      UI.closeModal();
      const selected = document.querySelector('.travel-destination.selected');
      if (selected) selected.focus();
    });
  }

  function closeTravelPicker(restorePause) {
    const wasPaused = travelPicker ? travelPicker.wasPaused : true;
    travelPicker = null;
    document.body.classList.remove('travel-picking');
    $('travel-picker').classList.add('hidden');
    FB.map.travelTargets = null;
    FB.map.travelSelected = null;
    FB.map.travelPreview = null;
    FB.map.select(null);
    FB.map.request();
    if (restorePause && !wasPaused) FB.game.setPaused(false);
  }

  UI.cancelTravelPicker = function () {
    closeTravelPicker(true);
  };

  UI.showTravelSettlement = function () {
    const s = FB.state;
    const t = s && s.player.travel;
    const eligible = s && FB.travelSettlementEligible
      ? FB.travelSettlementEligible(s) : false;
    if (!s || !t || eligible !== true) {
      if (eligible) UI.toast(eligible);
      return;
    }
    const c = s.chars[s.player.charId];
    const destination = FB.world.byId[t.destinationId];
    if (!c || !destination) return;
    const h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Move the household home to {destination}. Existing land, enterprises, culture, and faith will not move or change.', {
        destination:destination.name
      })) + '</p><p class="warnote"><b>' + esc(FB.T(
      'This is {name}’s only permanent move for this lifetime. No later journey can resettle the household again.', {
        name:FB.fullName(c)
      })) + '</b></p></div><div class="gm-list">' +
      '<button type="button" class="actionbtn" id="travel-settle-confirm">🏠 ' +
      esc(FB.T('Make {destination} our permanent home', {
        destination:destination.name
      })) + '</button><button type="button" class="actionbtn" id="travel-settle-cancel">' +
      esc(FB.T('Keep staying for now')) + '</button></div>';
    openModal(FB.T('Settle permanently in {destination}?', {
      destination:destination.name
    }), h);
    $('travel-settle-confirm').addEventListener('click', function () {
      UI.closeModal();
      FB.travelSettle(s);
    });
    $('travel-settle-cancel').addEventListener('click', UI.closeModal);
  };

  /* ================= war target picker ================= */
  UI.showWarTargets = function () {
    const s = FB.state;
    const causes = FB.warCauses(s);
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'A war needs a lawful cause. Land is taken only by siege: march your host onto the named prize and press the siege at three war councils. Field victories bring the enemy to the table, nothing more.')) +
      '</p></div><div class="gm-list">';
    for (let ci = 0; ci < causes.length; ci++) {
      const cause = causes[ci];
      const pid = cause.target;
      const pr = FB.world.byId[pid];
      const rid = cause.enemy || s.owner[pid];
      const realm = s.realms[rid];
      const enMen = FB.realmDefensiveStrength(s, rid);
      let causeText = '';
      if (cause.type === 'fabricated') causeText = FB.T('Fabricated county claim');
      else if (cause.type === 'restoration') {
        causeText = FB.T('Restore the crown of {title}', { title: cause.titleName || (realm ? realm.name : '') });
      } else {
        const def = cause.titleKind === 'duchy' ? FBDATA.duchies[cause.titleId]
          : cause.titleKind === 'kingdom' ? FBDATA.kingdoms[cause.titleId]
          : FBDATA.empires[cause.titleId];
        causeText = FB.T('De jure right through {title}', { title: def ? def.name : cause.titleId });
      }
      const support = FB.alliedReinforcement(s, rid);
      h += '<button class="actionbtn" data-war-cause="' + ci + '">⚔ ' + esc(pr.name) +
        '<span class="adesc">' + esc(FB.T(
          '{cause} · held by {realm} ({counties}) · defense ~{theirs} against your ~{yours}{support}', {
            cause: causeText,
            realm: realm ? realm.name : '?',
            counties: countyCountText(s, FB.realmProvinces(s, rid).length),
            theirs: menText(s, enMen),
            yours: menText(s, FB.playerLevy(s)),
            support: support.men && s.realms[support.ally]
              ? FB.T(' (including ~{men} from {ally})', {
                men: menText(s, support.men), ally: s.realms[support.ally].name
              }) : ''
          })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Think better of it</button>';
    openModal('Choose Your Conquest', h);
    document.querySelectorAll('[data-war-cause]').forEach(function (b) {
      b.addEventListener('click', function () {
        FB.startPlayerWar(FB.state, causes[Number(b.dataset.warCause)]);
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
     The deed is a fast county ledger: choose a province when necessary, then
     Raise Next repeatedly without leaving the dialog. The Land-tab settlement
     path still passes idx for exact placement. */
  function buildingEffects(d) {
    const fx = [];
    if (d.tax) fx.push(FB.T('+{money:amount} each season', { amount: d.tax }));
    if (d.piety) fx.push(FB.T('+{amount} piety each season', { amount: d.piety }));
    if (d.research) fx.push(FB.T('+{amount} scholarship each season', { amount: d.research }));
    if (d.levy) fx.push(FB.T('+{men} men to the levy', { men: d.levy }));
    if (d.upkeep) fx.push(FB.T('−{money:amount} upkeep each season', { amount: d.upkeep }));
    if (d.dev) fx.push(FB.T('+{amount} development when raised', { amount: d.dev }));
    if (d.pop) fx.push(FB.T('+{amount} popular opinion when raised', { amount: d.pop }));
    if (d.prestige) fx.push(FB.T('+{amount} prestige when raised', { amount: d.prestige }));
    return fx;
  }

  function buildingUnavailableText(s, pid, id, d) {
    const pr = FB.world.byId[pid];
    if (d.homeOnly && FB.homeProv(s) !== pid) return FB.T('Only your home county can raise this.');
    if (d.maxDemesne && FB.buildingCount(s, id, false) >= d.maxDemesne) {
      return FB.T('Only {count} may stand across your demesne.', { count: d.maxDemesne });
    }
    if (d.maxCounty && FB.buildingCountIn(s, pid, id, false) >= d.maxCounty) {
      return FB.T('Only {count} may stand in one county.', { count: d.maxCounty });
    }
    if (d.devMin && (s.dev[pid] || 1) < d.devMin) {
      return FB.T('Requires development {development}.', { development: d.devMin });
    }
    if (d.coastal && (!pr || !pr.coastal)) return FB.T('Requires a coastal county.');
    if (d.terrains && (!pr || d.terrains.indexOf(pr.terrain) < 0)) {
      return FB.T('The terrain is unsuitable.');
    }
    return FB.T('No open settlement remains.');
  }

  UI.showBuildings = function (pid, idx, keep) {
    const s = FB.state;
    const provs = FB.demesne(s);
    if (!pid && provs.length > 1) {
      let h = '<div class="gm-list">';
      for (const id of provs) {
        const pr = FB.world.byId[id];
        let open = 0;
        const sts = FB.settlementsOf(s, id);
        for (let ix = 0; ix < sts.length; ix++) open += FB.buildable(s, id, ix).length;
        h += '<button class="actionbtn" data-bprov="' + esc(id) + '"' + (open ? '' : ' disabled') + '>🏘 ' + esc(pr.name) +
          '<span class="adesc">' + esc(FB.T(
            'development {development} · {built} built · {remaining}', {
              development: s.dev[id] || 1,
              built: FB.builtIn(s, id).filter(function (e) { return !e.ruined; }).length,
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
    const sts = FB.settlementsOf(s, pid);
    if (idx === undefined || idx === null) {
      const growth = Math.round(((FBDATA.balance.buildingRepeatCostGrowth || 1.5) - 1) * 100);
      let h = '<div class="gm-body-text"><p>' + esc(FB.T(
        'Use Raise Next to build in the next open settlement; this ledger stays open so you can keep building.')) +
        '</p><p><b>' + esc(FB.T(
          'Repeat-price warning: every further copy of the same building in this county costs {percent}% more. Each button always shows the exact next price.',
          { percent: growth })) + '</b></p></div><div class="gm-list">';
      for (const id in FBDATA.buildings) {
        const d = FBDATA.buildings[id];
        const slots = FB.buildingSlots(s, pid, id);
        const standing = FB.buildingCountIn(s, pid, id, false);
        const copies = FB.buildingCountIn(s, pid, id, true);
        const cost = FB.buildCost(s, pid, id);
        const effects = buildingEffects(d).join(' · ');
        if (slots.length) {
          const short = s.player.gold < cost;
          const repeat = copies
            ? FB.T('Repeat copy {number}: its price has risen to {money:cost}.',
              { number: copies + 1, cost: cost })
            : FB.T('First copy in this county: {money:cost}.', { cost: cost });
          h += '<button class="actionbtn" data-bquick="' + esc(id) + '"' + (short ? ' disabled' : '') + '>' +
            esc(FB.T('{icon} {name} — Raise Next for {money:cost}', {
              icon: d.icon, name: dt(s, 'building', id, d, 'name'), cost: cost
            })) + '<span class="adesc">' +
            esc(FB.T('{standing} standing · next in {settlement}.', {
              standing: standing, settlement: sts[slots[0]].name
            })) + ' ' + esc(repeat) + (effects ? ' ' + esc(effects) : '') +
            (short ? ' ' + esc(FB.T('(not enough money)')) : '') + '</span></button>';
        } else {
          h += '<button class="actionbtn" disabled>' + d.icon + ' ' +
            esc(dt(s, 'building', id, d, 'name')) + '<span class="adesc">' +
            esc(buildingUnavailableText(s, pid, id, d)) +
            (effects ? ' ' + esc(effects) : '') + '</span></button>';
        }
      }
      h += '</div><button class="btn" id="gm-cancel">' +
        esc(FB.T(provs.length > 1 ? 'Back' : 'Not now')) + '</button>';
      openModal(FB.T('Building Works in {province}', { province: pr.name }), h);
      document.querySelectorAll('[data-bquick]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const scrollTop = $('gm-body').scrollTop;
          const focusId = btn.dataset.bquick;
          const slots = FB.buildingSlots(FB.state, pid, btn.dataset.bquick);
          if (slots.length && FB.build(FB.state, pid, slots[0], btn.dataset.bquick)) {
            UI.refresh();
          }
          UI.showBuildings(pid, null, { scrollTop: scrollTop, focusId: focusId });
        });
      });
      if (keep) {
        $('gm-body').scrollTop = keep.scrollTop || 0;
        setTimeout(function () {
          let found = false;
          document.querySelectorAll('[data-bquick]').forEach(function (same) {
            if (same.dataset.bquick === keep.focusId) {
              found = true;
              same.focus();
            }
          });
          if (!found) $('gm-body').scrollTop = keep.scrollTop || 0;
        }, 0);
      }
      $('gm-cancel').addEventListener('click', provs.length > 1
        ? function () { UI.showBuildings(); } : UI.closeModal);
      return;
    }
    const st = sts[idx];
    if (!st) return;
    const done = [];
    for (const e of FB.builtIn(s, pid)) if (e.s === idx) done.push(e);
    let h = '<div class="gm-list">';
    for (const b of FB.buildable(s, pid, idx)) {
      const short = s.player.gold < b.cost;
      const copies = FB.buildingCountIn(s, pid, b.id, true);
      const repeat = copies
        ? FB.T('Repeat copy {number}: its price has risen to {money:cost}.',
          { number: copies + 1, cost: b.cost })
        : FB.T('First copy in this county: {money:cost}.', { cost: b.cost });
      h += '<button class="actionbtn" data-build="' + esc(b.id) + '"' + (short ? ' disabled' : '') + '>' +
        esc(FB.T('{icon} {name} — {money:cost}', {
          icon: b.def.icon, name: dt(s, 'building', b.id, b.def, 'name'), cost: b.cost
        })) + '<span class="adesc">' + esc(dt(s, 'building', b.id, b.def, 'desc')) +
        ' ' + esc(repeat) + ' ' + esc(buildingEffects(b.def).join(' · ')) +
        (short ? ' ' + esc(FB.T('(not enough money)')) : '') + '</span></button>';
    }
    h += '</div>';
    if (done.length) {
      h += '<p class="hint">' + esc(FB.T('Already occupying {settlement}:',
        { settlement: st.name })) + ' ' + done.map(function (e) {
        const d = FBDATA.buildings[e.id];
        if (!d) return esc(e.id);
        const name = dt(s, 'building', e.id, d, 'name');
        return d.icon + ' ' + esc(e.ruined ? FB.T('Ruins of {building}', { building: name }) : name);
      }).join(' · ') + '</p>';
    }
    h += '<button class="btn" id="gm-cancel">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Raise a Building in {settlement}', { settlement: st.name }), h);
    document.querySelectorAll('[data-build]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const focusId = btn.dataset.build;
        if (FB.build(FB.state, pid, idx, btn.dataset.build)) UI.refresh();
        UI.showBuildings(pid, idx, { focusId: focusId });
      });
    });
    if (keep && keep.focusId) {
      setTimeout(function () {
        document.querySelectorAll('[data-build]').forEach(function (same) {
          if (same.dataset.build === keep.focusId) same.focus();
        });
      }, 0);
    }
    $('gm-cancel').addEventListener('click', function () { UI.showBuildings(pid); });
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

  /* ================= settlement view =================
     Tapping a settlement in your own demesne (Land tab) opens what stands
     THERE: buildings are per-settlement ({ s: idx, id } entries), so the
     list filters to this settlement, and the "raise" button opens the
     building picker straight at this settlement's list. */
  UI.showSettlement = function (pid, idx) {
    const s = FB.state;
    const pr = FB.world.byId[pid];
    if (!s || !pr) return;
    const st = FB.settlementsOf(s, pid)[idx];
    if (!st) return;
    const done = [];
    for (const e of FB.builtIn(s, pid)) if (e.s === idx) done.push(e);
    let h = '';
    if (done.length) {
      for (const e of done) {
        const id = e.id;
        const d = FBDATA.buildings[id];
        if (!d) continue;
        if (e.ruined) {
          h += '<div class="kv"><span>' + d.icon + ' ' +
            esc(FB.T('Ruins of {building}', { building: dt(s, 'building', id, d, 'name') })) +
            '</span><b>' + esc(FB.T('No benefit · no upkeep')) + '</b></div>';
        } else {
          h += '<div class="kv"><span>' + d.icon + ' ' + esc(dt(s, 'building', id, d, 'name')) +
            '</span><b>' + esc(buildingEffects(d).join(' · ') || '—') + '</b></div>' +
            '<div class="hint settdesc">' + esc(dt(s, 'building', id, d, 'desc')) + '</div>' +
            '<button class="btn sett-demolish" data-demolish="' + esc(id) + '">' +
            esc(FB.T('Demolish…')) + '</button>';
        }
      }
    } else {
      h += '<p class="hint">' + esc(FB.T('No buildings stand in {settlement} yet.',
        { settlement: st.name })) + '</p>';
    }
    const canRaise = FB.demesne(s).indexOf(pid) >= 0 && s.player.tier >= 3 &&
      FB.buildable(s, pid, idx).length > 0;
    if (canRaise) {
      h += '<div class="gm-list"><button class="actionbtn" id="gm-raise">' +
        esc(FB.T('🏗 Raise a building…')) + '</button></div>';
    }
    h += '<button class="btn" id="gm-cancel">' + esc(FB.T('Done')) + '</button>';
    openModal(SETT_ICON[st.kind] + ' ' + st.name, h);
    if (canRaise) {
      $('gm-raise').addEventListener('click', function () { UI.showBuildings(pid, idx); });
    }
    document.querySelectorAll('[data-demolish]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.dataset.demolish;
        const d = FBDATA.buildings[id];
        const name = dt(FB.state, 'building', id, d, 'name');
        let body = '<div class="gm-body-text"><p>' + esc(FB.T(
          'Demolishing {building} is permanent and gives no refund. Its ongoing benefits and upkeep will end, and ruins will occupy this settlement.',
          { building: name })) + '</p></div><div class="gm-list">' +
          '<button class="actionbtn op-bad" id="gm-demolish-confirm">' +
          esc(FB.T('Demolish {building}', { building: name })) + '</button></div>' +
          '<button class="btn" id="gm-demolish-back">' + esc(FB.T('Keep it')) + '</button>';
        openModal(FB.T('Demolish {building}?', { building: name }), body);
        $('gm-demolish-confirm').addEventListener('click', function () {
          if (FB.demolishBuilding(FB.state, pid, idx, id)) {
            UI.toast('🏚 {building} was demolished.', { building: name });
            UI.refresh();
          }
          UI.showSettlement(pid, idx);
        });
        $('gm-demolish-back').addEventListener('click', function () { UI.showSettlement(pid, idx); });
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
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
        const def = FBDATA.plots[btn.dataset.plot];
        if (def && def.target) UI.showPlotTargets(btn.dataset.plot);
        else {
          FB.beginPlot(FB.state, btn.dataset.plot);
          UI.closeModal(); UI.refresh();
        }
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  UI.showPlotTargets = function (plotId) {
    const s = FB.state, def = FBDATA.plots[plotId];
    if (!def) return;
    const targets = FB.plotTargets(s, def);
    let h = '<p class="hint">' + esc(FB.T(
      'Choose the county this plot concerns. Its identity remains attached to the plot through discovery and resolution.')) +
      '</p><div class="gm-list">';
    for (const pid of targets) {
      const pr = FB.world.byId[pid], r = s.realms[s.owner[pid]];
      h += '<button class="actionbtn" data-plot-target="' + esc(pid) + '">📜 ' + esc(pr.name) +
        '<span class="adesc">' + esc(FB.T('Held by {realm}', {
          realm: r ? r.name : FB.T('another realm')
        })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-back">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Choose the Target'), h);
    document.querySelectorAll('[data-plot-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.beginPlot(FB.state, plotId, { pid: btn.dataset.plotTarget });
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-back').addEventListener('click', UI.showPlots);
  };

  /* ================= envoy picker ================= */
  UI.showEnvoys = function () {
    const s = FB.state;
    let h = '<p class="hint">' + esc(FB.T(
      'A peace envoy carries {money:10} in gifts. Kings and emperors may instead offer one defensive alliance at opinion 60+, carrying {money:25}; either offer uses the same envoy odds.')) +
      '</p><div class="gm-list">';
    const pactTargets = FB.envoyTargets(s);
    const allianceTargets = FB.allianceOfferTargets(s);
    const targetMap = {}, targets = [];
    for (const rid of pactTargets.concat(allianceTargets)) {
      if (!targetMap[rid]) { targetMap[rid] = 1; targets.push(rid); }
    }
    for (const rid of targets) {
      const r = s.realms[rid];
      const men = Math.round(FB.realmStrength(s, rid) * FBDATA.balance.levyPerDev * (FBDATA.balance.aiHostPerDev || 0.3));
      const opinion = FB.realmOpinionOf(s, rid);
      if (pactTargets.indexOf(rid) >= 0) {
        h += '<button class="actionbtn" data-envoy="' + esc(rid) + '"' +
          (s.player.gold < 10 ? ' disabled' : '') + '>🕊 ' + esc(FB.T('Peace pact with {realm}', { realm: r.name })) +
          '<span class="adesc">' + esc(FB.T('{ruler} · {counties} · fields ~{men} · opinion {opinion} · chance ~{chance}%', {
            ruler: r.ruler.name,
            counties: countyCountText(s, FB.realmProvinces(s, rid).length),
            men: menText(s, men),
            opinion: signedOpinion(opinion),
            chance: Math.round(FB.envoyChance(s, rid) * 100)
          })) + '</span></button>';
      }
      if (allianceTargets.indexOf(rid) >= 0) {
        h += '<button class="actionbtn" data-alliance-offer="' + esc(rid) + '"' +
          (s.player.gold < 25 ? ' disabled' : '') + '>🤝 ' + esc(FB.T('Defensive alliance with {realm}', { realm: r.name })) +
          '<span class="adesc">' + esc(FB.T('{ruler} · opinion {opinion} · chance ~{chance}% · their aid would add up to ~{men} defenders', {
          ruler: r.ruler.name,
          opinion: signedOpinion(opinion),
          chance: Math.round(FB.envoyChance(s, rid) * 100),
          men: menText(s, Math.round(Math.min(men * 0.25, FB.playerLevy(s) * 0.5)))
        })) + '</span></button>';
      }
    }
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Send an Envoy', h);
    document.querySelectorAll('[data-envoy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.sendEnvoy(FB.state, btn.dataset.envoy);
        UI.closeModal(); UI.refresh();
      });
    });
    document.querySelectorAll('[data-alliance-offer]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.offerAlliance(FB.state, btn.dataset.allianceOffer);
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* ================= political attention picker ================= */
  UI.showForeignPolicy = function () {
    const s = FB.state;
    const capacity = FB.politicalAttentionCapacity(s);
    if (!capacity) return;
    const targets = FB.foreignPolicyTargets(s);
    const used = FB.foreignPolicyUsed(s);
    let h = '<p class="hint">' + esc(FB.T(
      'Political attention is assigned, not spent. Each active direction changes that court’s opinion every season and remains in force until you change it.')) +
      '</p><div class="progressnote">' + esc(FB.T(
        'Political attention: {used} of {capacity} assigned.', {
          used: used, capacity: capacity
        })) + '</div><div class="gm-list">';
    for (const rid of targets) {
      const r = s.realms[rid];
      const opinion = FB.realmOpinionOf(s, rid);
      const men = Math.round(FB.realmStrength(s, rid) * FBDATA.balance.levyPerDev *
        (FBDATA.balance.aiHostPerDev || 0.3));
      h += '<button class="actionbtn" data-policy-target="' + esc(rid) + '">🕊 ' + esc(r.name) +
        '<span class="adesc">' + esc(FB.T(
          '{title} {ruler} · opinion {opinion} ({band}) · fields ~{men} · {stance} · {status}', {
            title: FB.realmRankTitle(s, r),
            ruler: r.ruler.name,
            opinion: signedOpinion(opinion),
            band: opinionBand(opinion),
            men: menText(s, men),
            stance: foreignPolicyStanceText(s, rid),
            status: foreignPolicyStatusText(s, rid)
          })) + '</span></button>';
    }
    h += '</div><button class="btn gm-footer" id="gm-cancel">' + esc(FB.T('Done')) + '</button>';
    openModal(FB.T('Foreign Policy'), h);
    document.querySelectorAll('[data-policy-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        UI.showForeignPolicyStance(btn.dataset.policyTarget);
      });
    });
    $('gm-cancel').addEventListener('click', function () { UI.closeModal(); UI.refresh(); });
  };

  UI.showForeignPolicyStance = function (rid) {
    const s = FB.state;
    const r = s.realms[rid];
    if (!r || !FB.isForeignPolicyTarget(s, rid)) {
      UI.showForeignPolicy();
      return;
    }
    const capacity = FB.politicalAttentionCapacity(s);
    const used = FB.foreignPolicyUsed(s);
    const current = FB.foreignPolicyStance(s, rid);
    const full = !current && used >= capacity;
    const amount = Math.round(FB.foreignPolicyAmount(s) * 10) / 10;
    const opinion = FB.realmOpinionOf(s, rid);
    let h = '<p class="hint">' + esc(FB.T(
      '{realm} currently holds an opinion of {opinion} ({band}). Your diplomacy gives an assigned policy about {amount} opinion each season.', {
        realm: r.name,
        opinion: signedOpinion(opinion),
        band: opinionBand(opinion),
        amount: amount
      })) + '</p>';
    h += '<div class="progressnote">' + esc(FB.T(
      'Political attention: {used} of {capacity} assigned · current direction: {stance}.', {
        used: used, capacity: capacity, stance: foreignPolicyStanceText(s, rid)
      })) + '</div><div class="gm-list">';
    h += '<button class="actionbtn" data-policy-stance="1"' + (full ? ' disabled' : '') + '>↑ ' +
      esc(FB.T('Improve relations')) + '<span class="adesc">' +
      esc(FB.T('Build goodwill at this court every season.')) + '</span></button>';
    h += '<button class="actionbtn" data-policy-stance="0">• ' +
      esc(FB.T('Neutral')) + '<span class="adesc">' +
      esc(FB.T('Withdraw your court’s attention and free this assignment.')) + '</span></button>';
    h += '<button class="actionbtn" data-policy-stance="-1"' + (full ? ' disabled' : '') + '>↓ ' +
      esc(FB.T('Provoke')) + '<span class="adesc">' +
      esc(FB.T('Cultivate hostility at this court every season, inviting greater danger.')) + '</span></button>';
    if (full) {
      h += '<p class="hint">' + esc(FB.T(
        'All political attention is assigned. Set another court to Neutral before choosing a new direction here.')) + '</p>';
    }
    if (s.player.war && s.player.war.enemy === rid) {
      h += '<p class="hint">⚔ ' + esc(FB.T(
        'Any direction chosen here remains assigned but is suspended until the war ends.')) + '</p>';
    }
    h += '</div><button class="btn gm-footer" id="gm-back">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Policy toward {realm}', { realm: r.name }), h);
    document.querySelectorAll('[data-policy-stance]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (FB.setForeignPolicy(FB.state, rid, Number(btn.dataset.policyStance))) {
          UI.showForeignPolicy();
          UI.refresh();
        }
      });
    });
    $('gm-back').addEventListener('click', UI.showForeignPolicy);
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
          '{ruler} · dev {development} · {money:price}', {
            ruler: hr.ruler.name, development: s.dev[c.pid] || 1, price: c.price
          })) + '</span></button>';
    }
    if (!cands.length) h += '<p class="hint">No weak neighbor holds land beside yours.</p>';
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Buy Out a Neighbor', h);
    document.querySelectorAll('[data-pid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!FB.buyCounty(FB.state, btn.dataset.pid)) { UI.toast('Not enough money.'); return; }
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
      '{money:gold} and {prestige} prestige to plant a settlement on empty land. The new county answers to you — and belongs to no de jure duchy.',
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
    const foreignSovereign = rid !== 'player' && !r.liege && FB.isPlayerSovereign(s);
    const succession = FB.ensureRealmSuccession(s, rid);
    const family = FB.realmFamily(s, rid);
    const chain = s.player.liege ? FB.liegeChain(s, s.player.liege) : [];
    const royalNeighbor = FB.isPlayerSovereign(s) && s.realms.player.rank >= 3 &&
      !r.liege && r.rank >= 3 && FB.realmsAdjacent(s, 'player', rid);
    const mayApproach = chain.indexOf(rid) >= 0 || royalNeighbor;
    let h = '<div class="charcard"><canvas id="liegecrest" class="pface" width="56" height="64"></canvas>' +
      '<div><div class="ccname">' + esc(FB.T('{title} {name}', {
        title: FB.realmRankTitle(s, r), name: r.ruler.name
      })) + '</div>' +
      '<div class="ccmeta">' + esc(FB.T('{sex} of {age}', {
        sex: FB.T(r.ruler.sex === 'f' ? 'Woman' : 'Man'), age: r.ruler.age
      })) +
      ' · ' + esc(cultureName(s, r.ruler.culture)) +
      (rel ? ' · ' + rel.icon + ' ' + esc(religionName(s, cap.religion)) : '') + '</div>' +
      '<div class="ccmeta">' + esc(liege
        ? FB.T('Himself a vassal of {liege}', { liege: liege.name })
        : FB.T('Sovereign — kneels to no one')) + '</div>' +
      '<div class="ccmeta ' + FB.opClass(op) + '">' +
      esc(foreignSovereign
        ? FB.T('⚔ martial {martial} · opinion {opinion} ({band})', {
          martial: r.ruler.mar, opinion: signedOpinion(op), band: opinionBand(op)
        })
        : FB.T('⚔ martial {martial} · favor {favor}', {
          martial: r.ruler.mar, favor: signedOpinion(op)
        })) + '</div>' +
      (r.ruler.trait && FBDATA.traits[r.ruler.trait]
        ? '<div class="ccmeta">' + esc(dt(s, 'trait', r.ruler.trait, FBDATA.traits[r.ruler.trait], 'name')) +
          ' — ' + esc(dt(s, 'trait', r.ruler.trait, FBDATA.traits[r.ruler.trait], 'desc')) + '</div>'
        : '') +
      '</div></div>' +
      '<div style="margin-top:10px">' +
      kv('Realm', esc(r.name)) +
      kv('Counties', FB.realmProvinces(s, rid).length) +
      kv('Realm host', '~' + esc(menText(s, men))) +
      kv('Defensive alliance', esc(allianceText(s, rid))) +
      (liege ? kv('Overlord',
        '<button class="linklike" data-liege="' + esc(liege.id) + '">' +
        esc(liege.name) + '</button>') : '') +
      (cap ? kv('Capital', esc(cap.name)) : '') +
      '</div>';
    if (family.length) {
      h += '<div class="panelh">' + esc(FB.T('Ruler’s family and succession')) + '</div>';
      for (const child of family) {
        const age = Math.max(0, s.date.year - child.born);
        const isHeir = succession && succession.heirId === child.id;
        const directChild = succession &&
          (child.parentId || null) === (succession.rulerMemberId || null);
        h += '<div class="progressnote">' + esc(FB.T('{name} · {relation}, age {age}{heir}', {
          name: child.name,
          relation: directChild
            ? (child.sex === 'm' ? FB.T('son') : FB.T('daughter'))
            : (child.sex === 'm' ? FB.T('kinsman') : FB.T('kinswoman')),
          age: age,
          heir: isHeir ? FB.T(' · designated heir') : ''
        })) + '</div>';
        const me = s.chars[s.player.charId];
        const station = r.rank <= 2 ? 3 : 4;
        const canTry = mayApproach && age >= 16 && child.sex !== me.sex &&
          !FB.royalCompactOf(s) && FB.canWed(s) &&
          !(FB.royalCloseKin && FB.royalCloseKin(s, me, {
            royalLine: { realmId: rid, memberId: child.id }
          })) &&
          station - FB.playerStation(s) < 3;
        if (canTry) {
          h += '<button class="actionbtn" data-royal-child="' + esc(child.id) + '">🌷 ' +
            esc(FB.T('Approach {name} for courtship', { name: child.name })) +
            '<span class="adesc">' + esc(isHeir
              ? FB.T('The designated heir can transmit the crown to your shared branch.')
              : FB.T('This creates a dynastic tie, but this child does not currently transmit the crown.')) +
            '</span></button>';
        }
      }
    }
    if (foreignSovereign) {
      h += kv('Foreign policy', esc(FB.isForeignPolicyTarget(s, rid)
        ? foreignPolicyStanceText(s, rid) : FB.T('Out of reach')));
      if (FB.isForeignPolicyTarget(s, rid)) {
        h += '<button class="btn" id="gm-policy">' + esc(FB.T('Set foreign policy')) + '</button>';
      }
    }
    h += '<button class="btn" id="gm-cancel">Close</button>';
    openModal(rid === s.player.liege ? 'Your Liege' : 'Realm Ruler', h);
    FB.drawCrest($('liegecrest'), rid);
    if ($('gm-policy')) $('gm-policy').addEventListener('click', function () {
      UI.showForeignPolicyStance(rid);
    });
    document.querySelectorAll('[data-royal-child]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const c = FB.materializeRoyalChild(s, rid, btn.dataset.royalChild);
        if (!c || !FB.canCourt(s, c)) return;
        UI.closeModal();
        s.player.courtingId = c.id;
        s.player.flags.courting = 1;
        s.player.focus = 'court_suitor';
        FB.news(s, FB.msg('news.social.royal_courting_begins',
          '🌷 You begin courting {name} of {realm}.', { name: FB.fullName(c), realm: r.name }));
        FB.game.passDay({ skipFocus: true });
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* give a demesne county — or a whole duchy — to a sworn man */
  UI.showGrantLand = function () {
    const s = FB.state;
    let h = '<p class="hint">' + esc(FB.T('A vassal holds the land in your name, pays taxes each season, sends part of its levy to your host, and remembers the favor. Your dignity still counts land held through vassals.')) + '</p>';
    const cap = FB.domainCap(s), held = (s.player.provs || []).length;
    h += '<p class="hint">' + esc(FB.T('Held directly: {held} of {cap}.', { held: held, cap: cap })) +
      (held > cap ? ' ⚠ ' + esc(FB.T('Over your limit — your own income and levy are cut until you grant land away.')) : '') + '</p>';
    const duchies = FB.grantableDuchies(s);
    if (duchies.length) {
      h += '<div class="panelh">' + esc(FB.T('Raise a duke over a duchy you hold in full')) + '</div><div class="gm-list">';
      for (const d of duchies) {
        h += '<button class="actionbtn" data-did="' + esc(d.did) + '">👑 ' + esc(d.name) +
          '<span class="adesc">' + esc(FB.T('{count} counties', { count: d.counties.length })) + '</span></button>';
      }
      h += '</div>';
    }
    h += '<div class="panelh">' + esc(FB.T('Grant a single county')) + '</div><div class="gm-list">';
    for (const pid of s.player.provs) {
      const pr = FB.world.byId[pid];
      h += '<button class="actionbtn" data-pid="' + esc(pid) + '">🏰 ' + esc(pr.name) +
        '<span class="adesc">' + esc(FB.T('dev {development} · {terrain}', {
          development: s.dev[pid] || 1, terrain: terrainName(pr.terrain)
        })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">' + esc(FB.T('Not now')) + '</button>';
    openModal(FB.T('Grant Land'), h);
    document.querySelectorAll('[data-did]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.grantDuchy(FB.state, btn.dataset.did);
        UI.closeModal(); UI.refresh();
      });
    });
    document.querySelectorAll('[data-pid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.grantCounty(FB.state, btn.dataset.pid);
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* the Royal Council (tier 6+): the great officers of the crown — seats,
     holders, tempers, and crown authority. Gifts and dismissals act at once;
     appointing from a vacant seat lists the available vassals inline. */
  UI.showCouncil = function () {
    const s = FB.state;
    const c = FB.councilEnsure(s);
    if (!c) return;
    const B = FBDATA.balance;
    function seatName(id) {
      return id === 'seneschal' ? FB.T('Seneschal')
        : id === 'constable' ? FB.T('Constable')
        : id === 'treasurer' ? FB.T('Treasurer')
        : id === 'almoner' ? FB.T('Almoner')
        : FB.T('Chamberlain');
    }
    function seatDesc(id) {
      return id === 'seneschal' ? FB.T('+10% taxes while he serves')
        : id === 'constable' ? FB.T('+10% levy while he serves')
        : id === 'treasurer' ? FB.T('Buildings cost 15% less while he serves')
        : id === 'almoner' ? FB.T('+1 piety a season while he serves')
        : FB.T('Watches for schemes against you; your own plots weave faster');
    }
    let h = '<p class="hint">' + esc(FB.T(
      'The great officers of the crown lend their strength to yours — but magnates have tempers, and the council weighs every act of the crown.')) + '</p>';
    h += '<div class="kv"><span>' + esc(FB.T('Crown authority')) + '</span><b>' +
      Math.round(c.authority) + '/100</b></div>';
    if (FB.councilNeedsConsent(s)) {
      h += '<p class="hint">⚠ ' + esc(FB.T(
        'The council now outweighs the crown: extraordinary taxes and revocations are beyond you until authority mends (below {limit}).',
        { limit: B.councilConsentBelow || 35 })) + '</p>';
    } else {
      h += '<p class="hint">' + esc(FB.T(
        'High-handed acts raise authority but sour the magnates; pressed too far, they will demand a charter of liberties. Weak authority ties the crown’s hands.')) + '</p>';
    }
    const seated = {};
    for (const seat of FB.councilSeats()) if (c.seats[seat.id]) seated[c.seats[seat.id]] = 1;
    for (const seat of FB.councilSeats()) {
      const rid = c.seats[seat.id];
      const r = rid ? s.realms[rid] : null;
      h += '<div class="panelh">' + seat.icon + ' ' + esc(seatName(seat.id)) + '</div>';
      h += '<div class="cmeta">' + esc(seatDesc(seat.id)) + '</div>';
      if (r) {
        const op = FB.liegeOpOf(s, rid);
        const trait = r.ruler.trait && FBDATA.traits[r.ruler.trait]
          ? dt(s, 'trait', r.ruler.trait, FBDATA.traits[r.ruler.trait], 'name') : '';
        h += '<div class="charcard"><canvas class="pface" width="56" height="64" id="crest_' + esc(seat.id) + '"></canvas>' +
          '<div><div class="ccname">' + esc(r.ruler.name) + '</div>' +
          '<div class="ccmeta">' + esc(r.name) + (trait ? ' · ' + esc(trait) : '') + '</div>' +
          '<div class="ccmeta ' + FB.opClass(op) + '">' +
          esc(FB.T('favor {favor}', { favor: (op > 0 ? '+' : '') + Math.round(op) })) + '</div>' +
          '<div style="margin-top:6px">' +
          '<button class="btn" data-gift="' + esc(rid) + '"' + (s.player.gold < (B.councilGiftCost || 25) ? ' disabled' : '') + '>🎁 ' +
          esc(FB.T('Send a gift ({money:cost})', { cost: B.councilGiftCost || 25 })) + '</button> ' +
          '<button class="btn" data-dismiss="' + esc(seat.id) + '">' + esc(FB.T('Dismiss')) + '</button>' +
          '</div></div></div>';
      } else {
        h += '<div class="cmeta">' + esc(FB.T('Vacant.')) + '</div>';
        const cand = FB.playerVassals(s).filter(function (vid) { return !seated[vid]; });
        if (cand.length) {
          for (const vid of cand) {
            const vr = s.realms[vid];
            h += '<button class="actionbtn" data-appoint="' + esc(seat.id) + '|' + esc(vid) + '">🏛 ' + esc(vr.ruler.name) +
              '<span class="adesc">' + esc(FB.T('{realm} · favor {favor}', {
                realm: vr.name, favor: FB.liegeOpOf(s, vid)
              })) + '</span></button>';
          }
        } else {
          h += '<div class="cmeta">' + esc(FB.T('No unseated vassal remains to raise — grant land to loyal men, and offices will follow.')) + '</div>';
        }
      }
    }
    h += '<button class="btn" id="gm-cancel">' + esc(FB.T('Close')) + '</button>';
    openModal(FB.T('The Royal Council'), h);
    for (const seat of FB.councilSeats()) {
      const cv = $('crest_' + seat.id);
      if (cv && c.seats[seat.id]) FB.drawCrest(cv, c.seats[seat.id]);
    }
    document.querySelectorAll('[data-gift]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (FB.councilGift(FB.state, btn.dataset.gift)) UI.showCouncil(); // redraw in place
      });
    });
    document.querySelectorAll('[data-dismiss]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.councilDismiss(FB.state, btn.dataset.dismiss);
        UI.showCouncil();
      });
    });
    document.querySelectorAll('[data-appoint]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const parts = btn.dataset.appoint.split('|');
        FB.councilAppoint(FB.state, parts[0], parts[1]);
        UI.showCouncil();
      });
    });
    $('gm-cancel').addEventListener('click', function () { UI.closeModal(); UI.refresh(); });
  };

  /* the estates of the realm (vassal tiers 3-5): the terms of the player's
     service, and the motions they can buy between sittings — see
     js/parliament.js for the machinery and FB.parliamentYearly for sessions */
  UI.showParliament = function () {
    const s = FB.state;
    const obl = FB.parliamentEnsure(s);
    if (!obl) return;
    const B = FBDATA.balance;
    const liege = s.realms[s.player.liege];
    const cost = B.parliamentMotionCost || 15;
    const moved = obl.lastMotion === s.date.year;
    const aidMin = B.parliamentAidMin || 0.10;
    let h = '<p class="hint">' + esc(FB.T(
      'When {liege} summons the estates, the lords of the realm haggle over the terms of service — and your voice in the hall grows with your rank, your diplomacy, your name, and the liege’s own favor.',
      { liege: liege.name })) + '</p>';
    h += '<div class="kv"><span>' + esc(FB.T('The liege’s aid')) + '</span><b>' +
      esc(FB.T('{pct}% of your noble revenue', { pct: Math.round(obl.aid * 100) })) + '</b></div>';
    h += '<div class="kv"><span>' + esc(FB.T('Banner service')) + '</span><b>' +
      (obl.scutage
        ? esc(FB.T('Scutage — silver answers the summons'))
        : esc(FB.T('Spears — you must ride, or pay dearly'))) + '</b></div>';
    h += '<div class="kv"><span>' + esc(FB.T('Your voice in the hall')) + '</span><b>' +
      Math.round(FB.parliamentVoteChance(s) * 100) + '%</b></div>';
    h += '<p class="hint">' + esc(FB.T(
      'Between sittings you can put a motion of your own before the estates — it costs {money:cost} in gifts and promises, and the lords will hear but one motion a year.',
      { cost: cost })) + '</p>';
    if (moved) {
      h += '<p class="hint">' + esc(FB.T('The estates have heard your motion this year; they will take another come the new year.')) + '</p>';
    }
    h += '<div class="gm-list">';
    h += '<button class="actionbtn" data-motion="redress"' +
      (moved || s.player.gold < cost || obl.aid <= aidMin + 0.001 ? ' disabled' : '') + '>⚖ ' +
      esc(FB.T('Move for redress of grievances ({money:cost})', { cost: cost })) +
      '<span class="adesc">' + esc(FB.T('Put it to a vote: the liege’s aid down one step, if the hall backs you.')) + '</span></button>';
    h += '<button class="actionbtn" data-motion="scutage"' +
      (moved || s.player.gold < cost || obl.scutage ? ' disabled' : '') + '>🛡 ' +
      esc(FB.T('Move for scutage ({money:cost})', { cost: cost })) +
      '<span class="adesc">' + esc(FB.T('Put it to a vote: silver for banner service — the aid creeps up in exchange.')) + '</span></button>';
    h += '</div>';
    h += '<button class="btn" id="gm-cancel">' + esc(FB.T('Close')) + '</button>';
    openModal(FB.T('The Estates'), h);
    document.querySelectorAll('[data-motion]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (s.player.gold < cost || obl.lastMotion === s.date.year) return;
        s.player.gold -= cost;
        obl.lastMotion = s.date.year;
        s.eventQueue.push({ id: 'parliament_' + btn.dataset.motion });
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', function () { UI.closeModal(); UI.refresh(); });
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

  /* ================= coin & credit ================= */

  function financeAmount(value) {
    return Math.round(value * 10) / 10;
  }

  function financeDate(season, year) {
    return FB.T('{season} {year}', { season:FB.seasonName(season), year:year });
  }

  function financeDateAfter(s, seasons) {
    const n = s.date.season + seasons;
    return { season:n % 4, year:s.date.year + Math.floor(n / 4) };
  }

  function financeKindName(kind) {
    if (kind === 'pledge') return FB.T('Pledged loan');
    if (kind === 'merchant') return FB.T('Merchant advance');
    if (kind === 'revenue') return FB.T('Loan against revenues');
    return FB.T('Financial contract');
  }

  function financeAssetName(s, collateral) {
    if (!collateral) return FB.T('None');
    if (collateral.kind === 'item' && FB.resolveItem) {
      const item = FB.resolveItem(s, collateral.id);
      return item ? item.def.icon + ' ' + FB.itemName(s, collateral.id) : collateral.id;
    }
    const table = collateral.kind === 'item' ? FBDATA.items : FBDATA.holdings;
    const def = table && table[collateral.id];
    if (!def) return collateral.id;
    return (def.icon || '') + (def.icon ? ' ' : '') +
      dt(s, collateral.kind, collateral.id, def, 'name');
  }

  function financeDefaultText(s, contract) {
    if (contract.defaultKind === 'collateral' && contract.collateral) {
      return FB.T('{asset} is taken, prestige falls, and lenders refuse the household for four seasons.', {
        asset:financeAssetName(s, contract.collateral)
      });
    }
    return FB.T('One quarter of regular revenues is assigned until the debt is cleared; prestige and political standing fall, and lenders refuse the household for four seasons.');
  }

  function financeOfferCountText(s, count) {
    return FB.renderMessage(FB.msg('fx.ui.finance_offer_count', {
      forms: {
        select:'plural', param:'count', cases:{
          one:'One exact offer is available.',
          other:'{count} exact offers are available.'
        }
      }
    }, { count:count }), { state:s, viewer:s.player.charId });
  }

  function financeDebtCountText(s, count, amount) {
    return FB.renderMessage(FB.msg('fx.ui.finance_debt_count', {
      forms: {
        select:'plural', param:'count', cases:{
          one:'One obligation worth {money:amount} passes with the household.',
          other:'{count} obligations worth {money:amount} pass with the household.'
        }
      }
    }, { count:count, amount:amount }), { state:s, viewer:s.player.charId });
  }

  function financeLoanCard(s, loan) {
    const due = financeAmount(FB.financeDueNow(s, loan));
    const nominal = loan.denomination !== 'real';
    const canRepay = loan.status !== 'default' && s.player.gold + 0.000001 >= due;
    let h = '<div class="progressnote' +
      (loan.status === 'arrears' || loan.status === 'default' ? ' warnote' : '') + '">' +
      '<b>' + esc(financeKindName(loan.kind)) + '</b> · ' +
      esc(FB.T('{money:amount} due {date}', {
        amount:due, date:financeDate(loan.dueSeason, loan.dueYear)
      })) +
      '<br><span class="hint">' +
      esc(nominal
        ? FB.T('Face value {money:face} in nominal coin; its purchasing value moves with prices.', {
          face:financeAmount(loan.face)
        })
        : FB.T('Weight-denominated contract; price movement does not change the amount due.')) +
      '</span>';
    if (loan.collateral) {
      h += '<br><span class="hint">' + esc(FB.T('Pledged: {asset}', {
        asset:financeAssetName(s, loan.collateral)
      })) + '</span>';
    }
    h += '<br><span class="hint">' + esc(FB.T(
      'First miss: 10% face penalty and two more seasons. Default: {consequence}', {
        consequence:financeDefaultText(s, loan)
      })) + '</span>';
    if (loan.status === 'arrears') {
      h += '<br><span class="op-bad">' + esc(FB.T('In arrears — the next missed deadline defaults.')) + '</span>';
    } else if (loan.status === 'default') {
      h += '<br><span class="op-bad">' + esc(FB.T('In default — assigned revenues are paying this down.')) + '</span>';
    }
    if (loan.status !== 'default') {
      h += '<button class="btn" data-finance-repay="' + loan.id + '"' +
        (canRepay ? '' : ' disabled') + ' style="margin-top:8px">' +
        esc(FB.T('Repay now ({money:amount})', { amount:due })) + '</button>';
    }
    return h + '</div>';
  }

  UI.showFinance = function () {
    const s = FB.state;
    const e = FB.ensureEconomy(s);
    const loans = FB.financeActiveLoans(s).slice().sort(function (a, b) {
      return a.dueTurn - b.dueTurn || a.id - b.id;
    });
    const investments = FB.financeActiveInvestments(s);
    const offers = FB.financeLoanOffers(s);
    const stakes = FB.tradeInvestmentStakes(s);
    let h = '';

    /* Obligations lead the sheet so a narrow phone shows the urgent date
       before background metrics or optional transactions. */
    if (loans.length) {
      h += panelh('Urgent obligations');
      for (const loan of loans) h += financeLoanCard(s, loan);
    }

    h += panelh('Coin and household means') +
      '<div class="gm-body-text">' +
      kv('Purse', esc(FB.T('{money:amount}', { amount:financeAmount(s.player.gold) }))) +
      kv('Price index', esc(financeAmount(e.price))) +
      kv('Last annual movement', esc(FB.T('{rate}%', {
        rate:(e.lastRate > 0 ? '+' : '') + financeAmount(e.lastRate * 100)
      }))) +
      kv('Coin and prices this year', '<span class="' +
        (e.lastAdjustment > 0 ? 'op-good' : e.lastAdjustment < 0 ? 'op-bad' : '') + '">' +
        esc(FB.T('{money:amount}', { amount:financeAmount(e.lastAdjustment) })) + '</span>') +
      kv('Reliable seasonal net', '<span class="' +
        (FB.reliableGoldIncome(s) > 0 ? 'op-good' : 'op-bad') + '">' +
        esc(FB.T('{money:amount}', { amount:financeAmount(FB.reliableGoldIncome(s)) })) +
        '</span>') +
      kv('Unsecured credit capacity', esc(FB.T('{money:amount}', {
        amount:financeAmount(FB.financeCreditCapacity(s, null, false))
      }))) +
      kv('Defaults remembered', esc(e.defaults)) +
      '<p class="hint">' + esc(FB.T(
        'Capacity comes from reliable income, eligible collateral, and a capped allowance for standing, less current obligations. Windfalls and new loans do not count.')) +
      '</p></div>';

    h += panelh('Loans');
    if (!loans.length) {
      h += '<div class="progressnote">' + esc(FB.T('No active household obligations.')) + '</div>';
    }
    h += '<div class="gm-list"><button class="actionbtn" id="finance-borrow"' +
      (offers.length ? '' : ' disabled') + '>📜 ' + esc(FB.T('Seek a loan…')) +
      '<span class="adesc">' + esc(offers.length
        ? financeOfferCountText(s, offers.length)
        : (FB.financeHasDefault(s)
          ? FB.T('No lender will advance more while revenues are in default.')
          : FB.T('No offer fits the household’s income, collateral, or current obligations.'))) +
      '</span></button></div>';

    h += panelh('Trade partnerships');
    if (investments.length) {
      for (const inv of investments) {
        h += '<div class="progressnote"><b>' + esc(FB.tradePartnershipName(s)) + '</b> · ' +
          esc(FB.T('{money:stake} at risk · matures {date}', {
            stake:inv.stake, date:financeDate(inv.dueSeason, inv.dueYear)
          })) + '</div>';
      }
    } else {
      h += '<div class="progressnote">' + esc(FB.T('No coin is committed to distant trade.')) + '</div>';
    }
    if (stakes.length) {
      h += '<div class="gm-list">';
      for (const stake of stakes) {
        const can = FB.canStartTradeInvestment(s, stake);
        h += '<button class="actionbtn" data-finance-invest="' + stake + '"' +
          (can ? '' : ' disabled') + '>🧭 ' +
          esc(FB.T('Commit {money:stake}…', { stake:stake })) +
          '<span class="adesc">' + esc(FB.T(
            'A four-season profit-sharing venture: productive risk, with no guaranteed return.')) +
          '</span></button>';
      }
      h += '</div>';
    }

    if (s.player.tier >= 6 && !s.player.liege) {
      h += panelh('The crown’s coinage') + '<div class="gm-list">' +
        '<button class="actionbtn" id="finance-debase"' +
        (FB.financeCanDebase(s) ? '' : ' disabled') + '>🪙 ' +
        esc(FB.T('Debase the coinage…')) +
        '<span class="adesc">' + esc(FB.T(
          'Take seigniorage now; harm prices, prestige, popular trust, and future credit.')) +
        '</span></button>' +
        (FB.financeCanRecoin(s)
          ? '<button class="actionbtn" id="finance-recoin">⚖ ' +
            esc(FB.T('Restore the coinage…')) +
            '<span class="adesc">' + esc(FB.T(
              'Pay to call in light coin, restore weight, and press prices back toward stability.')) +
            '</span></button>'
          : '') + '</div>';
    }

    h += '<div class="gm-footer"><button class="btn" id="finance-close">' +
      esc(FB.T('Close')) + '</button></div>';
    openModal(FB.T('💰 Coin & Credit'), h, { modalClass:'fullsheet-modal' });
    $('finance-close').addEventListener('click', UI.closeModal);
    const borrow = $('finance-borrow');
    if (borrow) borrow.addEventListener('click', UI.showFinanceBorrow);
    document.querySelectorAll('[data-finance-repay]').forEach(function (button) {
      button.addEventListener('click', function () {
        UI.showFinanceRepay(parseInt(button.dataset.financeRepay, 10));
      });
    });
    document.querySelectorAll('[data-finance-invest]').forEach(function (button) {
      button.addEventListener('click', function () {
        UI.showFinanceInvestment(parseInt(button.dataset.financeInvest, 10));
      });
    });
    const debase = $('finance-debase');
    if (debase) debase.addEventListener('click', UI.showDebasement);
    const recoin = $('finance-recoin');
    if (recoin) recoin.addEventListener('click', UI.showRecoinage);
  };

  UI.showFinanceBorrow = function () {
    const s = FB.state;
    const offers = FB.financeLoanOffers(s);
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Every offer fixes its face value and deadline when signed. Review collateral and default terms before accepting.')) +
      '</p></div><div class="gm-list">';
    for (let i = 0; i < offers.length; i++) {
      const offer = offers[i];
      const preview = FB.financeLoanPreview(s, offer);
      const details = offer.collateral
        ? FB.T('Receive {money:principal} · {money:due} due {date} · pledge {asset}', {
          principal:offer.principal, due:financeAmount(preview.dueNow),
          date:financeDate(preview.dueSeason, preview.dueYear),
          asset:financeAssetName(s, offer.collateral)
        })
        : FB.T('Receive {money:principal} · {money:due} due {date}', {
          principal:offer.principal, due:financeAmount(preview.dueNow),
          date:financeDate(preview.dueSeason, preview.dueYear)
        });
      h += '<button class="actionbtn" data-finance-offer="' + i + '">📜 ' +
        esc(financeKindName(offer.kind)) +
        '<span class="adesc">' + esc(details) + '</span></button>';
    }
    h += '</div><button class="btn" id="finance-back">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Seek a loan'), h);
    document.querySelectorAll('[data-finance-offer]').forEach(function (button) {
      button.addEventListener('click', function () {
        const offer = offers[parseInt(button.dataset.financeOffer, 10)];
        if (offer) UI.showFinanceLoanConfirm(offer.kind, offer.collateral);
      });
    });
    $('finance-back').addEventListener('click', UI.showFinance);
  };

  UI.showFinanceLoanConfirm = function (kind, collateral) {
    const s = FB.state;
    let offer = null;
    for (const item of FB.financeLoanOffers(s)) {
      const a = item.collateral, b = collateral;
      if (item.kind === kind && ((!a && !b) ||
        (a && b && a.kind === b.kind && a.id === b.id))) { offer = item; break; }
    }
    if (!offer) { UI.showFinance(); return; }
    const preview = FB.financeLoanPreview(s, offer);
    let h = '<div class="gm-body-text">' +
      '<p><b>' + esc(financeKindName(kind)) + '</b></p>' +
      kv('Receive now', esc(FB.T('{money:amount}', { amount:offer.principal }))) +
      kv('Current value due', esc(FB.T('{money:amount}', {
        amount:financeAmount(preview.dueNow)
      }))) +
      kv('Due', esc(financeDate(preview.dueSeason, preview.dueYear))) +
      kv('Pledged collateral', esc(financeAssetName(s, offer.collateral))) +
      '<p>' + esc(preview.denomination === 'real'
        ? FB.T('This contract is reckoned by weight: price changes do not change the amount due.')
        : FB.T('Face value: {money:face} in nominal coin. What that face value can buy may rise or fall with prices.', {
          face:financeAmount(preview.face)
        })) + '</p>' +
      '<p><b>' + esc(FB.T('First missed payment:')) + '</b> ' +
      esc(FB.T('10% is added to the signed face and the deadline moves two seasons.')) + '</p>' +
      '<p><b>' + esc(FB.T('Second missed payment:')) + '</b> ' +
      esc(financeDefaultText(s, preview)) + '</p></div>' +
      '<div class="gm-list"><button class="actionbtn" id="finance-sign">📜 ' +
      esc(FB.T('Sign and receive {money:amount}', { amount:offer.principal })) +
      '</button></div><button class="btn" id="finance-cancel">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Confirm the contract'), h);
    $('finance-sign').addEventListener('click', function () {
      if (FB.takeFinanceLoan(s, kind, collateral)) UI.showFinance();
      else UI.showFinanceBorrow();
    });
    $('finance-cancel').addEventListener('click', UI.showFinanceBorrow);
  };

  UI.showFinanceRepay = function (id) {
    const s = FB.state;
    let loan = null;
    for (const item of FB.financeActiveLoans(s)) if (item.id === id) loan = item;
    if (!loan || loan.status === 'default') { UI.showFinance(); return; }
    const due = financeAmount(FB.financeDueNow(s, loan));
    const h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Pay {money:amount} now and clear this obligation. There is no early-payment penalty.', {
        amount:due
      })) + '</p></div><div class="gm-list">' +
      '<button class="actionbtn" id="finance-pay">⚖ ' +
      esc(FB.T('Repay {money:amount}', { amount:due })) +
      '</button></div><button class="btn" id="finance-cancel">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Repay early?'), h);
    $('finance-pay').addEventListener('click', function () {
      FB.repayFinanceLoan(s, id, false);
      UI.showFinance();
    });
    $('finance-cancel').addEventListener('click', UI.showFinance);
  };

  UI.showFinanceInvestment = function (stake) {
    const s = FB.state;
    if (!FB.canStartTradeInvestment(s, stake)) { UI.showFinance(); return; }
    const def = FBDATA.finance.tradePartnership;
    const due = financeDateAfter(s, def.termSeasons);
    const h = '<div class="gm-body-text">' +
      kv('Contract', esc(FB.tradePartnershipName(s))) +
      kv('Stake now', esc(FB.T('{money:amount}', { amount:stake }))) +
      kv('Maturity', esc(financeDate(due.season, due.year))) +
      kv('Risk of total loss', esc(FB.T('{amount}%', {
        amount:Math.round(def.risk * 100)
      }))) +
      '<p>' + esc(FB.T(
        'This is profit-and-loss sharing, not a fixed loan. The stake leaves now; at maturity it may be lost, partly recovered, or returned with profit. The outcome is resolved once.')) +
      '</p></div><div class="gm-list"><button class="actionbtn" id="finance-invest-confirm">🧭 ' +
      esc(FB.T('Commit {money:amount}', { amount:stake })) +
      '</button></div><button class="btn" id="finance-cancel">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Confirm the partnership'), h);
    $('finance-invest-confirm').addEventListener('click', function () {
      FB.startTradeInvestment(s, stake, 'finance');
      UI.showFinance();
    });
    $('finance-cancel').addEventListener('click', UI.showFinance);
  };

  UI.showDebasement = function () {
    const s = FB.state;
    if (!FB.financeCanDebase(s)) { UI.showFinance(); return; }
    const preview = FB.financeDebasePreview(s);
    const h = '<div class="gm-body-text">' +
      kv('Immediate seigniorage', esc(FB.T('{money:amount}', { amount:preview.gold }))) +
      kv('Price pressure', esc(FB.T('+{amount}% for {years} years', {
        amount:financeAmount(preview.pressure * 100), years:preview.years
      }))) +
      '<p class="op-bad">' + esc(FB.T(
        'Prestige and popular trust will fall. Repeated debasement worsens loan terms, and sophisticated lenders may demand repayment by weight. Existing nominal debts become easier in real terms by design.')) +
      '</p></div><div class="gm-list"><button class="actionbtn op-bad" id="finance-debase-confirm">🪙 ' +
      esc(FB.T('Debase the coinage')) +
      '</button></div><button class="btn" id="finance-cancel">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Debase the coinage?'), h);
    $('finance-debase-confirm').addEventListener('click', function () {
      FB.debaseCoinage(s);
      UI.showFinance();
    });
    $('finance-cancel').addEventListener('click', UI.showFinance);
  };

  UI.showRecoinage = function () {
    const s = FB.state;
    if (!FB.financeCanRecoin(s)) { UI.showFinance(); return; }
    const preview = FB.financeRecoinPreview(s);
    const h = '<div class="gm-body-text">' +
      kv('Cost now', esc(FB.T('{money:amount}', { amount:preview.cost }))) +
      kv('Price pressure', esc(FB.T('{amount}% for {years} years', {
        amount:financeAmount(preview.pressure * 100), years:preview.years
      }))) +
      '<p>' + esc(FB.T(
        'Calling in the light coin restores weight and confidence over time. Active contracts keep the denomination they were signed under.')) +
      '</p></div><div class="gm-list"><button class="actionbtn" id="finance-recoin-confirm">⚖ ' +
      esc(FB.T('Spend {money:amount} and restore the coin', { amount:preview.cost })) +
      '</button></div><button class="btn" id="finance-cancel">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Restore the coinage?'), h);
    $('finance-recoin-confirm').addEventListener('click', function () {
      FB.recoinCurrency(s);
      UI.showFinance();
    });
    $('finance-cancel').addEventListener('click', UI.showFinance);
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
        esc(FB.T('{icon} {name} — {money:cost}', {
          icon: t.def.icon, name: dt(s, 'holding', t.id, t.def, 'name'), cost: t.def.cost
        })) + '<span class="adesc">' + esc(dt(s, 'holding', t.id, t.def, 'desc')) +
        (short ? ' ' + esc(FB.T('(not enough money)')) : '') + '</span></button>';
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

  /* ================= freehold land market ================= */
  UI.showLandMarket = function () {
    const s = FB.state;
    const p = s.player;
    const cost = FB.landPlotCost();
    const max = FBDATA.balance.landPlotMaxSettlement ||
      FBDATA.balance.manorPlotRequirement;
    const settlements = FB.settlementsOf(s, p.provinceId);
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Plots pass to your heirs and earn produce each season. Each additional plot in the same settlement makes the whole holding {bonus}% more productive; gather {needed} together to declare a manor.',
      {
        bonus:Math.round((FBDATA.balance.landConsolidationBonus || 0.10) * 100),
        needed:FBDATA.balance.manorPlotRequirement
      })) +
      '</p></div><div class="gm-list">';
    for (let i = 0; i < settlements.length; i++) {
      const count = FB.landCountAt(s, p.provinceId, i);
      const full = count >= max;
      const short = p.gold < cost;
      const before = Math.round(FB.landGroupYield(count) * 10) / 10;
      const after = Math.round(FB.landGroupYield(count + 1) * 10) / 10;
      h += '<button class="actionbtn" data-land-settlement="' + i + '"' +
        (full || short ? ' disabled' : '') + '>🌾 ' +
        esc(FB.T('{settlement} — {count}/{max} plots', {
          settlement:settlements[i].name, count:count, max:max
        })) + '<span class="adesc">' +
        (full
          ? esc(FB.T('A manor-sized holding is assembled here.'))
          : esc(FB.T('Buy the next plot for {money:cost} · seasonal yield {money:before} → {money:after}.', {
            cost:cost, before:before, after:after
          })) + (short ? ' ' + esc(FB.T('(not enough money)')) : '')) +
        '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">' + esc(FB.T('Not now')) + '</button>';
    openModal(FB.T('🌾 Buy Freehold Land'), h);
    document.querySelectorAll('[data-land-settlement]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!FB.buyLandPlot(FB.state, parseInt(button.dataset.landSettlement, 10))) return;
        UI.refresh();
        UI.showLandMarket();
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* ================= household livelihoods & enterprises ================= */
  UI.showLivelihoods = function () {
    const s = FB.state;
    const me = s.chars[s.player.charId];
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'The household’s work feeds the purse. Apprentices learn until sixteen; staffed enterprises pay each season.')) +
      '</p></div><div class="panelh">' + esc(FB.T('Household work')) + '</div><div class="gm-list">';
    for (const c of FB.householdMembers(s)) {
      const age = FB.ageOf(c, s.date.year);
      if (age < 10) continue;
      const career = FB.careerOf(s, c);
      const def = FBDATA.careers[career.profession];
      h += '<button class="actionbtn" data-career="' + c.id + '">' +
        FB.faceTag(c, 30, 36) + ' ' + esc(c.id === me.id ? FB.T('{name} (you)', { name:c.name }) : c.name) +
        '<span class="adesc">' + esc(FB.careerTitle(s, c) +
          (def && def.guild ? ' · ' + FB.guildTitle(career) : '')) + '</span></button>';
    }
    h += '</div><div class="panelh">' + esc(FB.T('Family enterprises')) + '</div><div class="gm-list">';
    const enterprises = FB.enterpriseList(s);
    if (!enterprises.length) {
      h += '<div class="hint">' + esc(FB.T('No enterprise yet. Open one in a settlement below.')) + '</div>';
    }
    for (const e of enterprises) {
      const def = FBDATA.enterprises[e.type];
      if (!def) continue;
      const worker = e.workerId && s.chars[e.workerId] && !s.chars[e.workerId].dead ?
        s.chars[e.workerId] : null;
      const pr = FB.world.byId[e.provinceId];
      const sts = pr ? FB.settlementsOf(s, e.provinceId) : [];
      const place = sts[e.settlement] ? sts[e.settlement].name : (pr ? pr.name : '?');
      h += '<button class="actionbtn" data-enterprise="' + esc(e.uid) + '">' +
        esc(def.icon + ' ' + dt(s, 'enterprise', e.type, def, 'name')) +
        '<span class="adesc">' + esc(FB.T('{place} · {worker} · about {money:gold}/season', {
          place:place,
          worker:worker ? FB.T('worked by {name}', { name:worker.name }) : FB.T('idle — no worker'),
          gold:Math.round(FB.enterpriseYield(s, e) * 10) / 10
        })) + '</span></button>';
    }
    const settlements = FB.settlementsOf(s, s.player.provinceId);
    for (let i = 0; i < settlements.length; i++) {
      if (!FB.enterpriseAvailable(s, i).length) continue;
      h += '<button class="actionbtn" data-enterprise-settlement="' + i + '">🏪 ' +
        esc(FB.T('Open an enterprise in {settlement}…', { settlement:settlements[i].name })) +
        '<span class="adesc">' + esc(FB.T('Buy productive property; further copies of one kind cost more.')) +
        '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">' + esc(FB.T('Close')) + '</button>';
    openModal(FB.T('🧰 Work & Enterprises'), h);
    FB.paintFaces($('gm-body'), s);
    document.querySelectorAll('[data-career]').forEach(function (b) {
      b.addEventListener('click', function () { UI.showCareerPicker(b.dataset.career); });
    });
    document.querySelectorAll('[data-enterprise]').forEach(function (b) {
      b.addEventListener('click', function () { UI.showEnterpriseManage(b.dataset.enterprise); });
    });
    document.querySelectorAll('[data-enterprise-settlement]').forEach(function (b) {
      b.addEventListener('click', function () {
        UI.showEnterpriseMarket(parseInt(b.dataset.enterpriseSettlement, 10));
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  UI.showCareerPicker = function (cid) {
    const s = FB.state;
    const c = s.chars[cid];
    if (!c || c.dead) return;
    const age = FB.ageOf(c, s.date.year);
    const career = FB.careerOf(s, c);
    let h = livelihoodNote(s, c) + '<div class="gm-body-text"><p>' + esc(FB.T(
      age < 16
        ? 'Choose an apprenticeship. It teaches a trade until age sixteen and may cost an entry fee.'
        : 'Choose their occupation. Changing work spends the day; experience in the old trade is set aside.')) +
      '</p></div><div class="gm-list">';
    for (const item of FB.careerChoices(s, c)) {
      const same = career.chosen && career.profession === item.id;
      const short = s.player.gold < item.cost;
      h += '<button class="actionbtn" data-career-choice="' + item.id + '"' +
        (same || short ? ' disabled' : '') + '>' +
        esc(item.def.icon + ' ' + dt(s, 'career', item.id, item.def, 'name') +
          (item.cost ? FB.T(' — {money:gold}', { gold:item.cost }) : '')) +
        '<span class="adesc">' + esc(dt(s, 'career', item.id, item.def, 'desc')) +
        (same ? ' ' + esc(FB.T('(current)')) : short ? ' ' + esc(FB.T('(not enough money)')) : '') +
        '</span></button>';
    }
    const step = FB.guildAdvance(s, c);
    if (step) {
      const blocked = step.blocked || s.player.gold < step.cost;
      h += '<button class="actionbtn" id="career-guild"' + (blocked ? ' disabled' : '') + '>🏅 ' +
        esc(FB.T('Seek the next guild rank — {rank} ({money:gold})', {
          rank:FB.guildTitle({ guildRank:step.to }), gold:step.cost
        })) + '<span class="adesc">' +
        esc(step.blocked
          ? (step.prestige
            ? FB.T('Requires {skill} Stewardship and {prestige} prestige.', {
              skill:step.need, prestige:step.prestige
            })
            : FB.T('Requires {skill} Stewardship.', { skill:step.need }))
          : FB.T('Guild standing brings commissions, enterprise access, and better profits.')) +
        '</span></button>';
    }
    const religiousAdvance = FB.religiousAdvance(s, c);
    if (religiousAdvance) {
      const faithStep = religiousAdvance.step;
      if (faithStep.maleOnly && c.sex !== 'm') {
        h += '<div class="hint">' + esc(FB.T(
          'This is the highest religious office open to {name} on this path.', { name:c.name })) +
          '</div>';
      } else {
        const faithTitle = FB.religiousRankTitle(s, c, {
          id:religiousAdvance.path.id, step:faithStep
        });
        h += '<button class="actionbtn" id="career-religious"' +
          (religiousAdvance.blocked ? ' disabled' : '') + '>🛐 ' +
          esc(faithStep.gold
            ? FB.T('Seek the next religious rank — {rank} ({money:gold})', {
              rank:faithTitle, gold:faithStep.gold
            })
            : FB.T('Seek the next religious rank — {rank}', { rank:faithTitle })) +
          '<span class="adesc">' +
          esc(religiousAdvance.path.id.indexOf('_lay') >= 0
            ? FB.T('Requires age {age}, {piety} piety, {prestige} prestige, and {money:gold} from the household.', {
              age:faithStep.age || 0, piety:faithStep.piety || 0,
              prestige:faithStep.prestige || 0, gold:faithStep.gold || 0
            })
            : FB.T('Requires age {age}, Learning {learning}, {years} years in this vocation, {piety} piety, {prestige} prestige, and {money:gold} from the household.', {
              age:faithStep.age || 0, learning:faithStep.learning || 0,
              years:faithStep.years || 0, piety:faithStep.piety || 0,
              prestige:faithStep.prestige || 0, gold:faithStep.gold || 0
            })) + ' ' +
          esc(faithStep.station !== undefined || faithStep.tier
            ? FB.T('Recognition adds {piety} piety each season and raises social station.', {
              piety:faithStep.pietyYield || 0
            })
            : FB.T('Recognition adds {piety} piety each season.', {
              piety:faithStep.pietyYield || 0
            })) +
          '</span></button>';
      }
    }
    h += '</div><button class="btn" id="gm-cancel">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Work of {name}', { name:c.name }), h);
    document.querySelectorAll('[data-career-choice]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!FB.beginCareer(s, c, b.dataset.careerChoice)) return;
        UI.closeModal();
        FB.game.passDay({ skipFocus:true });
      });
    });
    const guild = $('career-guild');
    if (guild) guild.addEventListener('click', function () {
      if (!FB.takeGuildStep(s, c)) return;
      UI.closeModal();
      FB.game.passDay({ skipFocus:true });
    });
    const religious = $('career-religious');
    if (religious) religious.addEventListener('click', function () {
      if (!FB.takeReligiousStep(s, c)) return;
      UI.closeModal();
      FB.game.passDay({ skipFocus:true });
    });
    $('gm-cancel').addEventListener('click', UI.showLivelihoods);
  };

  UI.showEnterpriseMarket = function (settlement) {
    const s = FB.state;
    const sts = FB.settlementsOf(s, s.player.provinceId);
    const place = sts[settlement] ? sts[settlement].name : '?';
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'One enterprise of each kind may stand in a settlement. It earns only while an eligible household member works there.')) +
      '</p></div><div class="gm-list">';
    for (const item of FB.enterpriseAvailable(s, settlement)) {
      const short = s.player.gold < item.cost;
      h += '<button class="actionbtn" data-enterprise-buy="' + item.id + '"' +
        (short ? ' disabled' : '') + '>' +
        esc(FB.T('{icon} {name} — {money:gold}', {
          icon:item.def.icon, name:dt(s, 'enterprise', item.id, item.def, 'name'), gold:item.cost
        })) + '<span class="adesc">' + esc(dt(s, 'enterprise', item.id, item.def, 'desc')) +
        ' ' + esc(item.workers.length
          ? FB.T('{count} eligible household workers.', { count:item.workers.length })
          : FB.T('No eligible worker yet — it would stand idle.')) +
        '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Enterprise in {settlement}', { settlement:place }), h);
    document.querySelectorAll('[data-enterprise-buy]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!FB.buyEnterprise(s, b.dataset.enterpriseBuy, settlement)) return;
        UI.closeModal();
        FB.game.passDay({ skipFocus:true });
      });
    });
    $('gm-cancel').addEventListener('click', UI.showLivelihoods);
  };

  UI.showEnterpriseManage = function (uid) {
    const s = FB.state;
    let e = null;
    for (const item of FB.enterpriseList(s)) if (item.uid === uid) e = item;
    if (!e || !FBDATA.enterprises[e.type]) return;
    const def = FBDATA.enterprises[e.type];
    let h = '<div class="gm-body-text"><p>' + esc(dt(s, 'enterprise', e.type, def, 'desc')) +
      '</p></div><div class="gm-list">';
    for (const c of FB.enterpriseWorkers(s, e.type)) {
      h += '<button class="actionbtn" data-enterprise-worker="' + c.id + '">' +
        (e.workerId === c.id ? '◉ ' : '○ ') + FB.faceTag(c, 30, 36) + ' ' + esc(c.name) +
        '<span class="adesc">' + esc(FB.careerTitle(s, c)) + '</span></button>';
    }
    h += '<button class="actionbtn" data-enterprise-worker="">' +
      (e.workerId ? '○ ' : '◉ ') + esc(FB.T('Leave it idle')) +
      '<span class="adesc">' + esc(FB.T('An idle enterprise produces no seasonal income.')) +
      '</span></button></div><button class="btn" id="gm-cancel">' + esc(FB.T('Back')) + '</button>';
    openModal(def.icon + ' ' + dt(s, 'enterprise', e.type, def, 'name'), h);
    FB.paintFaces($('gm-body'), s);
    document.querySelectorAll('[data-enterprise-worker]').forEach(function (b) {
      b.addEventListener('click', function () {
        FB.assignEnterprise(s, uid, b.dataset.enterpriseWorker || null);
        UI.showLivelihoods();
        UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', UI.showLivelihoods);
  };

  /* ================= innovation picker ================= */
  UI.showTech = function () {
    const s = FB.state;
    const pts = Math.floor(s.player.research || 0);
    const done = FB.techList(s);
    let h = '<p class="hint">' + esc(FB.T(
      'Scholarship: {amount} — earned by patronizing scholars, libraries, and learned guests. Innovations persist across the generations.',
      { amount: pts })) + '</p><div class="gm-list">';
    for (const t of FB.techAvailable(s)) {
      const short = pts < t.cost;
      let rank = 0; // ranks of a repeatable capstone already held
      if (t.def.repeat) for (const id of done) if (id === t.id) rank++;
      const label = rank > 0
        ? FB.T('{icon} {name} ×{rank} — {cost} scholarship', {
          icon: t.def.icon, name: dt(s, 'tech', t.id, t.def, 'name'), rank: rank, cost: t.cost })
        : FB.T('{icon} {name} — {cost} scholarship', {
          icon: t.def.icon, name: dt(s, 'tech', t.id, t.def, 'name'), cost: t.cost });
      h += '<button class="actionbtn" data-tech="' + esc(t.id) + '"' + (short ? ' disabled' : '') + '>' +
        esc(label) + '<span class="adesc">' + esc(dt(s, 'tech', t.id, t.def, 'desc')) +
        (short ? ' ' + esc(FB.T('(not enough scholarship)')) : '') + '</span></button>';
    }
    h += '</div>';
    if (done.length) {
      /* repeatable capstones can appear several times in state.tech — collapse
         them into one name with a rank badge */
      const ranks = {}, order = [];
      for (const id of done) {
        if (ranks[id] === undefined) { ranks[id] = 0; order.push(id); }
        ranks[id]++;
      }
      h += '<p class="hint">' + esc(FB.T('Already adopted:')) + ' ' + order.map(function (id) {
        const d = FBDATA.tech[id];
        if (!d) return esc(id);
        return ranks[id] > 1
          ? esc(FB.T('{icon} {name} ×{rank}', {
            icon: d.icon, name: dt(s, 'tech', id, d, 'name'), rank: ranks[id] }))
          : d.icon + ' ' + esc(dt(s, 'tech', id, d, 'name'));
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
    const isHousehold = !c.dead && FB.isHouseholdCharacter &&
      FB.isHouseholdCharacter(s, c.id);
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
    const isFamily = FB.spousesOf(s, me).some(function (sp) { return sp.id === c.id; }) ||
      me.childrenIds.indexOf(c.id) >= 0 ||
      (c.role === 'sibling' && c.dyn === me.dyn);
    if (isHousehold) {
      h += '<button class="actionbtn" id="cm-equipment">' +
        esc(FB.T('Equip items…')) + '<span class="adesc">' +
        esc(FB.T('Open the full figure and choose equipment from the family armory.')) +
        '</span></button>';
    }
    if (isHousehold && FB.ageOf(c, s.date.year) >= 10) {
      h += livelihoodNote(s, c);
      h += '<button class="actionbtn" id="cm-career">🧰 Choose work or training…' +
        '<span class="adesc">Arrange an apprenticeship, change occupation, or seek guild rank.</span></button>';
    }
    if (c.id !== me.id) {
      h += '<button class="actionbtn" id="cm-befriend">🤝 Spend the day in their company' +
        '<span class="adesc">Warm their regard for you. (spends the day)</span></button>';
      h += '<button class="actionbtn" id="cm-gift"' + (s.player.gold < 5 ? ' disabled' : '') + '>' +
        esc(FB.T('🎁 Send a gift ({money:5})')) +
        '<span class="adesc">Silver speaks warmly. (spends the day)</span></button>';
      const isMySpouse = c.spouseId === me.id || c.id === me.spouseId;
      if (isMySpouse) {
        const doc = FB.marriageDoctrine(me.religion);
        if (doc.divorce) {
          const divCost = doc.divorce === 'sunder' ? 0 : (FBDATA.balance.dowryByStation[FB.stationOf(c)] || 0);
          if (doc.divorce === 'talaq') {
            h += '<button class="actionbtn" id="cm-divorce"' + (s.player.gold < divCost ? ' disabled' : '') +
              '>' + esc(FB.T('🕊 Pronounce the divorce ({money:gold})', { gold: divCost })) +
              '<span class="adesc">' + esc(FB.T(
                'Spoken before witnesses — and the mahr owed to {name} is paid out. (spends the day)',
                { name: c.name })) + '</span></button>';
          } else if (doc.divorce === 'get') {
            h += '<button class="actionbtn" id="cm-divorce"' + (s.player.gold < divCost ? ' disabled' : '') +
              '>' + esc(FB.T('📜 Grant a get ({money:gold})', { gold: divCost })) +
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
          h += '<button class="actionbtn" id="cm-annul"' + (canAn ? '' : ' disabled') + '>' +
            esc(FB.T('⛪ Petition to annul the marriage ({money:15}, 20 piety)')) +
            '<span class="adesc">' + (cdAn ? 'The church will not hear the plea again so soon.' :
              'Some flaw in the vows, some closeness of blood — the church may be persuaded the marriage never was.') + '</span></button>';
        }
        h += '<button class="actionbtn" id="cm-nochildren">' +
          esc(FB.T(s.player.flags.noChildren ? '🌱 Try for children' : '🛑 No more children')) +
          '<span class="adesc">' + esc(FB.T(s.player.flags.noChildren
            ? 'Open your house to new life once more.'
            : 'Your house is full enough — no new conceptions. A child already on the way will still be born.')) +
          '</span></button>';
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
        if (s.roles.rival === c.id) {
          const heat = FB.rivalHeat(s);
          h += '<div class="progressnote">' + esc(FB.T(
            '⚡ Rivalry: {state} ({heat}/100). Their regard shapes the chance of peace; heat shapes how far the feud may go.',
            { state: rivalryHeatName(heat), heat: heat })) + '</div>';
        } else if (s.player.rivalContacts && s.player.rivalContacts[c.id]) {
          h += '<div class="progressnote">' + esc(FB.T(
            '⚠ A hostile encounter is remembered. If their regard falls low enough, they may declare a feud of their own.')) +
            '</div>';
        }
        h += '<button class="actionbtn" id="cm-insult">😤 Insult them publicly' +
          '<span class="adesc">Salt for their pride, sport for the onlookers. (spends the day)</span></button>';
        h += '<button class="actionbtn" id="cm-undermine">🕸 Undermine them quietly' +
          '<span class="adesc">Rumors, debts, misplaced letters — intrigue decides. (spends the day)</span></button>';
        if (s.roles.rival === c.id) {
          h += '<button class="actionbtn" id="cm-settle">' + esc(FB.T('🕊 Seek a settlement…')) +
            '<span class="adesc">' + esc(FB.T(
              'Ask witnesses or a mediator to make a peace that binds you both. (spends the day)')) +
            '</span></button>';
        } else if (c.opinion <= -40) {
          const rivalNow = FB.getRole(s, 'rival', false);
          if (!rivalNow || rivalNow.dead) {
            h += '<button class="actionbtn" id="cm-rival">⚡ Declare rival' +
              '<span class="adesc">' + esc(FB.T('Name {name} your enemy. (spends the day)',
                { name: c.name })) + '</span></button>';
          }
        }
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
        esc(FB.T(self ? '🧑‍🏫 Choose schooling or a tutor…' : '🧑‍🏫 Arrange schooling or a tutor…')) +
        '<span class="adesc">' +
        esc(FB.T(self
          ? 'Instruction raises your yearly learning chance; paid lessons charge each season.'
          : 'Instruction raises their yearly learning chance; paid lessons charge each season.')) +
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
              talaq: '🕊 You pronounce the divorce from {name}; the mahr of {money:cost} is paid.',
              get: '📜 A get is written and witnessed; {name} departs with the ketubah of {money:cost}.',
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
      FB.noteRivalContact(s, c, 1, 'broken_courtship');
      FB.news(s, FB.msg('news.social.courtship_ended',
        '💔 The courtship of {name} is ended.', { name: c.name }));
      FB.validateFocus(s);
      UI.refresh();
    });
    const ins = $('cm-insult');
    if (ins) ins.addEventListener('click', function () {
      actThen(function () {
        c.opinion = FB.clamp(c.opinion - 12, -100, 100);
        FB.noteRivalContact(s, c, 1, 'insult');
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
      });
    });
    const und = $('cm-undermine');
    if (und) und.addEventListener('click', function () {
      actThen(function () {
        if (FB.chance(0.35 + FB.skillOf(me, 'int') * 0.03)) {
          c.opinion = FB.clamp(c.opinion - 8, -100, 100);
          FB.noteRivalContact(s, c, 1, 'undermined');
          s.player.prestige += 3;
          if (FB.chance(0.5)) FB.gainSkill(me, 'int', 1);
          FB.news(s, FB.msg('news.social.undermine_success',
            'Your quiet work costs {name} dearly, and no one can prove a thing.',
            { name: c.name }));
        } else {
          c.opinion = FB.clamp(c.opinion - 20, -100, 100);
          FB.noteRivalContact(s, c, 2, 'caught_scheme');
          s.player.prestige = Math.max(0, s.player.prestige - 6);
          FB.news(s, FB.msg('news.social.undermine_failure',
            'The scheme unravels — and {name} knows exactly whose hand was in it.',
            { name: c.name }));
        }
      });
    });
    const rv = $('cm-rival');
    if (rv) rv.addEventListener('click', function () {
      actThen(function () {
        FB.startRivalry(s, c, 'player', 'declared', null);
        FB.news(s, FB.msg('news.social.rival',
          '⚡ {name} now counts you an enemy.', { name: c.name }));
      });
    });
    const settle = $('cm-settle');
    if (settle) settle.addEventListener('click', function () {
      actThen(function () {
        s.eventQueue.push({ id: 'rival_mediation', ctx: {} });
      });
    });
    const nc = $('cm-nochildren');
    if (nc) nc.addEventListener('click', function () {
      if (s.player.flags.noChildren) {
        delete s.player.flags.noChildren;
        UI.toast('🌱 You will try for children again.');
      } else {
        s.player.flags.noChildren = 1;
        UI.toast('🛑 No more children — a pregnancy already begun will still come to term.');
      }
      UI.closeModal();
      UI.showCharModal(c.id);
      UI.refresh();
    });
    const ef = $('cm-edufocus');
    if (ef) ef.addEventListener('click', function () { UI.showEduFocus(c.id); });
    const tu = $('cm-tutor');
    if (tu) tu.addEventListener('click', function () { UI.showTutorPick(c.id); });
    const cr = $('cm-career');
    if (cr) cr.addEventListener('click', function () { UI.showCareerPicker(c.id); });
    const ceq = $('cm-equipment');
    if (ceq) ceq.addEventListener('click', function () {
      UI.showEquipmentModal(c.id, 'character');
    });
    const mt = $('cm-match');
    if (mt) mt.addEventListener('click', function () { UI.showMatchPicker(c.id); });
    $('cm-close').addEventListener('click', UI.closeModal);
  };

  UI.showEquipmentModal = function (cid, exitMode) {
    const s = FB.state;
    const c = s && s.chars[cid];
    if (!s || !c || c.dead || !FB.isHouseholdCharacter(s, cid)) return;
    exitMode = exitMode === 'character' ? 'character' : 'close';
    const returnMode = 'equipment:' + exitMode;
    const closeLabel = exitMode === 'character' ? FB.T('Back to character') : FB.T('Close');
    const h = equipmentSheetHtml(s, c) +
      '<div class="gm-footer"><button type="button" class="btn" id="equipment-close">' +
      esc(closeLabel) + '</button></div>';
    openModal(FB.T('Equipment for {name}', { name:FB.fullName(c) }), h,
      { modalClass:'fullsheet-modal' });
    FB.paintFaces($('gm-body'), s);
    wireEquipmentButtons($('gm-body'), returnMode);
    $('equipment-close').addEventListener('click', function () {
      if (exitMode === 'character') UI.showCharModal(cid);
      else UI.closeModal();
    });
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
      if (ask) details.push(FB.T('their kin ask a dowry of {money:gold}', { gold: ask }));
      if (m.dowryDue) {
        details.push(FB.T('she would bring a dowry of {money:gold}', { gold: m.dowryDue }));
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

  /* ================= suitor picker =================
     Seeking a match sounds out three families at once — an established house,
     a peer, and a young one (FB.spawnSuitor) — so age never decides the match
     by itself. The same three wait until one is chosen; the usual
     meet-and-court flow follows from there. */
  UI.showSuitorPicker = function () {
    const s = FB.state;
    if (!s || UI.eventsBusy()) return;
    const cands = FB.spawnSuitor(s).slice().sort(function (a, b) {
      return (a.suitorProfile || 0) - (b.suitorProfile || 0);
    });
    if (!cands.length) return;
    const ps = FB.playerStation(s);
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Kin and gossips name three who would hear your suit:')) +
      '</p></div><div class="gm-list">';
    for (const m of cands) {
      const st = FB.stationOf(m);
      const gap = st - ps;
      const age = FB.ageOf(m, s.date.year);
      const details = [
        FB.stationName(st),
        FB.T('age {age}', { age: age })
      ];
      const dowry = Math.round(FBDATA.balance.dowryByStation[st] || 0);
      if (dowry) {
        details.push(FB.T('would bring a dowry of about {money:gold}', { gold: dowry }));
      }
      details.push((m.sex === 'f' && age > 45) ? FB.T('🌱 past childbearing')
        : FB.T('🌱 fertility {percent}%', {
          percent: Math.round((m.fertility || 1) * FB.traitAgg(m).fert *
            FB.ageFert(m.sex, age) * 100)
        }));
      if (gap > 0) details.push(FB.T('a step up — a harder suit'));
      else if (gap < 0) details.push(FB.T('a step down — folk will mark it'));
      h += '<button class="actionbtn" data-suitor="' + m.id + '">💍 ' +
        esc((epithetText(s, m) ? epithetText(s, m) + ' — ' : '') + m.name) +
        '<span class="adesc">' + esc(details.join(' · ')) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">' + esc(FB.T('Decide nothing today')) + '</button>';
    openModal(FB.T('Seeking a Match'), h);
    document.querySelectorAll('[data-suitor]').forEach(function (b) {
      b.addEventListener('click', function () {
        const m = s.chars[b.dataset.suitor];
        if (!m) return;
        UI.closeModal();
        FB.pickSuitor(s, m.id);
        s.eventQueue.push({ id: 'meet_suitor', ctx: {} });
        FB.game.passDay({ skipFocus: true });
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
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
    if (fx.gold) parts.push(FB.T('{amount} gold a season',
      { amount:(fx.gold > 0 ? '+' : '') + fx.gold }));
    if (fx.health) parts.push(FB.T('{amount}% health protection', {
      amount:(fx.health > 0 ? '+' : '') + Math.round(fx.health * 10000) / 100
    }));
    return parts.join(' · ');
  }

  UI.showItemModal = function (id, viewOnly) {
    const s = FB.state;
    const item = s && FB.resolveItem(s, id);
    if (!s || !item) return;
    const def = item.def;
    const name = FB.itemName(s, id);
    const owned = !viewOnly && FB.itemList(s).indexOf(id) >= 0;
    const pledged = owned && FB.financeCollateralPledged &&
      FB.financeCollateralPledged(s, 'item', id);
    const assigned = owned && FB.itemAssignment(s, id);
    const blocked = owned && FB.equipmentBlockedReason(s);
    const fx = itemFxText(item);
    const sell = Math.round(item.value * (FBDATA.balance.itemSellRatio || 0.5));
    const quality = item.ordinary ? FB.itemQualityName(item.quality) : rarityName(def.rarity);
    const slot = item.grip === 2 ? FB.T('Both hands') :
      (item.slot === 'hand' ? FB.T('Either hand') : itemSlotLabel(item.slot));
    const equipLabel = assigned ? FB.T('Change equipment…') : FB.T('Equip…');
    let h = '<div class="item-card"><canvas class="itemart" data-item="' + esc(id) +
      '" width="144" height="144" role="img" aria-label="' + esc(name) + '"></canvas>' +
      '<div class="gm-body-text item-card-copy">' +
      '<p style="font-size:16px"><b>' + def.icon + ' ' + esc(name) +
      '</b> - <span class="cmeta">' + esc(quality) + '</span></p>' +
      '<p><i>' + esc(dt(s, 'item', item.defId, def, 'desc')) + '</i></p>' +
      (fx ? '<p>⚜ ' + esc(fx) + '</p>' : '<p class="cmeta">No power but its worth.</p>') +
      '<p class="cmeta">' + esc(FB.T('Slot: {slot}. Worth about {money:gold}.', {
        slot:slot, gold:item.value
      })) + '</p>' +
      (fx ? '<p class="cmeta">' + esc(FB.T(
        'Powers apply only while equipped. Skills and health affect the wearer; battle and seasonal resources count only on the head of the family.')) +
        '</p>' : '') +
      (assigned ? '<p class="cmeta">' + esc(itemWearerText(s, id)) + '</p>' :
        (owned ? '<p class="cmeta">' + esc(FB.T('In the family armory.')) + '</p>' : '')) +
      '</div></div>';
    if (owned && !pledged) {
      h += '<div class="gm-list">' +
        '<button class="actionbtn" id="im-equip"' + (blocked ? ' disabled' : '') + '>🧍 ' +
        esc(equipLabel) +
        '<span class="adesc">' + esc(FB.T(
          'Choose a household wearer and compatible slot. This costs no day.')) +
        '</span></button>' +
        (assigned ? '<button class="actionbtn" id="im-unequip"' + (blocked ? ' disabled' : '') + '>' +
          esc(FB.T('Return it to the armory')) +
          '<span class="adesc">' + esc(FB.T(
            'Unequip it before selling, gifting, or pledging it.')) + '</span></button>' : '') +
        (assigned ? '' :
        '<button class="actionbtn" id="im-give">🎁 Give it as a gift…' +
        '<span class="adesc">A treasure warms regard as mere silver never could. (spends the day)</span></button>' +
        '<button class="actionbtn" id="im-sell">' +
        esc(FB.T('💰 Sell it ({money:gold})', { gold: sell })) +
        '<span class="adesc">Sold is sold — there is no buying it back. (spends the day)</span></button>') +
        '</div>';
      if (blocked) {
        h += '<div class="progressnote warnote">' + esc(equipmentBlockedText(blocked)) + '</div>';
      }
    } else if (pledged) {
      h += '<div class="progressnote warnote">' +
        esc(FB.T('This treasure is pledged to a lender. It cannot be sold or given away until the loan is cleared.')) +
        '</div>';
    }
    h += '<button class="btn" id="gm-cancel" style="margin-top:10px">Close</button>';
    openModal(name, h);
    FB.paintFaces($('gm-body'), s);
    const eq = $('im-equip');
    if (eq) eq.addEventListener('click', function () { UI.showItemEquip(id); });
    const un = $('im-unequip');
    if (un) un.addEventListener('click', function () {
      const at = FB.itemAssignment(s, id);
      if (at) FB.unequipItem(s, at.cid, at.slots[0]);
      UI.refresh();
      UI.showItemModal(id);
    });
    const gv = $('im-give');
    if (gv) gv.addEventListener('click', function () { UI.showItemGive(id); });
    const sl = $('im-sell');
    if (sl) sl.addEventListener('click', function () {
      if (FB.sellItem(s, id)) {
        UI.closeModal();
        FB.game.passDay({ skipFocus: true });
      }
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* who to honor with it — everyone the player knows by name */
  UI.showItemGive = function (id) {
    const s = FB.state;
    const item = s && FB.resolveItem(s, id);
    if (!s || !item || FB.itemList(s).indexOf(id) < 0 ||
      FB.itemAssignment(s, id) ||
      (FB.financeCollateralPledged && FB.financeCollateralPledged(s, 'item', id))) return;
    const def = item.def;
    const me = s.chars[s.player.charId];
    const seen = {}, folk = [];
    function add(c, rel) {
      if (!c || c.dead || c.id === me.id || seen[c.id] ||
        (FB.isHouseholdCharacter && FB.isHouseholdCharacter(s, c.id))) return;
      seen[c.id] = 1;
      folk.push({ c: c, rel: rel });
    }
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
    const boost = FB.giftOpinion(item);
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Whom to honor with {icon} {item}? Such largesse is worth +{regard} regard.', {
        icon: def.icon, item: FB.itemName(s, id), regard: boost
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
        if (FB.giveItem(s, id, b.dataset.give)) {
          UI.closeModal();
          FB.game.passDay({ skipFocus: true });
        }
      });
    });
    $('gm-cancel').addEventListener('click', function () { UI.showItemModal(id); });
  };

  function equipCheckText(check) {
    if (!check || check.ok) return '';
    if (check.code === 'age') {
      return FB.T('Minimum age {age}', { age:check.ageMin });
    }
    if (check.code === 'pledged') return FB.T('Pledged to a lender');
    if (check.code === 'travel') return FB.T('Unavailable while traveling');
    if (check.code === 'event') return FB.T('Unavailable during an unresolved event');
    if (check.code === 'household') return FB.T('Not in the household');
    return FB.T('Cannot use this slot');
  }

  function equipmentExitMode(returnMode) {
    const prefix = 'equipment:';
    return returnMode && returnMode.indexOf(prefix) === 0
      ? returnMode.slice(prefix.length) : null;
  }

  function finishEquipment(cid, ref, returnMode) {
    UI.refresh();
    const exitMode = equipmentExitMode(returnMode);
    if (exitMode !== null) UI.showEquipmentModal(cid, exitMode);
    else if (returnMode === 'character') UI.showCharModal(cid);
    else if (returnMode === 'item') UI.showItemModal(ref);
    else UI.closeModal();
  }

  function confirmEquip(cid, slot, ref, returnMode) {
    const s = FB.state;
    const preview = FB.equipPreview(s, cid, slot, ref);
    if (!preview.ok) {
      UI.toast(equipCheckText(preview));
      return;
    }
    const item = preview.item;
    const changes = [];
    if (item.grip === 2) changes.push(FB.T('{item} will occupy both hands.', {
      item:FB.itemName(s, ref)
    }));
    for (const removed of preview.removed) {
      const wearer = s.chars[removed.cid];
      if (removed.ref === ref) {
        if (removed.cid !== cid) {
          changes.push(FB.T('{item} moves from {name}.', {
            item:FB.itemName(s, ref),
            name:wearer ? FB.fullName(wearer) : removed.cid
          }));
        }
        continue;
      }
      changes.push(FB.T('{item} returns to the armory from {name}.', {
        item:FB.itemName(s, removed.ref),
        name:wearer ? FB.fullName(wearer) : removed.cid
      }));
    }
    if (!changes.length) {
      FB.equipItem(s, cid, slot, ref);
      finishEquipment(cid, ref, returnMode);
      return;
    }
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'This equipment change will make the following moves:')) + '</p><ul>';
    for (const change of changes) h += '<li>' + esc(change) + '</li>';
    h += '</ul></div><div class="gm-list">' +
      '<button class="actionbtn" id="equip-confirm">' + esc(FB.T('Confirm equipment change')) +
      '</button></div><button class="btn" id="gm-cancel">' + esc(FB.T('Go back')) + '</button>';
    openModal(FB.T('Equip {item}', { item:FB.itemName(s, ref) }), h);
    $('equip-confirm').addEventListener('click', function () {
      const result = FB.equipItem(s, cid, slot, ref);
      if (result.ok) finishEquipment(cid, ref, returnMode);
    });
    $('gm-cancel').addEventListener('click', function () {
      UI.showEquipSlot(cid, slot, returnMode);
    });
  }

  UI.showEquipSlot = function (cid, slot, returnMode) {
    const s = FB.state;
    const c = s && s.chars[cid];
    if (!s || !c || !FB.isHouseholdCharacter(s, cid)) return;
    if (!returnMode) {
      returnMode = $('genmodal').classList.contains('hidden') ? 'close' : 'character';
    }
    const blocked = FB.equipmentBlockedReason(s);
    const loadout = FB.loadoutOf(s, cid);
    const current = loadout[slot];
    const refs = FB.itemList(s).filter(function (ref) {
      return FB.itemFitsSlot(s, ref, slot);
    }).sort(function (a, b) {
      return FB.itemName(s, a).localeCompare(FB.itemName(s, b));
    });
    if (!current && !refs.length) {
      UI.toast(FB.T('There is no compatible object in the armory.'));
      return;
    }
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Choose {name}’s {slot} equipment from the shared family armory.', {
        name:c.name, slot:itemSlotLabel(slot)
      })) + '</p></div>';
    if (blocked) {
      h += '<div class="progressnote warnote">' + esc(equipmentBlockedText(blocked)) + '</div>';
    }
    h += '<div class="gm-list equip-pick-list">';
    if (current) {
      const cur = FB.resolveItem(s, current);
      h += '<button class="actionbtn" id="equip-empty"' + (blocked ? ' disabled' : '') + '>' +
        esc(FB.T('Leave this slot empty')) + '<span class="adesc">' +
        esc(FB.T('{item} returns to the armory.', {
          item:cur ? FB.itemName(s, current) : current
        })) + '</span></button>';
    }
    for (const ref of refs) {
      const item = FB.resolveItem(s, ref);
      const check = FB.canEquipItem(s, cid, slot, ref);
      const at = FB.itemAssignment(s, ref);
      const here = current === ref;
      const detail = [
        itemFxText(item) || FB.T('No mechanical effect'),
        at ? itemWearerText(s, ref) : FB.T('In the armory'),
        check.ok ? '' : equipCheckText(check)
      ].filter(function (value) { return !!value; }).join(' - ');
      h += '<button class="actionbtn equip-choice" data-equip-ref="' + esc(ref) + '"' +
        (!check.ok || here ? ' disabled' : '') + '>' +
        '<canvas class="itemart" data-item="' + esc(ref) + '" width="54" height="54"></canvas>' +
        '<span><b>' + item.def.icon + ' ' + esc(FB.itemName(s, ref)) + '</b>' +
        '<span class="adesc">' + esc(here ? FB.T('Worn here') : detail) +
        '</span></span></button>';
    }
    if (!refs.length) {
      h += '<div class="progressnote">' + esc(FB.T(
        'There is no compatible object in the armory.')) + '</div>';
    }
    const equipmentExit = equipmentExitMode(returnMode);
    const cancelLabel = equipmentExit !== null ? FB.T('Back to equipment') : FB.T('Close');
    h += '</div><button class="btn" id="gm-cancel">' +
      esc(cancelLabel) + '</button>';
    openModal(FB.T('{slot} Equipment', { slot:itemSlotLabel(slot) }), h);
    FB.paintFaces($('gm-body'), s);
    const empty = $('equip-empty');
    if (empty) empty.addEventListener('click', function () {
      FB.unequipItem(s, cid, slot);
      finishEquipment(cid, current, returnMode);
    });
    const choices = $('gm-body').querySelectorAll('[data-equip-ref]');
    for (let i = 0; i < choices.length; i++) {
      choices[i].addEventListener('click', function () {
        confirmEquip(cid, slot, choices[i].getAttribute('data-equip-ref'), returnMode);
      });
    }
    $('gm-cancel').addEventListener('click', function () {
      if (equipmentExit !== null) UI.showEquipmentModal(cid, equipmentExit);
      else if (returnMode === 'character') UI.showCharModal(cid);
      else UI.closeModal();
    });
  };

  UI.showItemEquip = function (ref) {
    const s = FB.state;
    const item = s && FB.resolveItem(s, ref);
    if (!s || !item || FB.itemList(s).indexOf(ref) < 0) return;
    const blocked = FB.equipmentBlockedReason(s);
    const slots = item.slot === 'hand' ? ['rightHand', 'leftHand'] : [item.slot];
    const current = FB.itemAssignment(s, ref);
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Choose who should wear {item}. Selecting an assigned object moves it from its previous wearer.', {
        item:FB.itemName(s, ref)
      })) + '</p></div>';
    if (blocked) {
      h += '<div class="progressnote warnote">' + esc(equipmentBlockedText(blocked)) + '</div>';
    }
    h += '<div class="gm-list">';
    if (current) {
      h += '<button class="actionbtn" id="item-unequip"' + (blocked ? ' disabled' : '') + '>' +
        esc(FB.T('Return it to the armory')) + '<span class="adesc">' +
        esc(itemWearerText(s, ref)) + '</span></button>';
    }
    for (const cid of FB.householdCharacterIds(s)) {
      const c = s.chars[cid];
      for (const slot of slots) {
        const check = FB.canEquipItem(s, cid, slot, ref);
        const here = current && current.cid === cid && current.slots.indexOf(slot) >= 0;
        h += '<button class="actionbtn" data-item-equip-cid="' + cid +
          '" data-item-equip-slot="' + slot + '"' +
          (!check.ok || here ? ' disabled' : '') + '>' +
          esc(FB.T('{name} - {slot}', { name:FB.fullName(c), slot:itemSlotLabel(slot) })) +
          '<span class="adesc">' + esc(here ? FB.T('Worn here') :
            (check.ok ? FB.T('Available') : equipCheckText(check))) + '</span></button>';
      }
    }
    h += '</div><button class="btn" id="gm-cancel">' + esc(FB.T('Back to item')) + '</button>';
    openModal(FB.T('Equip {item}', { item:FB.itemName(s, ref) }), h);
    const un = $('item-unequip');
    if (un) un.addEventListener('click', function () {
      const at = FB.itemAssignment(s, ref);
      if (at) FB.unequipItem(s, at.cid, at.slots[0]);
      finishEquipment(at ? at.cid : s.player.charId, ref, 'item');
    });
    const choices = $('gm-body').querySelectorAll('[data-item-equip-cid]');
    for (let i = 0; i < choices.length; i++) {
      choices[i].addEventListener('click', function () {
        confirmEquip(choices[i].getAttribute('data-item-equip-cid'),
          choices[i].getAttribute('data-item-equip-slot'), ref, 'item');
      });
    }
    $('gm-cancel').addEventListener('click', function () { UI.showItemModal(ref); });
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
    const currentSchool = FB.schoolingId(s, c);
    const B = FBDATA.balance;
    function yearlyChance(chance) {
      return Math.round(Math.min(B.educationChanceCap || 0.9,
        chance + FB.holdingBonus(s, 'edu')) * 100);
    }
    function tutorChance(t) {
      return Math.min(B.educationChanceCap || 0.9,
        (B.educationTutorBase === undefined ? 0.3 : B.educationTutorBase) +
        (focus ? FB.skillOf(t, focus) : 0) *
        (B.educationTutorSkillChance === undefined ? 0.04 : B.educationTutorSkillChance));
    }
    function skillNote(t) {
      if (focus) return FB.T('{skill} {value} · {chance}% yearly', {
        skill:FB.skillName(focus), value:FB.skillOf(t, focus),
        chance:yearlyChance(tutorChance(t))
      });
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
    const existingTutor = FB.educationTutor(s, c, false);
    if (currentSchool === 'master' && existingTutor) {
      cands.unshift({
        id:existingTutor.id, c:existingTutor,
        name:FB.T('{name} (personal master)', { name:existingTutor.name })
      });
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
    for (const id in FBDATA.schooling) {
      if (id === 'master') continue;
      const def = FBDATA.schooling[id];
      const available = focus && FB.schoolingAvailable(s, c, id);
      const cur = currentSchool === id;
      let reason = FB.T('{chance}% yearly · {money:amount} each season', {
        chance:yearlyChance(def.chance), amount:def.cost || 0
      });
      if (!focus) reason = FB.T('Choose an education focus first.');
      else if (def.devMin && (s.dev[s.player.provinceId] || 1) < def.devMin) {
        reason = FB.T('Requires a town or city in your home county.');
      } else if (def.focuses && def.focuses.indexOf(focus) < 0) {
        reason = FB.T('This school does not teach the chosen focus.');
      } else if (FB.ageOf(c, s.date.year) < 6) {
        reason = FB.T('Lessons begin at age 6.');
      }
      h += '<button class="actionbtn" data-school="' + id + '"' +
        (!available ? ' disabled' : '') + '>' + (cur ? '◉ ' : '○ ') +
        def.icon + ' ' + esc(dt(s, 'schooling', id, def, 'name')) +
        '<span class="adesc">' + esc(reason) + '</span></button>';
    }
    for (const cd of cands) {
      const cur = c.edu && c.edu.tutorId === cd.id;
      const detail = cd.c.role === 'tutor' ?
        FB.T('{skill} · {money:amount} each season', {
          skill:skillNote(cd.c), amount:FBDATA.schooling.master.cost
        }) :
        FB.T('{skill} · free', { skill:skillNote(cd.c) });
      h += '<button class="actionbtn" data-tutor="' + cd.id + '">' + (cur ? '◉ ' : '○ ') + esc(cd.name) +
        '<span class="adesc">' + esc(detail) + '</span></button>';
    }
    if (currentSchool !== 'master') {
      h += '<button class="actionbtn" data-tutor="~hire"' +
        (!focus || s.player.gold < FBDATA.schooling.master.cost ? ' disabled' : '') +
        '>' + esc(FB.T('🎓 Hire a personal learned master ({money:amount} each season)', {
          amount:FBDATA.schooling.master.cost
        })) + '<span class="adesc">' + esc(masterDescription()) + '</span></button>';
    }
    h += '<button class="actionbtn" data-tutor="~none">' +
      (currentSchool || (c.edu && c.edu.tutorId) ? '○ ' : '◉ ') +
      esc(FB.T('Home instruction (free)')) + '<span class="adesc">' +
      esc(FB.T('{chance}% yearly directed-learning chance.', {
        chance:yearlyChance(B.educationBaseChance === undefined ? 0.18 : B.educationBaseChance)
      })) + '</span></button>';
    h += '</div><button class="btn" id="tut-back">' + esc(FB.T('Back')) + '</button>';
    openModal(self ? FB.T('🧑‍🏫 Your schooling') :
      FB.T('🧑‍🏫 Instruction for {name}', { name: c.name }), h);
    document.querySelectorAll('[data-school]').forEach(function (b) {
      b.addEventListener('click', function () {
        const id = b.getAttribute('data-school');
        if (!FB.schoolingAvailable(s, c, id)) return;
        c.edu = c.edu || {};
        c.edu.school = id;
        c.edu.tutorId = null;
        delete c.edu.schoolUnpaid;
        FB.news(s, FB.msg('news.education.school_chosen', {
          forms: {
            select:'value', param:'subject', cases:{
              self:'🎓 You begin lessons at {school}.',
              other:'🎓 {name} begins lessons at {school}.'
            }
          }
        }, {
          subject:self ? 'self' : 'other', name:c.name,
          school:FB.dataParam('schooling', id)
        }));
        UI.showCharModal(cid);
      });
    });
    document.querySelectorAll('[data-tutor]').forEach(function (b) {
      b.addEventListener('click', function () {
        const v = b.getAttribute('data-tutor');
        c.edu = c.edu || {};
        if (v === '~none') {
          c.edu.tutorId = null;
          c.edu.school = null;
          delete c.edu.schoolUnpaid;
          FB.news(s, FB.msg('news.education.home_instruction', {
            forms: {
              select: 'value', param: 'subject', cases: {
                self: '🎓 You return to instruction at home.',
                other: '🎓 {name} returns to instruction at home.'
              }
            }
          }, { subject: self ? 'self' : 'other', name: c.name }));
        } else if (v === '~hire') {
          if (!focus || s.player.gold < FBDATA.schooling.master.cost) return;
          const pr = FB.world.byId[s.player.provinceId];
          const master = FB.makeCharacter(s, {
            culture: pr.culture, religion: pr.religion,
            born: s.date.year - FB.ri(35, 60), quality: 3, role: 'tutor'
          });
          master.epithetMsg = FB.msg('fx.epithet.hired_master', 'Hired master', {});
          if (focus) master.skills[focus] = FB.clamp(FB.ri(15, 18), 0, FBDATA.balance.skillHardCap || 40);
          else master.skills.lea = FB.clamp(FB.ri(11, 16), 0, FBDATA.balance.skillHardCap || 40);
          c.edu.tutorId = master.id;
          c.edu.school = 'master';
          delete c.edu.schoolUnpaid;
          FB.news(s, FB.msg('news.education.master_hired', {
            forms: {
              select: 'value', param: 'subject', cases: {
                self: '🎓 {tutor}, a learned master, takes charge of your education for a seasonal fee.',
                other:'🎓 {tutor}, a learned master, takes charge of {name}’s education for a seasonal fee.'
              }
            }
          }, { subject: self ? 'self' : 'other', tutor: master.name, name: c.name }));
        } else {
          c.edu.tutorId = v;
          c.edu.school = s.chars[v] && s.chars[v].role === 'tutor' ? 'master' : null;
          delete c.edu.schoolUnpaid;
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

  /* tapped a topbar resource (the mobile path — desktop hovers): the same
     per-season source breakdown, as a small dismissable sheet */
  UI.showStatModal = function (stat) {
    const s = FB.state;
    if (!s || !s.player || s.player.dead) return;
    const me = s.chars[s.player.charId];
    const title = stat === 'gold' ? FB.T('💰 Money each season') :
      stat === 'prestige' ? FB.T('⭐ Prestige each season') :
      FB.religionOf(me.religion).icon + ' ' + FB.T('Piety each season');
    openModal(title, statBreakdownHtml(stat) +
      '<button class="btn" id="stat-close">Close</button>');
    $('stat-close').addEventListener('click', UI.closeModal);
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

  function deathProvenanceText(s, legend) {
    const prov = legend && legend.deathProvenance;
    if (!prov) return '';
    const province = prov.provinceId && FB.world.byId[prov.provinceId];
    const enemy = prov.enemyId && s.realms[prov.enemyId];
    if (prov.kind === 'battle' && province && enemy) {
      return FB.T('Fell in battle at {province} against {enemy}.', {
        province:province.name, enemy:enemy.name
      });
    }
    if (prov.kind === 'battle' && province) {
      return FB.T('Fell in battle at {province}.', { province:province.name });
    }
    if (prov.kind === 'battle' && enemy) {
      return FB.T('Fell in battle against {enemy}.', { enemy:enemy.name });
    }
    return province ? FB.T('The fatal event unfolded at {province}.', {
      province:province.name
    }) : '';
  }

  function wornAtDeathHtml(s, legend) {
    const loadout = legend && legend.loadout || {};
    const seen = {};
    let list = '';
    for (const slot of FB.ITEM_SLOTS) {
      const snap = loadout[slot];
      if (!snap || seen[snap.ref || snap.defId]) continue;
      seen[snap.ref || snap.defId] = 1;
      const item = FB.resolveItemSnapshot(snap);
      if (!item) continue;
      const slots = item.grip === 2 ? FB.T('Both hands') : itemSlotLabel(slot);
      list += '<div class="death-worn-row"><span>' + esc(slots) + '</span><b>' +
        item.def.icon + ' ' + esc(FB.itemNameFromSnapshot(s, s.player.charId, snap)) +
        '</b></div>';
    }
    if (!list) list = '<div class="cmeta">' + esc(FB.T('Nothing was worn.')) + '</div>';
    return '<div class="death-paper"><canvas id="death-paperdoll" class="paperdoll" ' +
      'width="240" height="450" role="img" aria-label="' +
      esc(FB.T('Final equipment worn by the deceased')) + '"></canvas>' +
      '<div class="death-worn"><h4>' + esc(FB.T('Worn at death')) + '</h4>' + list +
      '<p class="cmeta">' + esc(FB.T(
        'No object is lost. The outfit returns to the family armory at succession.')) +
      '</p></div></div>';
  }

  UI.showDeath = function (heirs, causeText) {
    const s = FB.state;
    const me = s.chars[s.player.charId];
    // G.die records the legend (and its parting quip) before opening this
    let h = '<div class="gm-body-text"><p>' + esc(causeText) + '</p>';
    const lg = s.legends && s.legends[s.legends.length - 1];
    const quip = lg && lg.id === me.id ? legendQuipText(lg, s) : '';
    if (quip) h += '<p><i>' + esc(quip) + '</i></p>';
    const provenance = lg && lg.id === me.id ? deathProvenanceText(s, lg) : '';
    if (provenance) h += '<p class="cmeta">' + esc(provenance) + '</p>';
    if (lg && lg.id === me.id) h += wornAtDeathHtml(s, lg);
    const debt = FB.financeActiveLoans ? FB.financeActiveLoans(s) : [];
    if (debt.length) {
      let due = 0;
      for (const loan of debt) due += FB.financeDueNow(s, loan);
      h += '<p class="op-bad"><b>' + esc(FB.T('Inherited debt:')) + '</b> ' +
        esc(financeDebtCountText(s, debt.length, financeAmount(due))) + '</p>';
    }
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
      const deathDoll = $('death-paperdoll');
      if (deathDoll && lg && lg.loadout) {
        FB.paintPaperDoll(deathDoll, me, s, { loadout:lg.loadout });
      }
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
      const deathDoll = $('death-paperdoll');
      if (deathDoll && lg && lg.loadout) {
        FB.paintPaperDoll(deathDoll, me, s, { loadout:lg.loadout });
      }
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
      kv('Final wealth', esc(FB.T('{money:amount}', { amount: s.player.gold }))) +
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
    h += '</div><div class="gm-footer"><button class="btn primary" id="gm-title-btn">' +
      esc(FB.T('Return to title')) + '</button></div>';
    openModal('The Chronicle Closes', h, { dismissable: false, modalClass: 'fullsheet-modal' });
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
      '<div class="hint" style="text-align:center;margin:10px auto 0">v' + esc(FB.VERSION) + '</div>' +
      '<div class="gm-footer"><button class="btn primary" id="m-close">✕ Close</button></div>';
    openModal('Menu', h, { modalClass: 'fullsheet-modal' });
    $('m-resume').addEventListener('click', UI.closeModal);
    $('m-close').addEventListener('click', UI.closeModal);
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
      '<p>Marry and raise children. When you die, you continue as your heir. No heir — no story. Ruler sheets show royal families and their designated successor. Courting a ruler’s child creates a dynastic tie; the crown passes only through the designated heir’s branch. A royal spouse may reign before your shared child becomes the protagonist, and only then do the realms join.</p>' +
      '<p>Open a child’s sheet (Kin tab) to choose an <b>education focus</b>, then arrange home lessons, school, or a tutor. Every option shows its yearly learning chance; schools and personal masters charge each season, while a named tutor’s own skill and habits shape the child. A Learning education grants literacy at 16.</p>' +
      '<p>Resident spouses and unmarried children add provisions and quarters to seasonal household upkeep. Working family members can offset that cost with wages or enterprise income.</p>' +
      '<h4>Rivalries</h4>' +
      '<p>Named characters remember hostile encounters. If their regard falls far enough, they may declare you a rival. Feud heat rises through insults and schemes, opening the way to claims and knives; restraint, common cause, compensation, mediation, witnessed oaths, or a duel can cool or end it. An heir chooses whether to inherit an old quarrel.</p>' +
      '<h4>De jure</h4>' +
      '<p>Every county belongs by ancient right to a duchy, a kingdom, and an empire — its <b>de jure</b> titles. Hold the majority of a title’s counties and you can claim that title for yourself. See the <b>De jure</b> row on any province, and the 🗺 map filters (<b>R</b>).</p>' +
      '<h4>The map</h4>' +
      '<p>Drag to pan; scroll, pinch, or <b>PgUp</b>/<b>PgDn</b> to zoom; tap a province for details. County names appear as you zoom in. Realms wage their own wars; borders shift with the decades.</p>' +
      '<h4>Map filters</h4>' +
      '<p>The 🗺 button (or <b>R</b>) cycles five ways to color the map: <b>realm</b>, <b>mine</b>, <b>liege</b>, <b>de jure duchies</b>, and <b>de jure kingdoms</b>.</p>' +
      '<h4>War</h4>' +
      '<p>From baron upward the Deeds tab always shows <b>⚔ Declare war</b>, with the exact reason when it is locked. A county war requires a bordering <b>de jure right</b> through a duchy, kingdom, or empire you hold, or your one <b>fabricated claim</b> (made through a plot). A rare crown-restoration right reaches the usurper’s capital without a shared border. Pacts and defensive alliances forbid attacks. Your host musters when war begins — tap it, then a province to march (or let ⚙ automation command it). <b>Land is taken only by siege:</b> stand on the prize and press the siege at three war councils. Allies send abstract defenders only when you are attacked; they never become separate war participants. Field victories make the enemy sue for peace. Attacked yourself? Keep their host out of your lands — three seasons unchecked and a province falls. Past eight seasons, exhaustion ends the war with nothing gained.</p>' +
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
      '<p>Mods are JSON files merged over the game data (events, provinces, realms, cultures, traits, currency, balance). See <b>docs/MODDING.md</b> in the game folder for the format. You can also edit the files in <b>data/</b> directly.</p>' +
      '<p>Mods stay on until removed, and saves remember their world — a life begun with a mod continues only while that mod is active.</p></div>' +
      (FB.mods.currencyInvalid && FB.mods.currencyInvalid()
        ? '<div class="progressnote warnote">' +
          esc(FB.T('An active mod has an invalid currency definition. The default currency is being used.')) +
          '</div>'
        : '') +
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
    $('travel-picker-cancel').addEventListener('click', UI.cancelTravelPicker);
    $('travel-picker-continue').addEventListener('click', reviewTravelChoice);
    FB.map.onTap = function (pr, wx, wy) {
      if (FB.game.pickMode) { FB.game.pickProvince(pr); return; }
      if (UI.travelPickerOpen()) {
        if (pr) UI.travelPickProvince(pr.id, false);
        return;
      }
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
      // a topbar resource opens its per-season source breakdown (tap path;
      // desktop also gets it on click, and keyboard Enter/Space clicks natively)
      const statBtn = e.target.closest('#tb-stats .stat[data-stat]');
      if (statBtn && FB.state && !FB.game.observe && !UI.eventsBusy()) {
        UI.showStatModal(statBtn.getAttribute('data-stat'));
        return;
      }
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
        const item = FB.resolveItem(FB.state, iid);
        if (item && UI.eventsBusy()) {
          UI.toastMessage(null, item.def.icon + ' ' + FB.itemName(FB.state, iid) + ' — ' +
            dt(FB.state, 'item', item.defId, item.def, 'desc'));
        } else if (item) {
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
    // instant hover tooltip for the topbar resources and trait/item chips (desktop)
    if (!FB.isTouch) {
      const tip = document.createElement('div');
      tip.id = 'tooltip';
      tip.className = 'hidden';
      document.body.appendChild(tip);
      document.addEventListener('mouseover', function (e) {
        if (!e.target || !e.target.closest) { tip.classList.add('hidden'); return; }
        // hovering a topbar resource shows what feeds it, season by season
        const statEl = e.target.closest('#tb-stats .stat[data-stat]');
        if (statEl && FB.state && !FB.game.observe) {
          tip.innerHTML = statBreakdownHtml(statEl.getAttribute('data-stat'));
          tip.classList.remove('hidden');
          const sr = statEl.getBoundingClientRect();
          tip.style.left = Math.max(4, Math.min(window.innerWidth - 250, sr.left)) + 'px';
          tip.style.top = Math.min(window.innerHeight - 110, sr.bottom + 6) + 'px';
          return;
        }
        const chip = e.target.closest('.traitchip[data-trait], .traitchip[data-ailment], .traitchip[data-item], .traitchip[data-itemview]');
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
          const iid = chip.getAttribute('data-item') || chip.getAttribute('data-itemview');
          const item = FB.state && FB.resolveItem(FB.state, iid);
          if (!item) return;
          const ifx = itemFxText(item);
          const quality = item.ordinary ? FB.itemQualityName(item.quality) : rarityName(item.def.rarity);
          tip.innerHTML = '<b>' + item.def.icon + ' ' + esc(FB.itemName(FB.state, iid)) + '</b> · ' +
            esc(quality) + '<br>' + esc(dt(FB.state, 'item', item.defId, item.def, 'desc')) +
            (ifx ? '<br><i>' + esc(ifx) + '</i>' : '') +
            '<br><i>' + esc(FB.T('worth ~{money:gold}', { gold: item.value })) + '</i>';
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
