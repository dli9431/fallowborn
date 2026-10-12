/* Retained household activity and patronage reviews. */
(function () {
  'use strict';
  var UI = FB.ui, SH = UI._shared;
  function esc(v) { return FB.esc(String(v)); }
  function kv(k, v) { return SH.kv(k, esc(v)); }
  function reason(code) {
    return { eligibility:FB.T('Faith, location, health, obligations or access prevents participation.'),
      commitment:FB.T('This participant already has a commitment or has earned this milestone.'),
      capacity:FB.T('The activity limit has been reached.'), travel:FB.T('Finish the current journey first.'),
      route:FB.T('No qualifying route is available for this participant.'), funds:FB.T('The payer cannot meet the cost and reserve.'),
      service:FB.T('The institution lacks the required prepaid service.'), property:FB.T('A foundation needs an available local freehold group.'),
      recipient:FB.T('The receiving institution has no matching property record.'), fund:FB.T('The restricted fund cannot accept this amount.'),
      project:FB.T('An eligible, controlled project with this sponsor is required.') }[code] || FB.T('Review the current terms again.');
  }
  function name(s, cid, id, d, patron) {
    return FB.dataText(s, cid, patron ? 'religiousPatronage' : 'religiousActivity', id, d, 'name', {});
  }
  function place(id) { return FB.world.byId[id] ? FB.world.byId[id].name : FB.T('Away from this map'); }
  function fundName(s, q, id) {
    var d = q.facts.definition;
    return d.funds[id].name ? FB.dataText(s, q.cid, 'religiousPatronage', q.profileId, d, 'funds.' + id + '.name', {}) :
      FB.T('Restricted service {number}', { number:Object.keys(d.funds).sort().indexOf(id) + 1 });
  }
  function benefits(d) {
    if (d.mode === 'journey') return FB.T('Existing journey rewards only. Arrival does not certify a separately performed rite.');
    var out = [];
    if (d.reward.piety) out.push(FB.T('{amount} piety', { amount:d.reward.piety }));
    if (d.reward.prestige) out.push(FB.T('{amount} prestige', { amount:d.reward.prestige }));
    Object.keys(d.reward.skills).forEach(function (key) { out.push(FB.T('{skill}: +{amount}, up to 20', {
      skill:FB.T(FB.SKILL_NAMES[key]), amount:d.reward.skills[key] })); });
    return out.join('; ') || FB.T('No additional personal reward');
  }
  function facts(s, entry) {
    var q = entry.quote, d = q.facts.definition, patron = !!q.profileId;
    var destination = q.travel ? place(q.travel.destinationId) : d.institutionId ? FB.localInstitutionName(d.institutionId, s) : place(q.facts.location);
    var payer = q.payer && q.payer.kind === 'household' ? FB.T('Household purse') :
      q.payer && s.realms[q.payer.id] ? s.realms[q.payer.id].name : FB.T('No eligible payer');
    var h = SH.reviewPeopleHtml(SH.reviewPersonHtml(s.chars[q.cid], FB.T('Participant'))) + kv(FB.T('Destination'), destination) +
      kv(FB.T('Payer'), payer) + kv(FB.T('Cost on acceptance'), FB.money(q.cost, s)) +
      kv(FB.T('Required reserve'), FB.money(d.reserve, s));
    if (d.provinceIds) h += kv(FB.T('Permitted locations'), d.provinceIds.map(place).join('; '));
    if (d.protectedWorship) h += kv(FB.T('Access'), FB.T('Participation requires protected local worship.'));
    if (!patron) return h + kv(FB.T('Time'), q.travel ? FB.T('{days} days outward, plus the return journey and any delays.', { days:q.travel.days }) :
      FB.T('{days} days at this location', { days:q.duration })) + kv(FB.T('Benefit on completion'), benefits(d)) +
      kv(FB.T('Interruption'), FB.T('Cancellation, lost access, departure or incapacity ends participation. Paid costs remain spent; no completion reward is granted.')) +
      (d.service ? kv(FB.T('Institution service consumed on completion'), FB.money(d.service.cost, s)) : '');
    h += kv(FB.T('Time'), FB.T('Immediate transfer')) +
      kv(FB.T('Benefit'), q.action === 'outreach' ? FB.T('One prepaid service supports the existing project for up to 360 days. Existing progress and resistance remain.') :
        FB.T('Property or restricted service funding remains with the receiving institution.')) +
      kv(FB.T('Interruption'), FB.T('Accepted gifts are not refunded. Death or loss of access preserves the institution and its property.'));
    if (q.land) h += kv(FB.T('Land transferred'), FB.T('{count} plots at {place}, settlement {settlement}', {
      count:q.land.count, place:place(q.land.provinceId), settlement:q.land.settlement + 1 }));
    if (q.action === 'foundation') h += kv(FB.T('Startup consumed'), FB.money(d.foundation.startup, s)) +
      kv(FB.T('Capital retained'), FB.money(d.foundation.capital, s)) + kv(FB.T('Treasury retained'), FB.money(d.foundation.treasury, s));
    Object.keys(d.funds).sort().forEach(function (id) {
      h += kv(fundName(s, q, id), FB.T('{units} prepaid uses at {money:cost} each.', { units:d.funds[id].capacity, cost:d.funds[id].unitCost }));
    });
    if (q.terms.fund) h += kv(FB.T('Receiving fund'), fundName(s, q, q.terms.fund));
    if (q.project) h += kv(FB.T('Project location'), place(q.terms.provinceId)) +
      kv(FB.T('Project scope'), q.terms.settlement === null ? FB.T('County') : FB.T('Settlement {number}', { number:q.terms.settlement + 1 }));
    return h + kv(FB.T('Ongoing cost'), FB.T('Services consume their declared prepaid funds. No additional recurring income or upkeep is created.'));
  }
  UI.showReligiousActivities = function (view) {
    var s = FB.state; if (!s) return;
    view = view || {}; FB.game.setPaused(true);
    var people = FB.religiousActivityPeople(s), cid = people.indexOf(view.personId) >= 0 ? view.personId : s.player.charId;
    var entries = [], h = '<div data-activity-list data-modal-scroll><label>' + esc(FB.T('Household participant')) +
      '<select class="field" id="activity-person">';
    people.forEach(function (id) { h += '<option value="' + esc(id) + '"' + (id === cid ? ' selected' : '') + '>' + esc(s.chars[id].name) + '</option>'; });
    h += '</select></label>';
    function add(q, label, key) {
      if (!q) return;
      var entry = { quote:q, label:label }; entries.push(entry);
      h += SH.reviewActionCardHtml({ id:'activity-review-' + key, label:label, disabled:!q.allowed, warn:!q.allowed,
        note:q.allowed ? FB.T('Cost on acceptance: {money:amount}.', { amount:q.cost }) : reason(q.reason),
        details:facts(s, entry), data:{ activityReview:entries.length - 1 } });
    }
    Object.keys(FBDATA.religiousActivities).sort().forEach(function (id) {
      var d = FBDATA.religiousActivities[id];
      if (!d.faithIds.length || d.faithIds.indexOf(s.chars[cid].religion) >= 0)
        add(FB.religiousActivityQuote(s, id, cid), name(s, cid, id, d, false), id);
    });
    Object.keys(FBDATA.religiousPatronage).sort().forEach(function (id) {
      var d = FBDATA.religiousPatronage[id];
      if (d.faithIds.length && d.faithIds.indexOf(s.chars[cid].religion) < 0) return;
      FB.religiousPatronageOptions(s, id, cid).forEach(function (option, index) {
        var action = option.action === 'foundation' ? FB.T('Foundation') : option.action === 'outreach' ? FB.T('Outreach') : FB.T('Gift');
        add(FB.religiousPatronageQuote(s, id, cid, option.action, option.terms),
          FB.T('{action}: {name}', { action:action, name:name(s, cid, id, d, true) }), id + '-' + index);
      });
    });
    var active = s.chars[cid].religiousActivity;
    if (active) h += SH.reviewFactsCard(name(s, cid, active.activityId, active.definition, false),
      kv(FB.T('Days remaining'), Math.max(0, active.dueTurn - s.turn)) + kv(FB.T('Location'), place(active.location))) +
      SH.reviewActionCardHtml({ id:'activity-cancel', label:FB.T('Review cancellation'),
        note:FB.T('Paid costs remain spent. Institution property is retained.') });
    if (!entries.length && !active) h += '<p>' + esc(FB.T('No declared activity is available to this household participant.')) + '</p>';
    h += '</div>';
    UI.openModal(FB.T('Religious activities'), h, { modalClass:'fullsheet-modal', historyView:!!view.returnTo,
      historyBack:!!view.returnTo, historyBackRender:view.returnTo,
      titleDetailsHtml:'<p>' + esc(FB.T('Review the participant, destination, payer, time and interruption terms before accepting.')) + '</p>' });
    var list = SH.$('gm-body').querySelector('[data-activity-list]');
    SH.$('activity-person').onchange = function () { UI.showReligiousActivities({ personId:this.value, returnTo:view.returnTo }); };
    (view.expanded || []).forEach(function (id) {
      var detail = SH.$(id), toggle = list.querySelector('[aria-controls="' + id + '"]');
      if (detail && toggle) { detail.classList.remove('hidden'); toggle.setAttribute('aria-expanded', 'true'); }
    });
    list.scrollTop = view.scrollTop || 0; SH.$('gm-body').scrollTop = view.bodyScroll || 0;
    if (view.focusId && SH.$(view.focusId)) SH.$(view.focusId).focus({ preventScroll:true });
    function review(button, entry) {
      var expanded = [];
      list.querySelectorAll('.settcard-details:not(.hidden)').forEach(function (detail) { expanded.push(detail.id); });
      var pos = { personId:cid, scrollTop:list.scrollTop, bodyScroll:SH.$('gm-body').scrollTop,
        focusId:button.id, expanded:expanded, returnTo:view.returnTo };
      function back() { UI.showReligiousActivities(pos); }
      var cancellation = !entry, saved = cancellation && JSON.parse(JSON.stringify(active));
      var label = cancellation ? FB.T('Cancel participation') : entry.label;
      UI.openModal(label, SH.reviewFactsCard(FB.T('Exact decision terms'), cancellation ?
        kv(FB.T('Interruption'), FB.T('Paid costs remain spent. No completion reward is granted. Property and restricted funds remain.')) : facts(s, entry)) +
        SH.reviewActionCardHtml({ id:'activity-confirm', label:FB.T('Confirm decision'),
          note:FB.T('Eligibility and funds are checked again before anything changes.') }),
        { modalClass:'fullsheet-modal', historyView:true, historyBack:true, historyBackRender:back });
      SH.$('activity-confirm').onclick = function () {
        var success = s === FB.state && (cancellation ? FB.religiousActivityCancel(s, cid, saved) : entry.quote.profileId ?
          FB.religiousPatronageApply(s, entry.quote) : FB.religiousActivityApply(s, entry.quote));
        UI.openModal(success ? FB.T('Decision recorded') : FB.T('Terms changed'), SH.reviewFactsCard('',
          esc(success ? FB.T('The decision is recorded.') : FB.T('Review the current terms again. Nothing was spent.'))) +
          '<button class="actionbtn" type="button" id="activity-continue">' + esc(FB.T('Continue')) + '</button>', { replaceView:true });
        SH.$('activity-continue').onclick = function () { SH.modalHistoryBack(back); };
        if (SH.markActionsDirty) SH.markActionsDirty();
      };
    }
    list.querySelectorAll('[data-activity-review]').forEach(function (button) {
      button.onclick = function () { review(button, entries[Number(button.dataset.activityReview)]); };
    });
    if (SH.$('activity-cancel')) SH.$('activity-cancel').onclick = function () { review(this, null); };
  };
})();
