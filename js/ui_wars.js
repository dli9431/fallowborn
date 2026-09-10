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
  UI.campaignsHtml = function (s) {
    if (s.player.tier < 3) return '';
    let h = '<section class="land-section" data-campaign-list><h3>' + esc(FB.T('Campaigns')) + '</h3>';
    FB.realmWars(s, 'player').forEach(function (w) {
      const occupied = w.objectives.filter(function (o) { return w.occupations[o.target] && w.occupations[o.target].occupied; }).length;
      h += '<button type="button" class="actionbtn" data-campaign-open="' + esc(w.id) + '">' +
        esc(FB.T('{enemy}: {held}/{total} objectives occupied', { enemy:name(s, w.enemy), held:occupied, total:w.objectives.length })) +
        (w.unlawful ? ' · ' + esc(FB.T('Unlawful')) : '') + '</button>';
    });
    h += '<button type="button" class="actionbtn" data-war-laws>' + esc(FB.T('War laws & permissions')) + '</button></section>';
    return h;
  };
  UI.bindCampaigns = function (root) {
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
      fact(FB.T('Opponent'), name(s, w.enemy)) + fact(FB.T('Declaration'), w.unlawful ? FB.T('Unlawful') : FB.T('Lawful'));
    let objectives = '';
    w.objectives.forEach(function (o) {
      const occupied = w.occupations[o.target] && w.occupations[o.target].occupied;
      objectives += '<div class="kv"><span>' + esc(objectiveName(o)) + '</span><b class="' +
        (occupied ? 'op-good' : 'op-neutral') + '">' + esc(occupied ? FB.T('Occupied') : FB.T('Not occupied')) + '</b></div>';
    });
    const special = w.casus && w.casus.type;
    const victory = w.enforcementOf ? FB.T('End the unlawful war; offender loses 50 prestige.')
      : special === 'independence' ? FB.T('Secure independence.')
      : special === 'caliphate' ? FB.T('Gain the Caliphate office.')
      : special === 'restoration' ? FB.T('Restore the crown and its vassals.')
      : FB.T('Occupy all objectives to gain them at peace.');
    h += section('campaign-goal-details', FB.T('Objectives'), objectives + '<p>' + esc(victory) + '</p>',
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
    if (w.peaceDemand && w.attacker === 'player' && w.peaceDemand.status === 'pending') {
      const deadline = FB.dateAtTurn(s, w.peaceDemand.deadline);
      h += '<p>' + esc(FB.T('The liege demands peace by {season} {day}, {year}. Refusal permits an enforcement war.', {
        season:FB.seasonName(deadline.season), day:deadline.day, year:deadline.year })) + '</p>' +
        button('campaign-comply', FB.T('Comply: end this war')) + button('campaign-defy', FB.T('Refuse the demand'));
    }
    h += button('campaign-back', FB.T('Back')) + '</div>';
    SH.openModal(FB.T('Campaign'), h, { historyView:true, modalClass:'war-sheet-modal' });
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
    bind('campaign-comply', function () { FB.answerPeaceDemand(s, id, true); UI.closeModal(); UI.refresh(); });
    bind('campaign-defy', function () { FB.answerPeaceDemand(s, id, false); UI.closeModal(); UI.refresh(); });
    bind('campaign-back', back);
  };
  UI.showWarLaws = function (view) {
    const s = FB.state, sovereign = FB.playerRealmId(s) || 'player';
    const ruler = s.realms.player;
    const canProclaim = ruler && ruler.alive && !ruler.liege && !s.player.liege && s.player.tier >= 5;
    let h = '<div class="war-sheet">' + fact(FB.T('Governing realm'), name(s, sovereign));
    if (!canProclaim) h += '<p class="warnote">' + esc(FB.T('Only independent dukes and crowned rulers can change these laws.')) + '</p>';
    ['internal_peace', 'external_campaigns'].forEach(function (id) {
      const def = FBDATA.policies[id], current = FB.realmPolicyLevelId(s, id);
      const currentIndex = def.levels.map(function (l) { return l.id; }).indexOf(current);
      let rows = '', details = '';
      def.levels.forEach(function (level, i) {
        const status = FB.realmPolicyStatus(s, id, level.id);
        const label = FB.dataText(s, s.player.charId, 'policy', id, def, 'levels.' + i + '.name', {});
        const desc = FB.dataText(s, s.player.charId, 'policy', id, def, 'levels.' + i + '.desc', {});
        details += '<p><b>' + esc(label) + '</b><br>' + esc(desc) + '</p>';
        if (level.id !== current && !canProclaim) return;
        rows += '<div class="war-law-option">' + (level.id === current
          ? fact(label, FB.T('Current'))
          : '<h4>' + esc(label) + '</h4>');
        if (level.id === current) rows += '<p>' + esc(desc) + '</p>';
        else if (canProclaim) {
          rows += fact(FB.T('Vassal Standing'), i > currentIndex ? FB.T('-10') : FB.T('+10')) +
            '<button type="button" class="actionbtn" data-proclaim-war-law="' + id + ':' + level.id + '"' + (status.ready ? '' : ' disabled') + '>' +
            esc(FB.T('Proclaim: {money:cost}', { cost:status.cost })) + '</button>' +
            (!status.ready ? '<p class="warnote">' + esc(status.reason) + '</p>' : '');
        }
        rows += '</div>';
      });
      h += section('war-law-details-' + id, FB.dataText(s, s.player.charId, 'policy', id, def, 'name', {}), rows, details);
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
        if (target) target.focus({ preventScroll:true });
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
