/* Campaign lists and claim packages share the retained modal navigation. */
(function () {
  'use strict';
  const UI = FB.ui, SH = UI._shared, esc = SH.esc;
  function name(s, rid) { return s.realms[rid] ? s.realms[rid].name : rid; }
  function button(id, label) { return '<button type="button" class="actionbtn" id="' + id + '">' + esc(label) + '</button>'; }
  function back() { SH.modalHistoryBack(function () { UI.closeModal(); }); }
  function bind(id, fn) { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); }
  function objectiveName(o) {
    return FB.world.byId[o.target] ? FB.world.byId[o.target].name : o.target;
  }
  function fact(label, value) {
    if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return '';
    return SH.kv(label, esc(value));
  }
  function section(id, title, content, detail) {
    if (!content || !content.trim()) return '';
    return '<section class="settcard war-sheet-section" id="' + id + '-section" tabindex="0" aria-describedby="' + id + '"><div class="war-sheet-heading"><h3>' + esc(title) + '</h3>' +
      (detail ? '<span class="settcard-actions"><button type="button" class="btn small settcard-info" aria-expanded="false" aria-controls="' + id +
        '" aria-label="' + esc(FB.T('Details')) + '">?</button></span>' : '') + '</div>' + content +
      (detail ? '<div class="settcard-details hidden" id="' + id + '">' + detail + '</div>' : '') + '</section>';
  }
  UI.campaignObjectivesHtml = function (s, w) {
    if (!w || w.legacy || !w.objectives || w.objectives.length < 2) return '';
    const held = w.objectives.filter(function (o) {
      return w.occupations[o.target] && w.occupations[o.target].occupied;
    }).length;
    let h = '<section class="campaign-objectives"><b>' + esc(FB.T('Campaign objectives: {held}/{total} occupied', {
      held:held, total:w.objectives.length
    })) + '</b><ul>';
    w.objectives.forEach(function (o) {
      const occupied = w.occupations[o.target] && w.occupations[o.target].occupied;
      h += '<li>' + esc(FB.T('{province}: {status}', {
        province:objectiveName(o), status:occupied ? FB.T('Occupied') : FB.T('Still to occupy')
      })) + '</li>';
    });
    h += '</ul><p>' + esc(w.attacker === 'player'
      ? FB.T('Occupy every objective at the same time to win this war.')
      : FB.T('Prevent {realm} from occupying every objective at the same time.', { realm:name(s, w.attacker) })) + '</p></section>';
    return h;
  };
  UI.campaignsHtml = function (s) {
    if (s.player.tier < 3) return '';
    let h = '<section class="land-section" data-campaign-list><h3>' + esc(FB.T('Campaigns')) + '</h3>';
    FB.realmWars(s, 'player').forEach(function (w) {
      const occupied = w.objectives.filter(function (o) { return w.occupations[o.target] && w.occupations[o.target].occupied; }).length;
      h += '<button type="button" class="actionbtn" data-campaign-open="' + esc(w.id) + '">' +
        esc(FB.T('{enemy}: {held}/{total} objectives occupied', { enemy:name(s, w.enemy), held:occupied, total:w.objectives.length })) +
        (w.unlawful ? ' · ' + esc(FB.T('Unlawful')) : '') + '</button>';
    });
    h += '<button type="button" class="actionbtn" data-muster-plan>' + esc(FB.T('Muster plan')) + '</button>';
    h += '<button type="button" class="actionbtn" data-war-laws>' + esc(FB.T('War laws & permissions')) + '</button></section>';
    return h;
  };
  UI.bindCampaigns = function (root) {
    root.querySelectorAll('[data-muster-plan]').forEach(function (el) { el.addEventListener('click', function () { UI.showMusterPlan(); }); });
    root.querySelectorAll('[data-campaign-open]').forEach(function (el) {
      el.addEventListener('click', function () { UI.showCampaign(el.dataset.campaignOpen); });
    });
    root.querySelectorAll('[data-war-laws]').forEach(function (el) { el.addEventListener('click', function () { UI.showWarLaws(); }); });
  };
  UI.refreshCampaigns = function () {
    const s = FB.state;
    document.querySelectorAll('[data-campaign-open]').forEach(function (el) {
      const w = FB.ordinaryWarById(s, el.dataset.campaignOpen);
      if (!w) { el.remove(); return; }
      const occupied = w.objectives.filter(function (o) { return w.occupations[o.target] && w.occupations[o.target].occupied; }).length;
      el.textContent = FB.T('{enemy}: {held}/{total} objectives occupied', { enemy:name(s, w.enemy), held:occupied, total:w.objectives.length }) +
        (w.unlawful ? ' · ' + FB.T('Unlawful') : '');
    });
  };
  UI.showCampaign = function (id) {
    const s = FB.state, w = FB.ordinaryWarById(s, id);
    if (!w) { UI.toast(FB.T('This campaign has ended.')); return; }
    FB.game.setPaused(true);
    let h = '<div class="war-sheet" data-campaign-detail="' + esc(id) + '">' +
      fact(FB.T('Opponent'), name(s, w.enemy)) + fact(FB.T('Declaration'), w.countyChallenge ?
        w.countyChallenge.justification === 'sanctioned' ? FB.T('Superior-authorized challenge') :
          w.countyChallenge.justification === 'claim' ? FB.T('Claim-backed rebellion') : FB.T('Unclaimed usurpation') :
        w.unlawful ? FB.T('Unlawful') : FB.T('Lawful'));
    let objectives = '';
    w.objectives.forEach(function (o) {
      const occupied = w.occupations[o.target] && w.occupations[o.target].occupied;
      objectives += '<div class="kv"><span>' + esc(objectiveName(o)) + '</span><b class="' +
        (occupied ? 'op-good' : 'op-neutral') + '">' + esc(occupied ? FB.T('Occupied') : FB.T('Not occupied')) + '</b></div>';
    });
    const special = w.casus && w.casus.type;
    const victory = w.countyChallenge ?
      w.countyChallenge.superior && w.countyChallenge.justification !== 'sanctioned'
        ? FB.T('Take this county under its superior, then petition for recognition. Existing baronies and private property keep their owners.')
        : FB.T('Gain recognized control of this county. Existing baronies and private property keep their owners.')
      : w.enforcementOf ? FB.T('End the unlawful war; offender loses 50 prestige.')
      : special === 'independence' ? FB.T('Secure independence.')
      : special === 'caliphate' ? FB.T('Gain the Caliphate office.')
      : special === 'restoration' ? FB.T('Restore the crown and its vassals.')
      : FB.T('Occupy all objectives to gain them at peace.');
    h += section('campaign-goal-details', FB.T('Objectives'), (UI.campaignObjectivesHtml(s, w) || objectives) + '<p>' + esc(victory) + '</p>',
      '<p>' + esc(FB.T('Occupation is temporary until peace. All territorial objectives must remain occupied together. Office and independence wars follow their own terms.')) + '</p>');
    let hostHtml = '';
    const hosts = (s.armies || []).filter(function (a) { return a.realm === 'player'; });
    hosts.forEach(function (a, i) {
      hostHtml += '<label class="war-host-assignment">' + esc(FB.T('Host {number}: {men} men', { number:i + 1, men:a.men })) +
        '<select data-host-campaign="' + esc(a.id) + '" aria-label="' + esc(FB.T('Assigned campaign')) + '">';
      FB.realmWars(s, 'player').forEach(function (entry) {
        hostHtml += '<option value="' + esc(entry.id) + '"' + (a.warId === entry.id ? ' selected' : '') + '>' + esc(name(s, entry.enemy)) + '</option>';
      });
      if (FB.greatHolyWarCamp(s, 'player')) hostHtml += '<option value="holy"' + (a.warId === 'holy' ? ' selected' : '') + '>' + esc(FB.T('Holy war')) + '</option>';
      hostHtml += '</select></label>';
    });
    if (!hosts.length) hostHtml += '<p>' + esc(FB.T('No host is currently raised.')) + '</p>';
    hostHtml += button('campaign-muster-plan', FB.T('Muster plan'));
    hostHtml += fact(FB.T('Total upkeep'), FB.T('{money:cost} per season', { cost:FB.playerHostUpkeepParts(s).total }));
    hostHtml += '<p class="hint">' + esc(FB.T('Changing assignment cancels the host’s route.')) + '</p>';
    h += section('campaign-host-details', FB.T('Hosts'), hostHtml,
      '<p>' + esc(FB.T('Hosts share troops, supplies, and upkeep across all campaigns. Reassignment keeps the host’s men and supplies.')) + '</p>');
    const cost = w.defending ? 15 + 5 * (w.losses || 0) : 0;
    h += section('campaign-peace-details', FB.T('Peace'),
      fact(FB.T('Cost'), w.defending ? FB.T('{money:cost} and 10 prestige', { cost:cost }) : FB.T('8 prestige')) +
      '<p>' + esc(FB.T('No land changes hands.')) + '</p>' +
      button('campaign-peace', w.defending ? FB.T('Buy peace') : FB.T('Withdraw')),
      '<p>' + esc(FB.T('Ends this campaign only. Other campaigns and their assigned hosts continue.')) + '</p>');
    h += button('campaign-back', FB.T('Back')) + '</div>';
    const fromPanel = document.getElementById('genmodal').classList.contains('hidden');
    SH.openModal(FB.T('Campaign'), h, { historyView:true, modalClass:'war-sheet-modal',
      historyBackRender:fromPanel ? function () { UI.closeModal(); } : null });
    document.querySelectorAll('[data-host-campaign]').forEach(function (el) {
      el.addEventListener('change', function () {
        const host = hosts.filter(function (a) { return String(a.id) === el.dataset.hostCampaign; })[0];
        if (host) FB.assignHostCampaign(s, host.id, el.value);
      });
    });
    const peace = document.getElementById('campaign-peace');
    if (peace) peace.disabled = s.player.gold < cost;
    bind('campaign-peace', function () {
      const live = FB.ordinaryWarById(s, id);
      if (!live || s.player.gold < (live.defending ? 15 + 5 * live.losses : 0)) return;
      FB.withOrdinaryWar(s, id, function () { FB.fns.war_terms(s); });
      UI.closeModal(); UI.refresh();
    });
    bind('campaign-back', back);
    bind('campaign-muster-plan', function () { UI.showMusterPlan(); });
  };
  UI.showMusterPlan = function () {
    const s = FB.state, initial = FB.playerMusterSelectionQuote(s);
    if (!initial) return;
    FB.game.setPaused(true);
    const draft = {};
    initial.rows.forEach(function (row) { draft[row.pid] = row.selected; });
    let formation = initial.formation, rally = initial.rally, shownQuote = '';
    let h = '<div class="war-sheet" data-muster-sheet>';
    h += section('muster-call-details', FB.T('Call to arms'),
      '<label class="war-host-assignment">' + esc(FB.T('Assembly')) +
      '<select id="muster-formation"><option value="gather"' + (formation === 'gather' ? ' selected' : '') + '>' + esc(FB.T('Gather at the rally point')) +
      '</option><option value="county"' + (formation === 'county' ? ' selected' : '') + '>' + esc(FB.T('Raise in each county')) + '</option></select></label>' +
      '<label class="war-host-assignment">' + esc(FB.T('Rally point')) + '<select id="muster-rally">' +
      initial.rows.map(function (row) {
        return '<option value="' + esc(row.pid) + '"' + (row.pid === rally ? ' selected' : '') + '>' + esc(FB.world.byId[row.pid].name) + '</option>';
      }).join('') + '</select></label>' +
      '<div class="muster-presets">' + [0,25,50,100].map(function (percent) {
        return '<button type="button" class="btn" data-muster-percent="' + percent + '">' + esc(FB.T('{percent}%', { percent:percent })) + '</button>';
      }).join('') + '</div>');
    let counties = '';
    initial.rows.forEach(function (row, i) {
      const county = FB.world.byId[row.pid];
      counties += '<div class="muster-county-row"><label for="muster-county-' + i + '">' + esc(county ? county.name : row.pid) +
        '<span class="hint">' + esc(FB.T('Up to {men} troops', { men:row.maximum })) + '</span><span class="hint" data-muster-cost="' + esc(row.pid) + '"></span></label>' +
        '<div class="muster-county-controls"><input type="range" class="provision-slider" data-muster-slider="' + esc(row.pid) + '" aria-label="' + esc(FB.T('Troops from {county}', { county:county ? county.name : row.pid })) + '" min="0" max="' + row.maximum + '" step="1" value="' + row.selected + '">' +
        '<input type="number" inputmode="numeric" id="muster-county-' + i + '" data-muster-county="' + esc(row.pid) + '" min="0" max="' + row.maximum + '" step="1" value="' + row.selected + '"></div></div>';
    });
    h += section('muster-county-details', FB.T('County troops'),
      '<div id="muster-counties">' +
      (counties || '<p>' + esc(FB.T('No eligible recruitment counties.')) + '</p>') + '</div>');
    h += section('muster-cost-details', FB.T('Estimated cost'), '<div id="muster-costs" aria-live="polite"></div>',
      '<div id="muster-cost-breakdown"></div><p>' + esc(FB.T('Costs use current prices where each host starts. Food costs depend on available stocks and your supply settings. Moving, winter and price changes can raise the bill.')) + '</p>' +
      '<p>' + esc(FB.T('There is no fee to raise troops. You pay to keep them in the field. Existing contracts and replacement training may cost extra.')) + '</p>');
    h += '<p class="hint">' + esc(FB.T('Changes save automatically and apply to future musters.')) + '</p><p id="muster-blocker" class="warnote"></p>';
    h += '<div class="modal-body-actions"><div class="settcard modal-action-card" tabindex="0" aria-describedby="muster-action-details"><div class="settcard-head">' +
      '<button type="button" class="actionbtn" id="muster-raise" data-action-tooltip data-tooltip-anchor="control" aria-describedby="muster-action-details">' + esc(FB.T('Muster')) + '</button>' +
      '<span class="settcard-actions"><button type="button" class="btn small settcard-info" aria-expanded="false" aria-controls="muster-action-details" aria-label="' + esc(FB.T('Details')) + '">?</button></span></div>' +
      '<div class="settcard-details hidden" id="muster-action-details"></div></div></div>';
    const demuster = FB.demusterPreview(s);
    if (demuster && !(FB.playerGreatHolyWarHostActive && FB.playerGreatHolyWarHostActive(s))) {
      h += section('muster-dismiss-details', FB.T('Current host'),
        '<p>' + esc(FB.T('De-muster to stop this host’s field upkeep. {men} troops return to the rolls; the next muster must wait {days} days.', {
          men:demuster.men, days:FBDATA.balance.armyRearmDays || 60 })) + '</p>' + button('muster-dismiss', FB.T('De-muster current host')),
        '<p>' + esc(FB.T('Sends your main host home. Other hosts stay in the field. All troops can return when dismissed on your own land; elsewhere, some or all are lost.')) + '</p>');
    }
    h += button('muster-back', FB.T('Back')) + '</div>';
    const fromPanel = document.getElementById('genmodal').classList.contains('hidden');
    SH.openModal(FB.T('Muster plan'), h, { historyView:true, modalClass:'war-sheet-modal',
      historyBackRender:fromPanel ? function () { UI.closeModal(); } : null });
    const countyHeading = document.querySelector('#muster-county-details-section h3');
    countyHeading.innerHTML = '<button type="button" class="large-list-section-toggle" id="muster-counties-toggle" aria-expanded="true" aria-controls="muster-counties"><span class="large-list-section-title">' + esc(FB.T('County troops')) + '</span><span class="large-list-section-caret" aria-hidden="true">&#9662;</span></button>';
    // These controls need no explanatory tooltip or extra section tab stop.
    ['muster-call-details-section', 'muster-county-details-section'].forEach(function (id) {
      const controlSection = document.getElementById(id);
      controlSection.removeAttribute('aria-describedby');
      controlSection.removeAttribute('tabindex');
    });
    bind('muster-counties-toggle', function () {
      const toggle = document.getElementById('muster-counties-toggle');
      const expanded = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.querySelector('.large-list-section-caret').textContent = expanded ? '\u25be' : '\u25b8';
      document.getElementById('muster-counties').classList.toggle('hidden', !expanded);
    });
    function update(saveChanges) {
      if (saveChanges === true) FB.savePlayerMusterSelection(s, draft, formation, rally);
      const quote = FB.playerMusterSelectionQuote(s, draft, formation, rally);
      if (!quote) return;
      shownQuote = JSON.stringify([quote.units, quote.hosts, quote.total, quote.rally]);
      let costs = fact(FB.T('Additional troops / hosts'), FB.T('{men} troops in {hosts} hosts', { men:quote.men, hosts:quote.hosts })) +
        fact(FB.T('Field upkeep'), FB.T('{money:cost} per season', { cost:quote.standing })) +
        fact(FB.T('Food estimate'), FB.T('{money:cost} per season', { cost:quote.food })) +
        fact(FB.T('Expected spending'), FB.T('{money:cost} per season', { cost:quote.total })) +
        fact(FB.T('Treasury'), FB.T('{money:gold}', { gold:s.player.gold })) +
        fact(FB.T('Popular support on muster'), FB.T('No immediate loss')) +
        fact(FB.T('Muster time'), FB.T('1 day'));
      if (quote.fixed) costs += fact(FB.T('Hired troops and allies included'), FB.T('{men} troops', { men:quote.fixed }));
      if (quote.forced) costs += '<p class="warnote">' + esc(FB.T('Forced supplies: no food payment, but seizures reduce county Popular support and make its direct ruler hostile toward you.')) + '</p>';
      else if (!quote.purchases) costs += '<p class="warnote">' + esc(FB.T('Food purchases are off. Troops will consume carried reserves.')) + '</p>';
      else if (s.player.gold < quote.total) costs += '<p class="warnote">' + esc(FB.T('Your treasury covers less than one season at these prices. Future income is not included.')) + '</p>';
      if (formation === 'gather' && quote.rally) costs += fact(FB.T('Rally point'), FB.world.byId[quote.rally].name);
      document.getElementById('muster-costs').innerHTML =
        fact(FB.T('Additional troops'), quote.men) +
        fact(FB.T('Expected spending'), FB.T('{money:cost} per season', { cost:quote.total }));
      document.getElementById('muster-cost-breakdown').innerHTML = costs;
      document.getElementById('muster-action-details').innerHTML = '<div class="modal-action-terms">' +
        fact(FB.T('Expected spending'), FB.T('{money:cost} per season', { cost:quote.total })) +
        fact(FB.T('Muster time'), FB.T('1 day')) +
        '<p>' + esc(FB.T('There is no fee to raise troops. You pay to keep them in the field.')) + '</p></div>';
      document.getElementById('muster-raise').disabled = !quote.canRaise;
      document.querySelectorAll('[data-muster-cost]').forEach(function (el) {
        const row = quote.rows.filter(function (entry) { return entry.pid === el.dataset.musterCost; })[0];
        const county = quote.estimates[el.dataset.musterCost];
        const cost = formation === 'county' ? (county ? county.standing + (quote.forced || !quote.purchases ? 0 : county.food) : 0) :
          quote.total * (row ? row.additional : 0) / Math.max(1, quote.men);
        el.textContent = FB.T('About {money:cost} per season', { cost:cost });
      });
      document.getElementById('muster-blocker').textContent = quote.days ? FB.T('Ready to muster in {days} days.', { days:quote.days }) :
        !quote.men ? FB.T('No additional troops are available under this plan. Troops already fielded and their replacement ranks count toward the target.') :
        !quote.valid ? FB.T('Each host needs at least {men} troops. Choose more troops or gather at the rally point.', { men:quote.minimum }) :
        !quote.canRaise ? FB.T('Available when war begins.') : '';
    }
    function syncCountyControls() {
      document.querySelectorAll('[data-muster-county], [data-muster-slider]').forEach(function (input) {
        const pid = input.dataset.musterCounty || input.dataset.musterSlider;
        input.value = draft[pid];
      });
    }
    document.querySelectorAll('[data-muster-county], [data-muster-slider]').forEach(function (el) {
      function changed() {
        const pid = el.dataset.musterCounty || el.dataset.musterSlider;
        draft[pid] = FB.clamp(Math.floor(Number(el.value) || 0), 0, Number(el.max));
        // Leave a numeric field editable while typing; its paired slider stays current.
        document.querySelectorAll('[data-muster-county], [data-muster-slider]').forEach(function (other) {
          if (other !== el && (other.dataset.musterCounty || other.dataset.musterSlider) === pid) other.value = draft[pid];
        });
        update(true);
      }
      el.addEventListener('input', changed);
      el.addEventListener('change', function () { changed(); el.value = draft[el.dataset.musterCounty || el.dataset.musterSlider]; });
    });
    document.querySelectorAll('[data-muster-percent]').forEach(function (el) {
      el.addEventListener('click', function () {
        const percent = Number(el.dataset.musterPercent);
        initial.rows.forEach(function (row) { draft[row.pid] = Math.floor(row.maximum * percent / 100); });
        syncCountyControls();
        update(true);
      });
    });
    document.getElementById('muster-rally').addEventListener('change', function (event) { rally = event.target.value; update(true); });
    document.getElementById('muster-formation').addEventListener('change', function (event) { formation = event.target.value; update(true); });
    bind('muster-raise', function () {
      const quote = FB.playerMusterSelectionQuote(s, draft, formation, rally);
      if (!quote || !quote.canRaise || JSON.stringify([quote.units, quote.hosts, quote.total, quote.rally]) !== shownQuote) { update(); return; }
      FB.savePlayerMusterSelection(s, draft, formation, rally);
      const host = FB.raisePlayerHost(s);
      if (!host) { update(); return; }
      back(); FB.game.passDay({ skipFocus:true }); UI.refresh();
    });
    bind('muster-dismiss', function () {
      if (!FB.demusterPreview(s) || (FB.playerGreatHolyWarHostActive && FB.playerGreatHolyWarHostActive(s))) return;
      FB.savePlayerMusterSelection(s, draft, formation, rally);
      if (FB.demusterPlayerHost(s)) { back(); FB.game.passDay({ skipFocus:true }); UI.refresh(); }
    });
    bind('muster-back', back);
    update();
  };
  UI.showWarLaws = function (view) {
    const s = FB.state, sovereign = FB.playerRealmId(s) || 'player';
    const ruler = s.realms.player;
    const canProclaim = ruler && ruler.alive && !ruler.liege && !s.player.liege && s.player.tier >= 5;
    let h = '<div class="war-sheet war-laws-sheet">' + fact(FB.T('Governing realm'), name(s, sovereign));
    ['internal_peace', 'external_campaigns'].forEach(function (id) {
      const def = FBDATA.policies[id], current = FB.realmPolicyLevelId(s, id);
      const currentIndex = def.levels.map(function (l) { return l.id; }).indexOf(current);
      let rows = '';
      def.levels.forEach(function (level, i) {
        if (level.id !== current && !canProclaim) return;
        const label = FB.dataText(s, s.player.charId, 'policy', id, def, 'levels.' + i + '.name', {});
        const desc = FB.dataText(s, s.player.charId, 'policy', id, def, 'levels.' + i + '.desc', {});
        if (level.id === current) {
          rows = '<div class="war-law-option war-law-current">' + fact(FB.T('Current law'), label) +
            '<p class="war-law-description">' + esc(desc) + '</p></div>' + rows;
          return;
        }
        const status = FB.realmPolicyStatus(s, id, level.id), detailId = 'war-law-action-' + id + '-' + level.id;
        rows += '<div class="war-law-option settcard modal-action-card" tabindex="0" aria-describedby="' + detailId + '"><div class="settcard-head">' +
          '<button type="button" class="actionbtn" data-proclaim-war-law="' + id + ':' + level.id + '" data-action-tooltip data-tooltip-anchor="control" aria-describedby="' + detailId + '"' + (status.ready ? '' : ' disabled') + '>' +
          esc(FB.T('Proclaim {law}', { law:label })) + '</button>' +
          '<span class="settcard-actions"><button type="button" class="btn small settcard-info" aria-expanded="false" aria-controls="' + detailId + '" aria-label="' + esc(FB.T('Details')) + '">?</button></span></div>' +
          '<p class="war-law-description">' + esc(desc) + '</p>' +
          '<div class="settcard-details hidden" id="' + detailId + '"><div class="modal-action-terms">' +
          fact(FB.T('Cost'), FB.T('{money:cost}', { cost:status.cost })) +
          fact(FB.T('Vassal Standing'), i > currentIndex ? FB.T('-10') : FB.T('+10')) + '</div></div>' +
          (!status.ready ? '<p class="warnote">' + esc(status.reason) + '</p>' : '') + '</div>';
      });
      h += '<section class="war-sheet-section" id="war-law-details-' + id + '-section" tabindex="-1"><div class="war-sheet-heading"><h3>' +
        esc(FB.dataText(s, s.player.charId, 'policy', id, def, 'name', {})) + '</h3></div>' + rows + '</section>';
    });
    if (canProclaim) h += '<p class="hint">' + esc(FB.T('One change per law each year. Existing wars keep their terms.')) + '</p>';
    Object.keys(s.warPermissionRequests || {}).forEach(function (key, i) {
      const request = s.warPermissionRequests[key];
      if (request.liege !== 'player') return;
      h += '<p>' + esc(FB.T('{realm} requests permission to fight {enemy} for {objectives}.', {
        realm:name(s, request.attacker), enemy:name(s, request.causes[0].enemy), objectives:request.causes.map(objectiveName).join(', ') })) + '</p>' +
        '<button class="actionbtn" data-permission-grant="' + i + '">' + esc(FB.T('Grant permission')) + '</button>' +
        '<button class="actionbtn" data-permission-deny="' + i + '">' + esc(FB.T('Deny permission')) + '</button>';
    });
    Object.keys(s.wars || {}).forEach(function (id) {
      const w = FB.ordinaryWarById(s, id);
      if (!w || !w.peaceDemand || w.peaceDemand.liege !== 'player' || w.peaceDemand.status !== 'refused') return;
      h += '<p>' + esc(FB.T('{realm} refuses the demand for peace. Enforcement victory ends that campaign and costs them 50 prestige.', { realm:name(s, w.attacker) })) + '</p>' +
        '<button class="actionbtn" data-enforce-peace="' + esc(id) + '">' + esc(FB.T('Enforce the peace by war')) + '</button>';
    });
    h += button('war-laws-back', FB.T('Back')) + '</div>';
    SH.openModal(FB.T('War laws & permissions'), h, { historyView:true, replaceView:!!view, noFocus:!!view, modalClass:'war-sheet-modal' });
    function refreshed(fn, control) {
      const body = document.getElementById('gm-body');
      const scroll = body && body.scrollTop;
      const expanded = body ? Array.from(body.querySelectorAll('.settcard-info[aria-expanded="true"]')).map(function (el) { return el.getAttribute('aria-controls'); }) : [];
      fn(); UI.showWarLaws({ replaced:true });
      const next = document.getElementById('gm-body');
      if (next) {
        expanded.forEach(function (id) { const toggle = next.querySelector('[aria-controls="' + id + '"]'); if (toggle) toggle.click(); });
        const restored = control && next.querySelector('[data-proclaim-war-law="' + control + '"]');
        const target = restored && !restored.disabled ? restored :
          control ? document.getElementById('war-law-details-' + control.split(':')[0] + '-section') : next.querySelector('#war-laws-back');
        // openModal schedules container focus; restore this section after it.
        setTimeout(function () {
          if (target && next.contains(target) &&
              !document.getElementById('genmodal').classList.contains('hidden')) {
            target.focus({ preventScroll:true });
            next.scrollTop = scroll || 0;
          }
        }, 0);
        next.scrollTop = scroll || 0;
      }
      UI.refresh();
    }
    document.querySelectorAll('[data-proclaim-war-law]').forEach(function (el) {
      el.addEventListener('click', function () { const ids = el.dataset.proclaimWarLaw.split(':'); refreshed(function () { FB.realmPolicyProclaim(s, ids[0], ids[1]); }, el.dataset.proclaimWarLaw); });
    });
    ['grant', 'deny'].forEach(function (answer) {
      document.querySelectorAll('[data-permission-' + answer + ']').forEach(function (el) {
        el.addEventListener('click', function () {
          const index = Number(el.getAttribute('data-permission-' + answer));
          const key = Object.keys(s.warPermissionRequests || {})[index];
          refreshed(function () { FB.answerWarPermission(s, key, answer === 'grant'); });
        });
      });
    });
    document.querySelectorAll('[data-enforce-peace]').forEach(function (el) {
      el.addEventListener('click', function () { refreshed(function () { FB.startPeaceEnforcement(s, el.dataset.enforcePeace); }); });
    });
    bind('war-laws-back', back);
  };
})();
