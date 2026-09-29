/* Games calendar and reviews use the ordinary retained modal navigation.
   Every child sheet returns through a renderer that rebuilds its parent from
   current engine state and restores scroll, open Details and focus, so Back
   never shows terms or actions that a confirmed transaction has changed. */
(function () {
  'use strict';
  var UI = FB.ui, SH = UI._shared, esc = SH.esc, T = FB.tournaments, D = FBDATA.tournaments;
  var serial = 0;
  function el(id) { return document.getElementById(id); }
  function bind(id, fn) { var n = el(id); if (n) n.addEventListener('click', fn); }
  function text(s) { return '<p>' + esc(s) + '</p>'; }
  function fact(k, v) { return SH.kv(k, esc(String(v))); }
  function money(n) { return FB.T('{money:amount}', {amount:n}); }
  function percent(n) { return Math.round(n * 1000) / 10; }
  function button(id, label, disabled) {
    return '<button type="button" class="actionbtn" id="' + id + '"' + (disabled ? ' disabled' : '') + '>' + esc(label) + '</button>';
  }
  function footer() { return '<div class="gm-footer"><button type="button" class="btn" id="games-back">' + esc(FB.T('Back')) + '</button></div>'; }
  function people(title, rows) { return rows ? SH.reviewFactsCard(title, SH.reviewPeopleHtml(rows)) : ''; }
  function show(title, h, opts) {
    opts = opts || {};
    FB.game.setPaused(true);
    serial++;
    SH.openModal(title, '<div class="gm-body-text games-sheet">' + h + '</div>' + footer(), {
      historyView:true, replaceView:!!opts.replace, modalKey:'games',
      historyBackRender:opts.back, titleDetailsHtml:opts.details
    });
    if (FB.paintFaces) FB.paintFaces(el('gm-body'), FB.state);
  }
  function focusTarget(id) {
    var n = el(id);
    if (!n || !n.disabled) return n;
    var card = n.closest('.settcard');
    return card && card.hasAttribute('tabindex') ? card : null;
  }
  function capture() {
    var body = el('gm-body'), active = document.activeElement, focus = null;
    if (active && body.contains(active)) {
      if (active.id) focus = active.id;
      else if (active.classList.contains('settcard')) {
        var inner = active.querySelector('[id]');
        focus = inner && inner.id;
      }
    }
    return { scroll:body.scrollTop, focus:focus,
      expanded:Array.prototype.map.call(document.querySelectorAll('#genmodal .settcard-details:not(.hidden)'),
        function (n) { return n.id; }).filter(Boolean) };
  }
  function restore(view) {
    var mine = serial;
    view.expanded.forEach(function (id) {
      var details = el(id), toggle = document.querySelector('#genmodal [aria-controls="' + id + '"]');
      if (!details || !toggle) return;
      details.classList.remove('hidden');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.title = FB.T('Hide details'); toggle.setAttribute('aria-label', FB.T('Hide details'));
    });
    function apply() {
      if (mine !== serial || el('genmodal').classList.contains('hidden')) return;
      var target = view.focus && focusTarget(view.focus);
      if (target) target.focus({ preventScroll:true });
      el('gm-body').scrollTop = view.scroll;
    }
    apply(); setTimeout(apply, 0);
  }
  // Captures the sheet being left; the returned renderer rebuilds it fresh.
  function returnTo(render) {
    var view = capture();
    return function () { render(); restore(view); };
  }
  function settled(ok, message) {
    if (!ok) UI.toast(message || FB.T('Terms changed. Review the current gathering.'));
    if (FB.state.chars[FB.state.player.charId].health <= 0) {
      (UI.closeModalStack || UI.closeModal)(); FB.game.afterEvents(); return true;
    }
    UI.refresh();
    return false;
  }
  function confirmation(title, h, card, back, action) {
    show(title, h + SH.reviewActionsHtml(SH.reviewActionCardHtml({ id:'games-confirm', label:card.label,
      note:card.note, warn:!!card.danger, danger:!!card.danger })), { back:back, details:card.details });
    bind('games-confirm', function () {
      this.disabled = true;
      if (!settled(action())) UI.backModal();
    });
  }
  function label(group, id) {
    var d = D[group][id];
    return d ? FB.dataText(FB.state, FB.state.player.charId, 'tournament_' + group, id, d, 'name', {}) : id;
  }
  function date(turn) {
    var d = T.date(FB.state, turn);
    return FB.T('{season} {day}, {year}', { season:FB.seasonName(d.season), day:d.day, year:d.year });
  }
  function card(id, name, note, details, blocked) {
    return SH.reviewActionCardHtml({ id:id, label:name, note:note, details:details, disabled:!!blocked, warn:!!blocked, detailsId:id + '-details' });
  }
  function infoCard(id, name, note, details) {
    return '<div class="settcard" id="' + id + '" tabindex="0"><div class="settcard-head"><h4>' + esc(name) + '</h4>' +
      '<span class="settcard-actions"><button type="button" class="btn small settcard-info" aria-expanded="false" aria-controls="' +
      id + '-details" title="' + esc(FB.T('Details')) + '" aria-label="' + esc(FB.T('Details')) + '">?</button></span></div>' +
      text(note) + '<div class="settcard-details hidden" id="' + id + '-details">' + details + '</div></div>';
  }
  function riskText(track, tactic) {
    var d = D.tracks[track], t = D.tactics[tactic || 'balanced'];
    if (!d || !d.injury) return '';
    return FB.T('Injury {risk}% per round, {severe}% severe and possibly fatal', {risk:percent(d.injury * t.risk),severe:percent(d.severe * t.risk)});
  }
  function statusName(e) {
    if (e.status === 'running') return FB.T('Under way');
    if (e.status === 'cancelled') return FB.T('Cancelled');
    if (e.status === 'completed') return FB.T('Completed');
    return FB.T('Announced');
  }
  function distance(s, e, legDays) {
    var t = s.player.travel, origin = t ? t.currentId : s.player.provinceId;
    if (origin === e.provinceId) return FB.T('At your location');
    var route = FB.travelRoute(origin, e.provinceId);
    return route ? FB.T('About {days} days’ journey', {days:route.length * legDays}) : FB.T('No route from your location');
  }
  function gameCard(s, e, legDays) {
    var eligibility = T.eligibility(s, s.player.charId, e), p = T.participant(e, s.player.charId), host = s.chars[e.hostId];
    var state = e.hostId === s.player.charId ? FB.T('You host') : p ? FB.T('Entered: {activity}', {activity:label('tracks', p.track)}) :
      !eligibility.ok ? eligibility.reason : distance(s, e, legDays);
    var note = [date(e.startTurn), label('scales', e.scale), FB.T('Headline purse {money:prize}', {prize:e.funding.prizes.headline}), state].join(' · ');
    var details = (host ? SH.reviewPeopleHtml(SH.reviewPersonHtml(host, FB.T('Host'))) : '') + fact(FB.T('Programme'), programme(e)) +
      fact(FB.T('Closing'), date(e.closeTurn)) + fact(FB.T('Funding paid'), money(e.funding.total));
    return SH.reviewActionCardHtml({ id:'games-' + e.id, label:T.venueName(e), note:note, details:details, warn:!eligibility.ok });
  }
  UI.showGames = function (filter, replace, ids, back) {
    filter = filter || 'upcoming';
    var s = FB.state, rows = T.list(s, filter), h = '<label for="games-filter">' + esc(FB.T('Calendar filter')) + '</label><select id="games-filter">';
    function self() { UI.showGames(filter, false, ids, back); }
    [{id:'upcoming',name:FB.T('Upcoming')},{id:'reachable',name:FB.T('Reachable')},{id:'local',name:FB.T('Local')},{id:'bookings',name:FB.T('My bookings')}].forEach(function (f) {
      h += '<option value="' + f.id + '"' + (filter === f.id ? ' selected' : '') + '>' + esc(f.name) + '</option>';
    });
    h += '</select>';
    if (ids) {
      rows = rows.filter(function (e) { return ids.indexOf(e.id) >= 0; });
      h += button('games-all', FB.T('Show the full calendar'));
    }
    var circuit = s.player.circuit;
    if (circuit && circuit.charId === s.player.charId) {
      h += fact(FB.T('Circuit victories'),circuit.victories) + fact(FB.T('Circuit earnings'),money(circuit.earnings)) + fact(FB.T('Circuit reputation'),circuit.reputation);
      var known = '', named = [];
      circuit.contacts.forEach(function (c) {
        var person = s.chars[c.id];
        if (person) known += SH.reviewPersonHtml(person, FB.T('Circuit contact'));
        else named.push(c.name);
      });
      h += people(FB.T('Circuit contacts'), known);
      if (named.length) h += fact(known ? FB.T('Other competitors met') : FB.T('Competitors met'), named.join(', '));
    }
    var legDays = FB.travelLegDaysSnapshot(s), cards = '';
    rows.forEach(function (e) { cards += gameCard(s, e, legDays); });
    h += cards ? SH.reviewActionsHtml(cards) : text(FB.T('No funded games match this view.'));
    if (s.player.tier >= 3) h += button('games-host', FB.T('Host games…'));
    var annual = (s.tournaments && s.tournaments.annual || []).filter(function (a) { return a.hostId === s.player.charId; })[0];
    if (annual) h += fact(FB.T('Annual spending ceiling'), money(annual.ceiling)) + fact(FB.T('Next intended edition'), date(annual.nextTurn)) + button('games-stop', FB.T('Stop annual recurrence…'));
    var journey = s.player.travel && s.player.travel.purpose === 'tournament' && s.player.travel.phase !== 'return' ? s.player.travel : null;
    if (journey) h += button('games-return', FB.T('Begin the funded return home…'));
    show(FB.T('Events calendar'), h, { replace:replace, back:back });
    el('games-filter').addEventListener('change', function () { UI.showGames(this.value, true, ids, back); });
    bind('games-all', function () { UI.showGames(filter, true, null, back); });
    rows.forEach(function (e) { bind('games-' + e.id, function () { UI.showTournament(e.id, false, returnTo(self)); }); });
    bind('games-host', function () { UI.showHostGames(null, null, returnTo(self)); });
    bind('games-stop', function () {
      confirmation(FB.T('Stop annual recurrence'), fact(FB.T('Next intended edition'), date(annual.nextTurn)) + fact(FB.T('Annual spending ceiling'), money(annual.ceiling)),
        { label:FB.T('Stop annual recurrence'), note:FB.T('No later edition is scheduled. The announced edition and its funding are unchanged.') },
        returnTo(self), function () { return T.stopAnnual(FB.state, FB.state.player.charId); });
    });
    bind('games-return', function () {
      var current = T.get(s, journey.tournamentId), p = T.participant(current, s.player.charId), active = p && p.status === 'active';
      confirmation(FB.T('Return home'), fact(FB.T('Return allowance'), money(journey.returnReserve)) + (active ? fact(FB.T('Primary activity'), label('tracks', p.track)) : ''),
        { label:FB.T('Begin the funded return home'), danger:active,
          note:active ? FB.T('Withdraws from your activity: unused entry payments and reserves return, earned rewards stay, circuit reputation -1.') : FB.T('The reserved allowance pays the journey; no new payment.') },
        returnTo(self), function () { return T.returnHome(FB.state, false); });
    });
  };
  function programme(e) {
    var host = FB.state.chars[e.hostId], religion = host && FBDATA.religions[host.religion];
    if (e.programme === 'mounted' && religion && religion.group === 'muslim') return FB.T('Furusiyya and open games');
    if (e.programme === 'martial' && FB.state.date.year < 1100) return FB.T('Martial exercises and open games');
    return label('programmes', e.programme);
  }
  function entrantsHtml(s, f, track) {
    var rows = '', names = [];
    f.entrants.forEach(function (c) {
      var person = c.charId && s.chars[c.charId];
      if (person) rows += SH.reviewPersonHtml(person, FB.T('Ability {ability}', { ability:Math.round(FB.skillSnapshot(s, person, D.tracks[track].skill)) }));
      else names.push(FB.T('{name} · ability {ability}', { name:c.name, ability:Math.round(c.ability) }));
    });
    return SH.reviewPeopleHtml(rows) + (names.length ? '<ul><li>' + names.map(esc).join('</li><li>') + '</li></ul>' : '');
  }
  UI.showTournament = function (id, replace, back) {
    var s = FB.state, e = T.get(s, id);
    if (!e) { UI.toast(FB.T('That edition has left the calendar.')); return; }
    function self() { UI.showTournament(id, false, back); }
    function refresh(ok) {
      var view = capture();
      if (settled(ok)) return;
      UI.showTournament(id, true, back); restore(view);
    }
    var host = s.chars[e.hostId], p = T.participant(e, s.player.charId), eligible = T.eligibility(s, s.player.charId, e);
    var open = e.status === 'announced' || e.status === 'running';
    var h = host ? SH.reviewPeopleHtml(SH.reviewPersonHtml(host, FB.T('Host'))) : fact(FB.T('Host'), FB.T('Former host'));
    h += fact(FB.T('Status'), statusName(e)) + fact(FB.T('Opening'), date(e.startTurn)) + fact(FB.T('Closing'), date(e.closeTurn)) +
      fact(FB.T('Programme'), programme(e)) + fact(FB.T('Funding paid'), money(e.funding.total));
    if (e.guests && e.guests.length) {
      h += people(FB.T('Local guests'), e.guests.map(function (gid) { return s.chars[gid]; }).filter(Boolean).map(function (c) {
        return SH.reviewPersonHtml(c, FB.T('Local guest'));
      }).join(''));
    }
    if (!eligible.ok) h += text(eligible.reason);
    Object.keys(e.contests).forEach(function (track) {
      var f = e.contests[track], purse = ['joust','melee'].indexOf(track) >= 0 ? 'headline' : track, risk = riskText(track);
      var details = text(FB.T('Eight named entrants; three rounds. Skill, equipment, health, preparation and fatigue decide individual performance.'));
      if (track === 'melee') details += text(FB.T('The winning team shares the headline purse equally among four teammates.'));
      details += entrantsHtml(s, f, track);
      h += infoCard('games-field-' + track, label('tracks', track),
        FB.T('Promised purse {money:prize} · {rounds}/3 rounds completed', {prize:e.funding.prizes[purse],rounds:f.round}) + (risk ? ' · ' + risk : ''), details);
    });
    if (!p && open) h += button('games-activities', FB.T('Choose competition or livelihood…'));
    var actions = '';
    if (p) {
      h += fact(FB.T('Primary activity'), label('tracks',p.track)) +
        fact(FB.T('Fatigue'), FB.T('{fatigue} · round strength -{penalty}', {fatigue:p.fatigue,penalty:Math.round(p.fatigue * 6.5) / 10})) +
        fact(FB.T('Payments earned'), money(p.paid + (p.prizePaid || 0)));
      if (p.tradeSettled) h += fact(FB.T('Trading profit or loss'),money(p.tradeProfit));
      var q = T.roundPreview(s, id, s.player.charId, 'balanced');
      if (q && p.status === 'active') {
        h += fact(FB.T('Next round'), date(q.dueTurn));
        h += button('games-round', FB.T('Review round tactics…'));
      }
      if (p.status === 'active') {
        var attendance = T.attendance(s,s.player.charId,e), funds = T.available(s, s.player.charId);
        if (q && q.round < 3 && !p.eliminated) {
          var preparationBlock = p.prepared ? FB.T('Preparation is already chosen for this round.') : !attendance.ok ? attendance.reason : '';
          actions += card('games-rest',FB.T('Rest before the next round'),preparationBlock || FB.T('Fatigue -3'),text(FB.T('Choose one rest or practice action before each round.')),!!preparationBlock);
          actions += card('games-practice',FB.T('Practice'),preparationBlock || FB.T('Preparation +1, fatigue +1'),text(FB.T('Choose one rest or practice action before each round.')),!!preparationBlock);
        }
        actions += card('games-social',FB.T('Meet the host’s company'),!attendance.ok ? attendance.reason : p.social.introductions ? FB.T('Introductions completed.') : FB.T('Host Standing +3'),
          text(FB.T('One introduction per edition, in person.')),!attendance.ok || p.social.introductions);
        var giftBlock = !attendance.ok ? attendance.reason : p.social.gift ? FB.T('Gift already offered.') :
          funds < 5 ? FB.T('Requires {money:cost} of available coin.', {cost:5}) : '';
        actions += card('games-gift',FB.T('Offer a gift ({money:cost})', {cost:5}),giftBlock || FB.T('Host Standing +6, prestige +2'),
          text(FB.T('One gift per edition, suitable for every faith.')),!!giftBlock);
      }
    }
    var journey = T.travelQuote(s, id);
    if (open) h += fact(FB.T('Estimated arrival'), date(journey.arrivalTurn));
    if (open && !journey.local) actions += card('games-travel', FB.T('Travel to these games…'), journey.ok ? FB.T('Pay {money:cost}, including a {money:reserve} return allowance', {cost:journey.cost,reserve:journey.returnReserve}) : journey.reasons[0],
      text(FB.T('The household stays at home. This circuit journey has no annual departure cooldown or 90-day stay. Later arrivals can attend remaining festivities.')) +
      (journey.reasons.length > 1 ? text(journey.reasons.join(' ')) : ''), !journey.ok);
    h += SH.reviewActionsHtml(actions);
    if (p && p.status === 'active') h += button('games-withdraw', FB.T('Withdraw from this edition…'));
    if (e.hostId === s.player.charId && open) h += button('games-cancel', FB.T('Cancel this edition…'));
    show(T.venueName(e), h, { replace:replace, back:back });
    bind('games-activities', function () { UI.showGamesActivities(id, returnTo(self)); });
    bind('games-travel', function () { if (journey.ok) UI.showGamesTravel(id, returnTo(self)); });
    bind('games-round', function () { UI.showGamesRound(id, returnTo(self)); });
    bind('games-rest', function () { refresh(T.prepare(s, id, s.player.charId, 'rest')); });
    bind('games-practice', function () { refresh(T.prepare(s, id, s.player.charId, 'practice')); });
    bind('games-social', function () { refresh(T.social(s, id, 'introductions')); });
    bind('games-gift', function () { refresh(T.social(s, id, 'gift')); });
    bind('games-withdraw', function () {
      confirmation(FB.T('Withdraw'), fact(FB.T('Primary activity'), label('tracks', p.track)) + fact(FB.T('Payments earned'), money(p.paid + (p.prizePaid || 0))),
        { label:FB.T('Withdraw from this edition'), danger:true,
          note:FB.T('Unused entry payments, forfeit reserve and unspent trade capital return. Earned rewards stay. Circuit reputation -1.') },
        returnTo(self), function () { return T.withdraw(FB.state,id,FB.state.player.charId,false); });
    });
    bind('games-cancel', function () {
      confirmation(FB.T('Cancel games'), fact(FB.T('Funding paid'), money(e.funding.total)) + fact(FB.T('Opening'), date(e.startTurn)),
        { label:FB.T('Cancel this edition'), danger:true,
          note:FB.T('Unawarded prizes and unused services return to the host. Preparation and completed work remain spent. The regional slot is released immediately.') },
        returnTo(self), function () { return T.cancel(FB.state,id,FB.state.player.charId); });
    });
  };
  UI.showGamesActivities = function (id, back) {
    var s = FB.state, e = T.get(s, id), quotes = [], h = '', cards = '';
    if (!e) return;
    function self() { UI.showGamesActivities(id, back); }
    var p = T.participant(e, s.player.charId);
    if (p) h += fact(FB.T('Primary activity'), label('tracks', p.track)) + button('games-activity-return', FB.T('Return to the gathering'));
    Object.keys(D.tracks).forEach(function (track) {
      if (D.tracks[track].contest && !e.contests[track]) return;
      var q = T.entry(s,id,s.player.charId,track), risk = riskText(track); quotes.push(q);
      var terms = FB.T('Entry {money:fee} · forfeit reserve {money:forfeit} · trade stake {money:stake} · work contract {money:contract}', q.terms);
      var details = text(terms) + text(FB.T('One primary activity per edition. Earned payments are retained if war interrupts. Local serf duties continue.'));
      if (q.reasons.length > 1) details += text(q.reasons.join(' '));
      if (q.sponsored) details += text(FB.T('Event-specific sponsorship provides backing and equipment access without changing rank.'));
      cards += card('games-enter-' + track,label('tracks',track),q.ok ? terms + (risk ? ' · ' + risk : '') : q.reasons[0],details,!q.ok);
    });
    h += SH.reviewActionsHtml(cards);
    show(FB.T('Competition and livelihoods'), h, { back:back });
    bind('games-activity-return', function () { UI.backModal(); });
    quotes.forEach(function (q) { bind('games-enter-' + q.track,function () {
      if (!q.ok) return;
      var cost = q.terms.fee + q.terms.forfeit + q.terms.stake, risk = riskText(q.track);
      confirmation(label('tracks',q.track),fact(FB.T('Entry payment'),money(q.terms.fee)) + fact(FB.T('Reserved monetary forfeit'),money(q.terms.forfeit)) +
        fact(FB.T('Trade capital at risk'),money(q.terms.stake)) + fact(FB.T('Full service contract'),money(q.terms.contract)),
        { label:FB.T('Enter and pay {money:cost}', {cost:cost}), danger:!!risk, note:risk || FB.T('One primary activity per edition.') },
        returnTo(self), function () { return !!T.enter(FB.state,q); });
    }); });
  };
  UI.showGamesTravel = function (id, back) {
    var q = T.travelQuote(FB.state,id);
    if (!q.ok) { UI.toast(q.reasons.join(' ')); return; }
    confirmation(FB.T('Tournament journey'),fact(FB.T('Estimated arrival'),date(q.arrivalTurn)) + fact(FB.T('Pay now'),money(q.cost)) + fact(FB.T('Return allowance'),money(q.returnReserve)),
      { label:FB.T('Set out and pay {money:cost}', {cost:q.cost}), note:FB.T('The return allowance is reserved for the journey home.'),
        details:text(FB.T('At closure, book another eligible gathering or begin the funded return. After three days without a reachable onward booking, the return begins automatically.')) },
      back, function () { return T.depart(FB.state,q); });
  };
  UI.showGamesRound = function (id, back) {
    var s = FB.state, choices = [], cards = '';
    Object.keys(D.tactics).forEach(function (tactic) {
      var q = T.roundPreview(s,id,s.player.charId,tactic);
      if (!q || (tactic === 'assist' && q.track !== 'melee')) return;
      choices.push(q);
      var odds = q.scored ? FB.T('Score base {power}, plus a roll from 0 to 12 · fatigue +{fatigue}',{power:Math.round(q.power*10)/10,fatigue:q.fatigue}) :
        FB.T('Round win chance {chance}% · fatigue +{fatigue}',{chance:Math.round(q.chance*100),fatigue:q.fatigue});
      var risk = q.injury ? FB.T('Injury {risk}%, {severe}% severe and possibly fatal',{risk:percent(q.injury),severe:percent(q.severe)}) : '';
      cards += card('games-tactic-' + tactic,label('tactics',tactic),q.ok ? odds + (risk ? ' · ' + risk : '') : q.reason,
        text(FB.T('Fatigue raises injury risk and lowers later round strength.')),!q.ok);
    });
    show(FB.T('Round tactics'), SH.reviewActionsHtml(cards), { back:back });
    choices.forEach(function (q) { bind('games-tactic-' + q.tactic,function () {
      if (!q.ok) return;
      this.disabled = true;
      if (!settled(T.resolveRound(FB.state,q))) UI.backModal();
    }); });
  };
  UI.showHostGames = function (pid, slot, back, draft) {
    var s = FB.state, sites = FB.directSettlements(s,'player'), dates = T.dates(s,s.player.charId);
    if (!sites.length) { show(FB.T('Host games'),text(FB.T('Direct ownership of an established settlement is required.')),{ back:back }); return; }
    draft = draft || {};
    function option(value, name, selected) { return '<option value="' + esc(value) + '"' + (selected ? ' selected' : '') + '>' + esc(name) + '</option>'; }
    var h = '<label for="games-venue">' + esc(FB.T('Venue')) + '</label><select id="games-venue">';
    sites.forEach(function (site,i) {
      h += option(i, T.venueName(site), draft.venue !== undefined ? draft.venue === String(i) : pid === site.provinceId && slot === site.settlement);
    });
    h += '</select>';
    ['scales','programmes'].forEach(function (group) {
      h += '<label for="games-' + group + '">' + esc(group === 'scales' ? FB.T('Scale') : FB.T('Programme')) + '</label><select id="games-' + group + '">';
      Object.keys(D[group]).forEach(function (key) { h += option(key, label(group,key), draft[group] === key); });
      h += '</select>';
    });
    h += '<label for="games-date">' + esc(FB.T('Opening date')) + '</label><select id="games-date">';
    dates.forEach(function (turn) { h += option(turn, date(turn), draft.date === String(turn)); });
    h += '</select>';
    if (!dates.length) h += text(FB.T('No spring or summer date currently meets the notice and host-spacing rules.'));
    h += '<label><input type="checkbox" id="games-annual"' + (draft.annual ? ' checked' : '') + '> ' + esc(FB.T('Repeat annually, subject to renewal')) + '</label>';
    h += '<div id="games-ceiling-row"' + (draft.annual ? '' : ' class="hidden"') + '><label for="games-ceiling">' + esc(FB.T('Annual spending ceiling')) +
      '</label><input id="games-ceiling" type="number" min="0" step="25" value="' + esc(draft.ceiling || '500') + '"></div>';
    h += button('games-review',FB.T('Review funding and availability'), !dates.length);
    show(FB.T('Host games'),h,{ back:back });
    var touched = !!draft.programmeTouched;
    function venue() { return sites[Number(el('games-venue').value)]; }
    if (!draft.programmes) el('games-programmes').value = T.defaultProgramme(s,s.player.charId,venue());
    el('games-venue').addEventListener('change', function () {
      if (!touched) el('games-programmes').value = T.defaultProgramme(FB.state,FB.state.player.charId,venue());
    });
    el('games-programmes').addEventListener('change', function () { touched = true; });
    el('games-annual').addEventListener('change', function () { el('games-ceiling-row').classList.toggle('hidden', !this.checked); });
    bind('games-review',function () {
      var site = venue(), current = { venue:el('games-venue').value, scales:el('games-scales').value, programmes:el('games-programmes').value,
        date:el('games-date').value, annual:el('games-annual').checked, ceiling:el('games-ceiling').value, programmeTouched:touched };
      var spec = {hostId:FB.state.player.charId,provinceId:site.provinceId,settlement:site.settlement,scale:current.scales,programme:current.programmes,
        startTurn:Number(current.date),annual:current.annual,ceiling:current.annual ? Number(current.ceiling) : 0};
      var view = capture();
      UI.reviewHostGames(spec, function () {
        // A funded edition takes the form's place, so Back leaves hosting.
        if (spec.booked) { UI.showTournament(spec.booked, false, back); return; }
        UI.showHostGames(pid, slot, back, current); restore(view);
      });
    });
  };
  UI.reviewHostGames = function (spec, back, replace) {
    var q = T.quote(FB.state, spec), f = q.funding;
    var h = fact(FB.T('Venue'),T.venueName(q)) + fact(FB.T('Opening'),date(q.startTurn)) + fact(FB.T('Current recurring net / season'),money(q.income.projection)) +
      fact(FB.T('Recorded seasonal average'),money(q.income.average)) + fact(FB.T('Reference income'),money(q.income.reference));
    if (f) h += fact(FB.T('Funding due now'),money(f.total)) + fact(FB.T('Headline prize'),money(f.prizes.headline)) + fact(FB.T('Archery prize'),money(f.prizes.archery)) + fact(FB.T('Wrestling prize'),money(f.prizes.wrestling)) +
      fact(FB.T('Performer awards'),money(f.prizes.perform)) + fact(FB.T('Workforce and entertainment'),money(f.services)) + fact(FB.T('Preparation and hospitality'),money(f.preparation)) + fact(FB.T('Treasury remaining'),money(q.treasury-f.total));
    if (f && q.available !== q.treasury) h += fact(FB.T('Uncommitted treasury remaining'),money(q.available-f.total));
    var details = text(FB.T('The reference is the greatest of zero, current recurring net and up to four seasonal samples. Daily focus, campaign spending and one-time transactions are excluded.')) +
      text(FB.T('Funding is the greater of {money:minimum} and {multiple} times reference income, rounded upward to 25.',{minimum:D.scales[q.scale].minimum,multiple:D.scales[q.scale].multiplier}));
    if (q.annual) {
      h += fact(FB.T('Annual spending ceiling'),money(q.ceiling));
      details += text(FB.T('Renewal is attempted 60 days before each annual start. Failed renewal skips the year without charging.'));
    }
    h += fact(FB.T('All events: occupied / limit'),q.capacity.used[0] + ' / ' + q.capacity.limits[0]) + fact(FB.T('Regional and grand: occupied / limit'),q.capacity.used[1] + ' / ' + q.capacity.limits[1]) + fact(FB.T('Grand: occupied / limit'),q.capacity.used[2] + ' / ' + q.capacity.limits[2]);
    q.capacity.occupants.forEach(function (e) { h += fact(T.venueName(e),FB.T('Closes {date}',{date:date(e.closeTurn)})); });
    q.reasons.forEach(function (reason) { h += text(reason); });
    if (q.ok) h += button('games-fund',FB.T('Fund and announce ({money:cost})',{cost:f.total}));
    show(FB.T('Review games funding'),h,{ back:back, replace:replace, details:details });
    bind('games-fund',function () {
      var e = T.book(FB.state,q);
      if (e) { spec.booked = e.id; UI.refresh(); UI.backModal(); return; }
      UI.toast(FB.T('Terms changed. Review the funding again.'));
      var view = capture();
      UI.reviewHostGames(spec, back, true); restore(view);
    });
  };
})();
