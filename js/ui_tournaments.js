/* Games calendar and reviews use the ordinary retained modal navigation. */
(function () {
  'use strict';
  var UI = FB.ui, SH = UI._shared, esc = SH.esc, T = FB.tournaments, D = FBDATA.tournaments;
  function el(id) { return document.getElementById(id); }
  function bind(id, fn) { var n = el(id); if (n) n.addEventListener('click', fn); }
  function back() { SH.modalHistoryBack(function () { UI.closeModal(); }); }
  function text(s) { return '<p>' + esc(s) + '</p>'; }
  function fact(k, v) { return SH.kv(k, esc(String(v))); }
  function money(n) { return FB.T('{money:amount}', {amount:n}); }
  function button(id, label) { return '<button type="button" class="actionbtn" id="' + id + '">' + esc(label) + '</button>'; }
  function footer() { return '<div class="gm-footer"><button type="button" class="btn" id="games-back">' + esc(FB.T('Back')) + '</button></div>'; }
  function show(title, h, replace) {
    FB.game.setPaused(true);
    SH.openModal(title, '<div class="gm-body-text games-sheet">' + h + '</div>' + footer(), {
      historyView:true, replaceView:!!replace, modalKey:'games'
    });
    bind('games-back', back);
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
  function finishMutation(ok, eventId) {
    if (!ok) UI.toast(FB.T('Terms changed. Review the current gathering.'));
    if (FB.state.chars[FB.state.player.charId].health <= 0) {
      UI.closeModal(); FB.game.afterEvents(); return;
    }
    UI.showTournament(eventId, true); UI.refresh();
  }
  UI.showGames = function (filter, replace, ids) {
    filter = filter || 'upcoming';
    var s = FB.state, rows = T.list(s, filter), h = '<label for="games-filter">' + esc(FB.T('Calendar filter')) + '</label><select id="games-filter">';
    [{id:'upcoming',name:FB.T('Upcoming')},{id:'reachable',name:FB.T('Reachable')},{id:'local',name:FB.T('Local')},{id:'bookings',name:FB.T('My bookings')}].forEach(function (f) {
      h += '<option value="' + f.id + '"' + (filter === f.id ? ' selected' : '') + '>' + esc(f.name) + '</option>';
    });
    h += '</select>';
    var circuit = s.player.circuit;
    if (circuit && circuit.charId === s.player.charId) {
      h += fact(FB.T('Circuit victories'),circuit.victories) + fact(FB.T('Circuit earnings'),money(circuit.earnings)) + fact(FB.T('Circuit reputation'),circuit.reputation);
      if (circuit.contacts.length) h += fact(FB.T('Circuit contacts'),circuit.contacts.map(function (c) { return c.name; }).join(', '));
    }
    if (ids) rows = rows.filter(function (e) { return ids.indexOf(e.id) >= 0; });
    if (!rows.length) h += text(FB.T('No funded games match this view.'));
    rows.forEach(function (e) {
      var eligibility = T.eligibility(s, s.player.charId, e);
      h += button('games-' + e.id, FB.T('{venue} · {date} · {scale}', {venue:T.venueName(e),date:date(e.startTurn),scale:label('scales',e.scale)}));
      if (!eligibility.ok) h += text(eligibility.reason);
    });
    if (s.player.tier >= 3) h += button('games-host', FB.T('Host games…'));
    var annual = (s.tournaments && s.tournaments.annual || []).filter(function (a) { return a.hostId === s.player.charId; })[0];
    if (annual) h += fact(FB.T('Annual spending ceiling'), money(annual.ceiling)) + fact(FB.T('Next intended edition'), date(annual.nextTurn)) + button('games-stop', FB.T('Stop annual recurrence'));
    if (s.player.travel && s.player.travel.purpose === 'tournament' && s.player.travel.phase !== 'return') h += button('games-return', FB.T('Begin the funded return home'));
    show(FB.T('Events calendar'), h, replace);
    el('games-filter').addEventListener('change', function () { UI.showGames(this.value, true); });
    rows.forEach(function (e) { bind('games-' + e.id, function () { UI.showTournament(e.id); }); });
    bind('games-host', function () { UI.showHostGames(); });
    bind('games-stop', function () { T.stopAnnual(s, s.player.charId); UI.showGames(filter, true); });
    bind('games-return', function () { T.returnHome(s, false); UI.showGames(filter, true); UI.refresh(); });
  };
  function programme(e) {
    var host = FB.state.chars[e.hostId], religion = host && FBDATA.religions[host.religion];
    if (e.programme === 'mounted' && religion && religion.group === 'muslim') return FB.T('Furusiyya and open games');
    if (e.programme === 'martial' && FB.state.date.year < 1100) return FB.T('Martial exercises and open games');
    return label('programmes', e.programme);
  }
  UI.showTournament = function (id, replace) {
    var s = FB.state, e = T.get(s, id);
    if (!e) { UI.toast(FB.T('That edition has left the calendar.')); return; }
    var host = s.chars[e.hostId], p = T.participant(e, s.player.charId), eligible = T.eligibility(s, s.player.charId, e);
    var h = fact(FB.T('Host'), host ? FB.fullName(host) : FB.T('Former host')) + fact(FB.T('Opening'), date(e.startTurn)) + fact(FB.T('Closing'), date(e.closeTurn)) +
      fact(FB.T('Programme'), programme(e)) + fact(FB.T('Funding paid'), money(e.funding.total));
    if (e.guests && e.guests.length) h += fact(FB.T('Local guests'),e.guests.map(function (id) { return FB.fullName(s.chars[id]); }).join(', '));
    if (!eligible.ok) h += text(eligible.reason);
    Object.keys(e.contests).forEach(function (track) {
      var f = e.contests[track], purse = ['joust','melee'].indexOf(track) >= 0 ? 'headline' : track;
      var details = text(FB.T('Eight named entrants; three rounds. Skill, equipment, health, preparation and fatigue decide individual performance.'));
      if (track === 'melee') details += text(FB.T('The winning team shares the headline purse equally among four teammates.'));
      details += '<ul>';
      f.entrants.forEach(function (c) {
        details += '<li>' + esc(c.name) + ' · ' + esc(FB.T('Ability {ability}', { ability:c.charId ? Math.round(FB.skillSnapshot(s,s.chars[c.charId], D.tracks[track].skill)) : Math.round(c.ability) })) + '</li>';
      });
      details += '</ul>';
      h += card('games-field-' + track, label('tracks', track),
        FB.T('Promised purse {money:prize} · {rounds}/3 rounds completed', {prize:e.funding.prizes[purse],rounds:f.round}), details, false);
    });
    if (!p && (e.status === 'announced' || e.status === 'running')) h += button('games-activities', FB.T('Choose competition or livelihood…'));
    if (p) {
      h += fact(FB.T('Primary activity'), label('tracks',p.track)) + fact(FB.T('Fatigue'), p.fatigue) + fact(FB.T('Payments earned'), money(p.paid + (p.prizePaid || 0)));
      if (p.tradeSettled) h += fact(FB.T('Trading profit or loss'),money(p.tradeProfit));
      var q = T.roundPreview(s, id, s.player.charId, 'balanced');
      if (q && p.status === 'active') {
        h += fact(FB.T('Next round'), date(q.dueTurn));
        h += button('games-round', FB.T('Review round tactics…'));
      }
      if (p.status === 'active') {
        var attendance = T.attendance(s,s.player.charId,e);
        if (q && q.round < 3 && !p.eliminated) {
          var preparationBlock = p.prepared ? FB.T('Preparation is already chosen for this round.') : !attendance.ok ? attendance.reason : '';
          h += card('games-rest',FB.T('Rest before the next round'),preparationBlock || FB.T('Fatigue -3'),text(FB.T('Choose one rest or practice action before each round.')),!!preparationBlock);
          h += card('games-practice',FB.T('Practice'),preparationBlock || FB.T('Preparation +1, fatigue +1'),text(FB.T('Choose one rest or practice action before each round.')),!!preparationBlock);
        }
        h += card('games-social',FB.T('Meet the host’s company'),!attendance.ok ? attendance.reason : p.social.introductions ? FB.T('Introductions completed.') : FB.T('Host Standing +3'),text(FB.T('One introduction per edition, in person.')),!attendance.ok || p.social.introductions);
        h += card('games-gift',FB.T('Offer a gift ({money:5})'),!attendance.ok ? attendance.reason : p.social.gift ? FB.T('Gift already offered.') : FB.T('Host Standing +6, prestige +2'),text(FB.T('One gift per edition, suitable for every faith.')),!attendance.ok || p.social.gift || s.player.gold < 5);
        h += button('games-withdraw', FB.T('Withdraw from this edition…'));
      }
    }
    var journey = T.travelQuote(s, id);
    h += fact(FB.T('Estimated arrival'), date(journey.arrivalTurn));
    if (!journey.local) h += card('games-travel', FB.T('Travel to these games…'), journey.ok ? FB.T('Pay {money:cost}, including a {money:reserve} return allowance', {cost:journey.cost,reserve:journey.returnReserve}) : journey.reasons.join(' '),
      text(FB.T('The household stays at home. This circuit journey has no annual departure cooldown or 90-day stay. Later arrivals can attend remaining festivities.')), !journey.ok);
    if (e.hostId === s.player.charId && (e.status === 'announced' || e.status === 'running')) h += button('games-cancel', FB.T('Cancel this edition…'));
    show(T.venueName(e), h, replace);
    Object.keys(e.contests).forEach(function (track) {
      bind('games-field-' + track,function () {
        var details = el('games-field-' + track + '-details');
        if (details) {
          var toggle = details.parentNode.querySelector('.settcard-info');
          if (toggle) toggle.click();
        }
      });
    });
    bind('games-activities', function () { UI.showGamesActivities(id); });
    bind('games-travel', function () { if (journey.ok) UI.showGamesTravel(id); });
    bind('games-round', function () { UI.showGamesRound(id); });
    bind('games-rest', function () { finishMutation(T.prepare(s, id, s.player.charId, 'rest'), id); });
    bind('games-practice', function () { finishMutation(T.prepare(s, id, s.player.charId, 'practice'), id); });
    bind('games-social', function () { finishMutation(T.social(s, id, 'introductions'), id); });
    bind('games-gift', function () { finishMutation(T.social(s, id, 'gift'), id); });
    bind('games-withdraw', function () { confirmation(FB.T('Withdraw'), text(FB.T('Unused entry payments, forfeit reserve and unspent trade capital return to you. Earned rewards stay yours. Circuit reputation falls by 1.')), function () { finishMutation(T.withdraw(s,id,s.player.charId,false),id); }); });
    bind('games-cancel', function () { confirmation(FB.T('Cancel games'), text(FB.T('Unawarded prizes and unused services return to the host. Preparation and completed work remain spent. The regional slot is released immediately.')), function () { finishMutation(T.cancel(s,id,s.player.charId),id); }); });
  };
  function confirmation(title, h, fn) {
    show(title, h + button('games-confirm', FB.T('Confirm')));
    bind('games-confirm', fn);
  }
  UI.showGamesActivities = function (id) {
    var s = FB.state, e = T.get(s, id), quotes = [], h = '';
    if (!e) return;
    Object.keys(D.tracks).forEach(function (track) {
      if (D.tracks[track].contest && !e.contests[track]) return;
      var q = T.entry(s,id,s.player.charId,track); quotes.push(q);
      var terms = FB.T('Entry {money:fee} · forfeit reserve {money:forfeit} · trade stake {money:stake} · work contract {money:contract}', q.terms);
      var details = text(terms) + text(FB.T('One primary activity per edition. Earned payments are retained if war interrupts. Local serf duties continue.'));
      if (D.tracks[track].injury) details += text(FB.T('Injuries can include rare severe wounds capable of causing death. Review each round’s tactics and risks.'));
      if (q.sponsored) details += text(FB.T('Event-specific sponsorship provides backing and equipment access without changing rank.'));
      h += card('games-enter-' + track,label('tracks',track),q.ok ? terms : q.reasons.join(' '),details,!q.ok);
    });
    show(FB.T('Competition and livelihoods'),h);
    quotes.forEach(function (q) { bind('games-enter-' + q.track,function () {
      if (!q.ok) return;
      confirmation(label('tracks',q.track),fact(FB.T('Entry payment'),money(q.terms.fee)) + fact(FB.T('Reserved monetary forfeit'),money(q.terms.forfeit)) + fact(FB.T('Trade capital at risk'),money(q.terms.stake)) + fact(FB.T('Full service contract'),money(q.terms.contract)),function () { finishMutation(!!T.enter(s,q),id); });
    }); });
  };
  UI.showGamesTravel = function (id) {
    var q = T.travelQuote(FB.state,id);
    if (!q.ok) { UI.toast(q.reasons.join(' ')); return; }
    confirmation(FB.T('Tournament journey'),fact(FB.T('Estimated arrival'),date(q.arrivalTurn)) + fact(FB.T('Pay now'),money(q.cost)) + fact(FB.T('Return allowance'),money(q.returnReserve)) +
      text(FB.T('At closure, book another eligible gathering or begin the funded return. After three days without a reachable onward booking, the return begins automatically.')),
      function () { finishMutation(T.depart(FB.state,q),id); });
  };
  UI.showGamesRound = function (id) {
    var s = FB.state, choices = [], h = '';
    Object.keys(D.tactics).forEach(function (tactic) {
      var q = T.roundPreview(s,id,s.player.charId,tactic);
      if (!q || (tactic === 'assist' && q.track !== 'melee')) return;
      choices.push(q);
      h += card('games-tactic-' + tactic,label('tactics',tactic),q.ok ? (q.scored ? FB.T('Score base {power}, plus a roll from 0 to 12 · fatigue +{fatigue}',{power:Math.round(q.power*10)/10,fatigue:q.fatigue}) : FB.T('Round win chance {chance}% · fatigue +{fatigue}',{chance:Math.round(q.chance*100),fatigue:q.fatigue})) : q.reason,
        text(FB.T('Injury risk {risk}% including {severe}% severe wounds. Severe wounds can be fatal.',{risk:Math.round(q.injury*1000)/10,severe:Math.round(q.severe*1000)/10})),!q.ok);
    });
    show(FB.T('Round tactics'),h);
    choices.forEach(function (q) { bind('games-tactic-' + q.tactic,function () { if (q.ok) finishMutation(T.resolveRound(s,q),id); }); });
  };
  UI.showHostGames = function (pid, slot, replace) {
    var s = FB.state, sites = FB.directSettlements(s,'player'), dates = T.dates(s,s.player.charId);
    if (!sites.length) { show(FB.T('Host games'),text(FB.T('Direct ownership of an established settlement is required.')),replace); return; }
    var h = '<label for="games-venue">' + esc(FB.T('Venue')) + '</label><select id="games-venue">';
    sites.forEach(function (site,i) { h += '<option value="' + i + '"' + (pid === site.provinceId && slot === site.settlement ? ' selected' : '') + '>' + esc(T.venueName(site)) + '</option>'; });
    h += '</select>';
    ['scales','programmes'].forEach(function (group) {
      h += '<label for="games-' + group + '">' + esc(group === 'scales' ? FB.T('Scale') : FB.T('Programme')) + '</label><select id="games-' + group + '">';
      Object.keys(D[group]).forEach(function (key) { h += '<option value="' + key + '">' + esc(label(group,key)) + '</option>'; });
      h += '</select>';
    });
    h += '<label for="games-date">' + esc(FB.T('Opening date')) + '</label><select id="games-date">';
    dates.forEach(function (turn) { h += '<option value="' + turn + '">' + esc(date(turn)) + '</option>'; });
    h += '</select>';
    if (!dates.length) h += text(FB.T('No spring or summer date currently meets the notice and host-spacing rules.'));
    h += '<label><input type="checkbox" id="games-annual"> ' + esc(FB.T('Repeat annually, subject to renewal')) + '</label>';
    h += '<label for="games-ceiling">' + esc(FB.T('Annual spending ceiling')) + '</label><input id="games-ceiling" type="number" min="0" step="25" value="500">';
    h += button('games-review',FB.T('Review funding and availability'));
    show(FB.T('Host games'),h,replace);
    var chosen = sites[Number(el('games-venue').value)];
    el('games-programmes').value = T.defaultProgramme(s,s.player.charId,chosen);
    bind('games-review',function () {
      var site = sites[Number(el('games-venue').value)];
      var q = T.quote(s,{hostId:s.player.charId,provinceId:site.provinceId,settlement:site.settlement,
        scale:el('games-scales').value,programme:el('games-programmes').value,startTurn:Number(el('games-date').value),annual:el('games-annual').checked,ceiling:Number(el('games-ceiling').value)});
      UI.reviewHostGames(q);
    });
  };
  UI.reviewHostGames = function (q) {
    var f = q.funding, h = fact(FB.T('Venue'),T.venueName(q)) + fact(FB.T('Opening'),date(q.startTurn)) + fact(FB.T('Current recurring net / season'),money(q.income.projection)) +
      fact(FB.T('Recorded seasonal average'),money(q.income.average)) + fact(FB.T('Reference income'),money(q.income.reference));
    if (f) h += fact(FB.T('Funding due now'),money(f.total)) + fact(FB.T('Headline prize'),money(f.prizes.headline)) + fact(FB.T('Archery prize'),money(f.prizes.archery)) + fact(FB.T('Wrestling prize'),money(f.prizes.wrestling)) +
      fact(FB.T('Performer awards'),money(f.prizes.perform)) + fact(FB.T('Workforce and entertainment'),money(f.services)) + fact(FB.T('Preparation and hospitality'),money(f.preparation)) + fact(FB.T('Treasury remaining'),money(q.treasury-f.total));
    if (f && q.available !== q.treasury) h += fact(FB.T('Uncommitted treasury remaining'),money(q.available-f.total));
    h += text(FB.T('The reference is the greatest of zero, current recurring net and up to four seasonal samples. Daily focus, campaign spending and one-time transactions are excluded.'));
    h += text(FB.T('Funding is the greater of {money:minimum} and {multiple} times reference income, rounded upward to 25.',{minimum:D.scales[q.scale].minimum,multiple:D.scales[q.scale].multiplier}));
    if (q.annual) h += fact(FB.T('Annual spending ceiling'),money(q.ceiling)) + text(FB.T('Renewal is attempted 60 days before each annual start. Failed renewal skips the year without charging.'));
    h += fact(FB.T('All events: occupied / limit'),q.capacity.used[0] + ' / ' + q.capacity.limits[0]) + fact(FB.T('Regional and grand: occupied / limit'),q.capacity.used[1] + ' / ' + q.capacity.limits[1]) + fact(FB.T('Grand: occupied / limit'),q.capacity.used[2] + ' / ' + q.capacity.limits[2]);
    q.capacity.occupants.forEach(function (e) { h += fact(T.venueName(e),FB.T('Closes {date}',{date:date(e.closeTurn)})); });
    q.reasons.forEach(function (reason) { h += text(reason); });
    if (q.ok) h += button('games-fund',FB.T('Fund and announce ({money:cost})',{cost:f.total}));
    show(FB.T('Review games funding'),h);
    bind('games-fund',function () {
      var e = T.book(FB.state,q);
      if (e) { UI.showTournament(e.id,true); UI.refresh(); }
      else UI.toast(FB.T('Terms changed. Review the funding again.'));
    });
  };
})();
