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
      serviceUnavailable:FB.T('No matching local service can use this fund.'), funded:FB.T('The fund already covers this target.'),
      payer:FB.T('Only an authorized household payer can fund this shortfall.'),
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
  function exactMoney(s, amount) { return FB.money(amount, { state:s, exact:true }); }
  function sponsorshipCosts(s, offer) {
    return kv(FB.T('Restricted donation'), exactMoney(s, offer.donation.cost)) +
      kv(FB.T('Attendance fee'), exactMoney(s, offer.activity.cost)) +
      kv(FB.T('Total payment'), exactMoney(s, offer.total));
  }
  function facts(s, entry) {
    var q = entry.quote, d = q.facts.definition, patron = !!q.profileId, f = q.funding, offer = entry.sponsorship;
    var destination = q.travel ? place(q.travel.destinationId) : d.institutionId ? FB.localInstitutionName(d.institutionId, s) : place(q.facts.location);
    var payer = q.payer && q.payer.kind === 'household' ? FB.T('Household purse') :
      q.payer && s.realms[q.payer.id] ? s.realms[q.payer.id].name : FB.T('No eligible payer');
    var h = SH.reviewPeopleHtml(SH.reviewPersonHtml(s.chars[q.cid], FB.T('Participant'))) + kv(FB.T('Destination'), destination) +
      kv(FB.T('Payer'), payer);
    if (offer) {
      var gift = offer.donation;
      h += kv(FB.T('Receiving fund'), fundName(s, gift, gift.terms.fund)) +
        kv(FB.T('Current fund balance'), exactMoney(s, gift.funding.balance)) +
        sponsorshipCosts(s, offer) +
        kv(FB.T('Required reserve'), exactMoney(s, offer.reserve)) +
        kv(FB.T('Household money after payment'), exactMoney(s, offer.householdLeft)) +
        kv(FB.T('Restricted donation terms'), FB.T('The gift stays with the institution. The fund remains available to other participants, and completion still needs one funded use.'));
    } else {
      h += kv(f ? FB.T('Exact gift') : FB.T('Cost on acceptance'), FB.money(q.cost, { state:s, exact:!!f })) +
        kv(FB.T('Required reserve'), FB.money(d.reserve, { state:s, exact:!!f }));
    }
    if (d.provinceIds) h += kv(FB.T('Permitted locations'), d.provinceIds.map(place).join('; '));
    if (d.protectedWorship) h += kv(FB.T('Access'), FB.T('Participation requires protected local worship.'));
    if (!patron) return h + kv(FB.T('Time'), q.travel ? FB.T('{days} days outward, plus the return journey and any delays.', { days:q.travel.days }) :
      FB.T('{days} days at this location', { days:q.duration })) + kv(FB.T('Benefit on completion'), benefits(d)) +
      kv(FB.T('Interruption'), FB.T('Cancellation, lost access, departure or incapacity ends participation. Paid costs remain spent; no completion reward is granted.')) +
      (d.service ? kv(FB.T('Institution service consumed on completion'), exactMoney(s, d.service.cost)) : '');
    h += kv(FB.T('Time'), FB.T('Immediate transfer')) +
      kv(FB.T('Benefit'), q.action === 'outreach' ? FB.T('One prepaid service supports the existing project for up to 360 days. Existing progress and resistance remain.') :
        FB.T('Property or restricted service funding remains with the receiving institution.')) +
      kv(FB.T('Interruption'), FB.T('Accepted gifts are not refunded. Death or loss of access preserves the institution and its property.'));
    if (f) {
      return h + kv(FB.T('Receiving fund'), fundName(s, q, q.terms.fund)) +
        kv(FB.T('Current fund balance'), FB.money(f.balance, { state:s, exact:true })) +
        kv(FB.T('Cost per use'), FB.money(f.unitCost, { state:s, exact:true })) +
        kv(FB.T('Target prepaid uses'), f.targetUses) +
        kv(FB.T('Balance at target'), FB.money(f.targetBalance, { state:s, exact:true })) +
        kv(FB.T('Remaining capacity'), FB.T('{remaining} of {capacity} uses', { remaining:f.remainingUses, capacity:f.capacity })) +
        kv(FB.T('Capacity after gift'), FB.T('{remaining} of {capacity} uses', {
          remaining:f.capacity - Math.max(f.fundedUses, f.targetUses), capacity:f.capacity })) +
        kv(FB.T('Household money after gift'), FB.money(f.householdLeft, { state:s, exact:true })) +
        kv(FB.T('Local services'), f.services.map(function (service) {
          return name(s, q.cid, service.id, service.definition, false);
        }).join(', ')) +
        kv(FB.T('Access'), FB.T('Participants must qualify separately and complete the service to use the funding.'));
    }
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
    var entries = [], fundingTargets = view.fundingTargets || {};
    var h = '<div data-activity-list data-modal-scroll><label>' + esc(FB.T('Household participant')) +
      '<select class="field" id="activity-person">';
    people.forEach(function (id) { h += '<option value="' + esc(id) + '"' + (id === cid ? ' selected' : '') + '>' + esc(s.chars[id].name) + '</option>'; });
    h += '</select></label>';
    function add(q, label, key) {
      if (!q) return;
      var offer = q.activityId && q.reason === 'service' && FB.religiousActivitySponsorshipQuote(s, q.activityId, cid);
      var entry = { quote:q, label:label, key:key, sponsorship:offer }; entries.push(entry);
      var note = offer ? FB.T('Donate {gift} toward the shortfall and pay {total} in total to enroll.', {
        gift:exactMoney(s, offer.donation.cost), total:exactMoney(s, offer.total) }) :
        !q.allowed ? reason(q.reason) : q.funding ? FB.T('Gift of {amount} for a prepaid-use target of {target}.', {
        amount:FB.money(q.cost, { state:s, exact:true }), target:q.funding.targetUses }) :
        FB.T('Cost on acceptance: {money:amount}.', { amount:q.cost });
      h += SH.reviewActionCardHtml({ id:'activity-review-' + key, label:label, disabled:!(q.allowed || offer), warn:!q.allowed,
        note:note,
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
      FB.religiousServiceFundingOptions(s, id, cid).forEach(function (terms) {
        var q = FB.religiousPatronageQuote(s, id, cid, 'donation', terms);
        if (q && q.funding) add(q, FB.T('Fund {fund}', { fund:fundName(s, q, terms.fund) }), 'fund-' + id + '-' + terms.fund);
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
    SH.$('activity-person').onchange = function () { UI.showReligiousActivities({ personId:this.value, returnTo:view.returnTo, fundingTargets:fundingTargets }); };
    (view.expanded || []).forEach(function (id) {
      var detail = SH.$(id), toggle = list.querySelector('[aria-controls="' + id + '"]');
      if (detail && toggle) { detail.classList.remove('hidden'); toggle.setAttribute('aria-expanded', 'true'); }
    });
    list.scrollTop = view.scrollTop || 0; SH.$('gm-body').scrollTop = view.bodyScroll || 0;
    var focus = view.focusId && SH.$(view.focusId);
    if (focus) (focus.disabled ? focus.closest('.review-action-card') : focus).focus({ preventScroll:true });
    function review(button, entry) {
      var expanded = [];
      list.querySelectorAll('.settcard-details:not(.hidden)').forEach(function (detail) { expanded.push(detail.id); });
      var pos = { personId:cid, scrollTop:list.scrollTop, bodyScroll:SH.$('gm-body').scrollTop,
        focusId:button.id, expanded:expanded, returnTo:view.returnTo, fundingTargets:fundingTargets };
      function back() { UI.showReligiousActivities(pos); }
      var cancellation = !entry, saved = cancellation && JSON.parse(JSON.stringify(active));
      var label = cancellation ? FB.T('Cancel participation') : entry.label;
      var initial = entry && entry.quote, f = initial && initial.funding, picker = '';
      var offer = entry && entry.sponsorship;
      var current = entry;
      function chooseTarget(target) {
        var q = FB.religiousPatronageQuote(s, initial.profileId, cid, 'donation', { fund:initial.terms.fund, targetUses:target });
        current = { quote:q, label:label };
      }
      if (f) {
        var target = fundingTargets[entry.key];
        if (target > f.fundedUses && target <= f.capacity && target !== f.targetUses) chooseTarget(target);
        else target = f.targetUses;
        picker = '<label>' + esc(FB.T('Choose prepaid-use target')) + '<select class="field" id="activity-funding-target">';
        for (var uses = f.fundedUses + 1; uses <= f.capacity; uses++) {
          picker += '<option value="' + uses + '"' + (uses === target ? ' selected' : '') + '>' + uses + '</option>';
        }
        picker += '</select></label>';
      }
      function decisionTerms() {
        var q = current && current.quote, blocked = !cancellation && !offer && (!q || !q.allowed);
        var detail = cancellation ? kv(FB.T('Interruption'),
          FB.T('Paid costs remain spent. No completion reward is granted. Property and restricted funds remain.')) :
          q && (!f || q.funding && q.funding.targetUses !== undefined) ? facts(s, current) : '';
        return SH.reviewFactsCard(FB.T('Exact decision terms'), detail) +
          SH.reviewActionCardHtml({ id:'activity-confirm', label:offer ? FB.T('Donate and enroll') : FB.T('Confirm decision'),
            disabled:blocked, warn:blocked,
            note:blocked ? reason(q && q.reason) : FB.T('Eligibility and funds are checked again before anything changes.') }) +
          (offer ? SH.reviewActionCardHtml({ id:'activity-leave-funding', label:FB.T('Leave funding unchanged') }) : '');
      }
      UI.openModal(label, picker + '<div id="activity-decision-terms">' + decisionTerms() + '</div>',
        { modalClass:'fullsheet-modal', historyView:true, historyBack:true, historyBackRender:back });
      if (offer) SH.$('activity-leave-funding').onclick = function () { SH.modalHistoryBack(back); };
      function bindConfirm() {
        SH.$('activity-confirm').onclick = function () {
          var q = current && current.quote;
          var success = s === FB.state && (cancellation ? FB.religiousActivityCancel(s, cid, saved) :
            offer ? FB.religiousActivitySponsorshipApply(s, offer) : q && (q.profileId ?
              FB.religiousPatronageApply(s, q) : FB.religiousActivityApply(s, q)));
          var result = esc(success ? FB.T('The decision is recorded.') : FB.T('Review the current terms again. Nothing was spent.'));
          if (offer && success) result = SH.reviewPeopleHtml(SH.reviewPersonHtml(s.chars[cid], FB.T('Participant'))) +
            sponsorshipCosts(s, offer);
          UI.openModal(success ? FB.T('Decision recorded') : FB.T('Terms changed'), SH.reviewFactsCard('',
            result) +
            '<button class="actionbtn" type="button" id="activity-continue">' + esc(FB.T('Continue')) + '</button>', { replaceView:true });
          SH.$('activity-continue').onclick = function () { SH.modalHistoryBack(back); };
          if (SH.markActionsDirty) SH.markActionsDirty();
        };
      }
      bindConfirm();
      if (f) SH.$('activity-funding-target').onchange = function () {
        fundingTargets[entry.key] = Number(this.value);
        chooseTarget(fundingTargets[entry.key]);
        SH.$('activity-decision-terms').innerHTML = decisionTerms();
        bindConfirm();
      };
    }
    list.querySelectorAll('[data-activity-review]').forEach(function (button) {
      button.onclick = function () { review(button, entries[Number(button.dataset.activityReview)]); };
    });
    if (SH.$('activity-cancel')) SH.$('activity-cancel').onclick = function () { review(this, null); };
  };
})();
