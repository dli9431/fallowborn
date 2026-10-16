/* Shared review cards and retained modal history for local public powers. */
(function () {
  'use strict';
  var UI = FB.ui, SH = UI._shared, C = FB.governments.support;
  function esc(v) { return FB.esc(String(v)); }
  function kv(label, value) { return SH.kv(label, esc(value)); }
  function reason(id) {
    var names = {
      missing_person:FB.T('That person is unavailable.'), not_local:FB.T('Residence in this community is required.'),
      minor:FB.T('The delegate must meet the declared adult age.'), not_free:FB.T('A free household member is required.'),
      service:FB.T('Complete the declared years of local service.'), skills:FB.T('The declared skills are required.'),
      funds:FB.T('The nomination fee is unaffordable.'), no_vacancy:FB.T('The current mandate remains in force.'),
      already_nominated:FB.T('The candidate is already nominated.'), no_candidates:FB.T('Nominate an eligible local person first.'),
      constituency_unresolved:FB.T('A represented interest is unavailable. Local rights remain in force.'),
      occupied:FB.T('Military occupation prevents this act. Local rights remain in force.'),
      outside_scope:FB.T('The proposal exceeds the declared local powers or obligations.'),
      reserve:FB.T('The proposal would spend the community’s protected reserve.'),
      withheld:FB.T('The required represented interests withhold support.'),
      no_mandate:FB.T('A valid delegate mandate is required.'), unjustified:FB.T('Recall requires current evidence of neglect, overreach or ineligibility.'),
      collective_consent:FB.T('A fresh collective decision on these exact terms is required.'),
      inactive_institution:FB.T('This institution is no longer governing.'),
      existing_dues:FB.T('The existing extraordinary dues remain in force.'),
      existing_obligations:FB.T('Current public dues and outside commitments must expire before government conversion.'),
      commitment_limit:FB.T('The community must finish an existing commitment before taking another.'),
      partner_withheld:FB.T('The outside partner withholds agreement or cannot meet the commitment.')
    };
    return names[id] || FB.T('Review the current terms again.');
  }
  function operation(id) {
    var names = { war:FB.T('Offensive campaign'), treaty:FB.T('Outside agreement'), grant:FB.T('Communal land transfer'),
      extraordinary_tax:FB.T('New dues'), pledge:FB.T('Household or communal pledge'), conversion:FB.T('Government conversion') };
    return names[id] || FB.T('Local decision');
  }
  function memberName(s, rid, member) {
    var p = C.profile(s, rid), def = p.members.filter(function (m) { return m.id === member.id; })[0];
    return def ? FB.dataText(s, s.player.charId, 'constituencyMember', C.row(s, rid).profileId + '.' + member.id, def, 'name', {}) : FB.T('Unavailable interest');
  }
  UI.showCommunityAssembly = function (rid, view) {
    var s = FB.state, r = C.row(s, rid), p = C.profile(s, rid);
    if (!r || !p) return;
    view = view || {};
    var delegate = C.delegate(s, rid), actions = [], people = '', parts = '';
    function add(label, q, apply, detail) {
      if (!q) return;
      var index = actions.length;
      actions.push({ quote:q, apply:apply, label:label });
      var note = q.allowed ? FB.T('Immediate cost: {money:cost}. Review before committing.', { cost:q.cost || q.charge || 0 }) : q.blocker || reason(q.reason);
      if (q.terms && q.terms.duration) note += ' ' + FB.T('Duration: {days} days.', { days:q.terms.duration });
      if (q.terms && q.terms.levy) note += ' ' + FB.T('Up to {count} troops, subject to available forces.', { count:q.terms.levy });
      if (q.operation === 'extraordinary_tax') note += ' ' + FB.T('Additional seasonal dues: up to {money:amount}.', { amount:q.terms.amount });
      parts += SH.reviewActionCardHtml({ id:'assembly-action-' + index, label:label,
        disabled:!q.allowed, warn:!q.allowed,
        note:note,
        details:'<p>' + esc(detail) + '</p>', data:{ assemblyReview:index } });
    }
    if (delegate) people += SH.reviewPersonHtml(delegate, FB.T('Accountable representative'), 'assembly-person');
    var facts = SH.reviewPeopleHtml(people) + kv(FB.T('Mandate'), delegate ? FB.T('Active') : FB.T('Vacant or suspended')) +
      kv(FB.T('Duration'), r.mandate && r.mandate.endTurn !== null
        ? FB.T('{days} days remaining', { days:Math.max(0, r.mandate.endTurn - s.turn) }) : FB.T('No fixed term is declared')) +
      kv(FB.T('Public treasury'), FB.money(FB.treasuryAvailable(s, rid), s)) +
      kv(FB.T('Protected reserve'), FB.money(p.obligations.reserve, s)) +
      kv(FB.T('Local scope'), r.scopes.map(function (pid) { return FB.world.byId[pid].name; }).join(', ')) +
      kv(FB.T('Public powers'), FB.T('Local defence, arbitration and declared public receipts')) +
      kv(FB.T('Minimum delegate age'), p.eligibility.minAge) +
      kv(FB.T('Required service'), FB.T('{years} years', { years:p.eligibility.minServiceYears })) +
      kv(FB.T('Required skills'), Object.keys(p.eligibility.skills).map(function (k) {
        return FB.T('{skill}: {value}', { skill:FB.skillName(k), value:p.eligibility.skills[k] });
      }).join(', ')) +
      kv(FB.T('Maximum seasonal dues'), FB.money(p.obligations.maxDues, s)) +
      kv(FB.T('Maximum defensive troops'), p.obligations.maxLevy) +
      kv(FB.T('Reserved decisions'), p.reserved.map(operation).join(', '));
    if (!delegate) facts += '<p class="hint">' + esc(FB.T('The vacancy preserves local property and obligations. An eligible resident can seek a mandate.')) + '</p>';
    var liveMembers = C.members(s, rid);
    var members = r.members.map(function (m) {
      var available = liveMembers.some(function (q) { return q.id === m.id; });
      if (!available) add(FB.T('Repair represented interest'), C.quote(s, rid, 'repair_member', { memberId:m.id }), C.apply,
        FB.T('Restore the institutional interest to its declared county scope. Completed selections remain completed.'));
      return kv(memberName(s, rid, m), available ? FB.T('Influence {weight}', { weight:m.weight }) : FB.T('Vacant interest; local rights preserved'));
    }).join('') + kv(FB.T('Required support'), FB.T('{percent}% of represented influence', { percent:Math.round(p.selection.threshold * 100) }));
    add(FB.T('Seek nomination'), C.quote(s, rid, 'nominate', { candidateId:s.player.charId }), C.apply,
      FB.T('Local residence, freedom, age, service and skills govern eligibility. Nomination transfers no public property and creates no hereditary claim.'));
    add(FB.T('Seek local recognition'), C.recognitionQuote(s, rid), C.applyRecognition,
      FB.T('Represented interests can withhold support. A completed selection installs one public mandate, and cannot be replayed.'));
    if (delegate && delegate.id === s.player.charId) add(FB.T('Resign the mandate'),
      C.quote(s, rid, 'resign', { delegateId:delegate.id }), C.apply, FB.T('The public role becomes vacant. Your household and property remain yours.'));
    if (r.mandate && r.mandate.status === 'active') {
      var recallReason = !C.eligible(s, rid, r.mandate.delegateId).allowed ? 'ineligible' : r.overreach ? 'overreach' : 'neglect';
      add(FB.T('Review justified recall'), C.quote(s, rid, 'recall', { reason:recallReason, members:C.members(s, rid).map(function (m) { return m.id; }) }),
        C.apply, FB.T('Current evidence and the declared influence threshold are required. Recall ends only the public mandate.'));
    }
    var partners = Object.keys(s.realms).filter(function (id) { return id !== rid && s.realms[id].alive && !s.realms[id].liege; }).sort();
    var partner = partners.indexOf(view.partner) >= 0 ? view.partner : partners[0];
    var select = '<label class="modal-field-label" for="assembly-partner">' + esc(FB.T('Outside partner')) + '</label>' +
      '<select class="field" id="assembly-partner">' + partners.map(function (id) { return '<option value="' + esc(id) + '"' +
        (id === partner ? ' selected' : '') + '>' + esc(s.realms[id].name) + '</option>'; }).join('') + '</select>';
    if (delegate && delegate.id === s.player.charId && partner) {
      [{ kind:'tribute', amount:5, label:FB.T('Review tribute') }, { kind:'protection', amount:5, label:FB.T('Review protection') },
        { kind:'service', amount:0, label:FB.T('Review local service') },
        { kind:'delegated_authority', amount:0, label:FB.T('Delegate local arbitration') }].forEach(function (term) {
        var terms = { kind:term.kind, externalRealmId:partner, amount:term.amount, duration:360 };
        if (term.kind === 'service' || term.kind === 'protection') terms.levy = Math.max(1, Math.min(40, p.obligations.maxLevy,
          term.kind === 'service' ? Math.floor(FB.aiBaseHost(s, rid) / 2) : p.obligations.maxLevy));
        if (term.kind === 'delegated_authority') terms.power = 'peace';
        add(term.label, C.agreementQuote(s, rid, terms), C.agree,
          FB.T('Duration: 360 days. The exact one-time public payment is shown above. The partner gains the named relationship; no county, household or hereditary title transfers.'));
      });
    }
    if (delegate && delegate.id === s.player.charId) {
      add(FB.T('Review new local dues'), C.duesQuote(s, rid, { amount:Math.min(5, p.obligations.maxDues), duration:90 }), C.imposeDues,
        FB.T('Collective assent permits additional public dues for 90 days. Total seasonal public income remains bounded by the declared ceiling. Household property cannot be pledged.'));
      C.frontierCauses(s, rid).slice(0, 8).forEach(function (cause) {
        var terms = { causes:[cause] }, place = FB.world.byId[cause.target].name;
        add(FB.T('Review campaign consent: {place}', { place:place }), C.assentQuote(s, rid, 'war', terms), C.assent,
          FB.T('Reserve consent for this exact neighbouring objective. Launch requires a separate current war review. Victory does not give the delegate private land.'));
        add(FB.T('Launch approved campaign: {place}', { place:place }), C.warQuote(s, rid, terms), C.launchWar,
          FB.T('Current collective assent and ordinary campaign rules must both permit declaration.'));
      });
      FB.realmWars(s, rid).forEach(function (w) {
        add(FB.T('Review white peace'), C.peaceQuote(s, rid, { warId:w.id, kind:'white_peace' }), C.makePeace,
          FB.T('Both parties must permit peace. This ends the military campaign without transferring communal ownership.'));
      });
    }
    var occupier = r.scopes.map(function (pid) { return s.owner[pid]; }).filter(function (id) { return id !== rid; })[0];
    if (occupier && C.isDelegated(s, rid)) {
      facts += kv(FB.T('Military occupier'), s.realms[occupier].name);
      add(FB.T('Review local autonomy under tribute'), C.agreementQuote(s, rid,
        { kind:'tribute', externalRealmId:occupier, amount:5, duration:360, occupationSettlement:true }), C.agree,
        FB.T('A one-time public payment restores local military control under a tribute agreement. The assembly mandate, community jurisdiction and household property remain in force.'));
      FB.governments.transformationTargets(FB.governments.forRealm(s, rid).id).forEach(function (option) {
        add(FB.T(option.name), C.conversionQuote(s, rid, { formId:option.formId, externalRealmId:occupier }), C.acceptConversion,
          FB.T('Collective assent accepts a different government and ends the delegate mandate. Local military occupation ends; the polity, households and existing obligations remain. This is a separate political settlement.'));
      });
    }
    var history = r.decisions.map(function (d) { return kv(operation(d.operation), d.status === 'approved'
      ? FB.T('Approved for these exact terms') : d.status === 'refused' ? FB.T('Consent withheld') : FB.T('Executed')); }).join('');
    UI.openModal(FB.T('Local assembly'), '<div data-assembly-list data-modal-scroll>' +
      SH.reviewFactsCard(FB.T('Community mandate'), facts) + SH.reviewFactsCard(FB.T('Represented interests'), members) +
      SH.reviewFactsCard(FB.T('External relations'), select) + SH.reviewActionsHtml(parts) +
      (history ? SH.reviewFactsCard(FB.T('Collective decisions'), history) : '') + '</div>',
      { modalClass:'fullsheet-modal', titleDetailsHtml:'<p>' + esc(FB.T('Representation weights are simulation choices. Public leadership, military control and household property have independent scopes. The family tree remains your family’s record.')) + '</p>' });
    var body = SH.$('gm-body'), list = body.querySelector('[data-assembly-list]');
    function position() { return { partner:SH.$('assembly-partner').value, scroll:list.scrollTop, bodyScroll:body.scrollTop,
      focus:document.activeElement && document.activeElement.id, details:Array.from(list.querySelectorAll('.settcard-info[aria-expanded="true"]')).map(function (n) { return n.getAttribute('aria-controls'); }) }; }
    (view.details || []).forEach(function (id) { var node = list.querySelector('[aria-controls="' + id + '"]'); if (node) node.click(); });
    list.scrollTop = view.scroll || 0; body.scrollTop = view.bodyScroll || 0;
    if (view.focus && SH.$(view.focus)) SH.$(view.focus).focus({ preventScroll:true });
    SH.$('assembly-partner').onchange = function () { UI.showCommunityAssembly(rid, position()); };
    if (SH.$('assembly-person')) SH.$('assembly-person').onclick = function () { UI.showCharModal(delegate.id); };
    list.querySelectorAll('[data-assembly-review]').forEach(function (button) {
      button.onclick = function () {
        var entry = actions[Number(button.getAttribute('data-assembly-review'))], pos = position(), q = entry.quote;
        var nominee = q.terms && q.terms.candidateId && s.chars[q.terms.candidateId];
        var named = nominee || delegate;
        var detail = (named ? SH.reviewPeopleHtml(SH.reviewPersonHtml(named, FB.T('Participant'), null)) : '') +
          kv(FB.T('Immediate cost'), FB.money(q.cost || q.charge || 0, s)) +
          kv(FB.T('Scope'), r.scopes.map(function (pid) { return FB.world.byId[pid].name; }).join(', '));
        if (q.terms && q.terms.externalRealmId) detail += kv(FB.T('Outside partner'), s.realms[q.terms.externalRealmId].name);
        if (q.partnerId) detail += kv(FB.T('Other belligerent'), s.realms[q.partnerId].name);
        if (q.terms && q.terms.duration) detail += kv(FB.T('Duration'), FB.T('{days} days', { days:q.terms.duration }));
        if (q.terms && q.terms.levy) detail += kv(FB.T('Troop commitment'), q.terms.levy);
        if (q.operation === 'extraordinary_tax') detail += kv(FB.T('Additional seasonal dues'), FB.money(q.terms.amount, s));
        if (q.terms && q.terms.power) detail += kv(FB.T('Delegated power'), FB.T('Local arbitration only'));
        if (q.operation === 'conversion') detail += kv(FB.T('Government settlement'), FB.T('Personal kingship; the delegate mandate ends'));
        if (q.ballots) detail += q.ballots.map(function (b) { var m = C.members(s, rid).filter(function (m) { return m.id === b.memberId; })[0];
          return kv(m ? memberName(s, rid, m) : FB.T('Unavailable interest'), b.assent ? FB.T('Assent') : FB.T('Withheld')); }).join('');
        function back() { UI.showCommunityAssembly(rid, pos); }
        UI.openModal(entry.label, SH.reviewFactsCard(FB.T('Decision terms'), detail) +
          SH.reviewActionsHtml(SH.reviewActionCardHtml({ id:'assembly-confirm', label:FB.T('Confirm decision'),
            note:FB.T('The exact mandate, membership, eligibility and costs are checked again.'),
            details:'<p>' + esc(FB.T('A changed review applies no charge, accession or public power.')) + '</p>' })),
          { modalClass:'fullsheet-modal', historyView:true, historyBack:true, historyBackRender:back });
        SH.$('assembly-confirm').onclick = function () {
          var success = s === FB.state && entry.apply(s, q);
          UI.openModal(success ? FB.T('Decision recorded') : FB.T('Terms changed'),
            SH.reviewFactsCard('', (named ? SH.reviewPeopleHtml(SH.reviewPersonHtml(named, FB.T('Participant'), null)) : '') +
              '<p>' + esc(success ? FB.T('The local decision is recorded. Household property remains in force.') :
                FB.T('Review current terms again. Nothing was spent.')) + '</p>') +
              '<button type="button" class="actionbtn" id="assembly-continue">' + esc(FB.T('Continue')) + '</button>', { replaceView:true });
          SH.$('assembly-continue').onclick = function () { SH.modalHistoryBack(back); };
          if (SH.markActionsDirty) SH.markActionsDirty();
        };
      };
    });
  };
})();
