/* Household membership and local leadership use retained, pure reviews. */
(function () {
  'use strict';
  var UI = FB.ui, SH = UI._shared;
  function esc(v) { return FB.esc(String(v)); }
  function kv(k, v) { return SH.kv(k, esc(v)); }
  function reason(code) {
    return { rights:FB.T('The declared rights do not permit this decision.'),
      terms:FB.T('Review the current terms again.'), unavailable:FB.T('The community is unavailable at this place or date.'),
      property:FB.T('The institution’s recorded property is unavailable.'),
      qualification:FB.T('Age, household, skills, residence or religious qualification prevents this role.'),
      membership:FB.T('The required membership is absent, unchanged or at its limit.'),
      affiliation:FB.T('A current affiliation conflicts with this teaching or the affiliation limit is reached.'),
      occupied_office:FB.T('Leadership already has an incumbent.'), consent:FB.T('The required members have not assented.'),
      consent_bound:FB.T('The community already has its maximum outstanding decisions.'),
      scope:FB.T('This decision lies outside the institution’s declared jurisdiction.'),
      protection:FB.T('Worship is not protected in this county.'),
      recognition:FB.T('The proposed recognition is already current or no longer exists.'),
      funds:FB.T('The payer cannot meet this cost.'), unsupported:FB.T('This community does not offer that decision.')
    }[code] || FB.T('Review the current terms again.');
  }
  function roleName(s, snap, id) {
    return FB.dataText(s, s.player.charId, 'religiousInstitutionProfile', snap.definition.profileId,
      snap.profile, 'roles.' + id + '.name', {});
  }
  function affiliationName(s, id) {
    return FB.dataText(s, s.player.charId, 'religiousAffiliation', id,
      FBDATA.religiousAffiliations[id], 'name', {});
  }
  UI.showReligiousInstitutions = function (view) {
    var s = FB.state; if (!s) return;
    view = view || {};
    FB.game.setPaused(true);
    var people = Object.keys(s.chars).sort().filter(function (id) {
      var c = s.chars[id];
      return !c.dead && !(FB.isExternalHouseholdAuthority && FB.isExternalHouseholdAuthority(s, c)) &&
        (id === s.player.charId || FB.isHouseholdCharacter && FB.isHouseholdCharacter(s, id) ||
          FB.manageableKinKind && FB.manageableKinKind(s, id));
    });
    var personId = people.indexOf(view.personId) >= 0 ? view.personId : s.player.charId;
    var actor = { kind:'character', id:personId }, entries = [];
    var h = '<div data-religious-list data-modal-scroll><label>' + esc(FB.T('Household participant')) +
      '<select class="field" id="religious-person">';
    people.forEach(function (id) { h += '<option value="' + esc(id) + '"' + (id === personId ? ' selected' : '') + '>' + esc(s.chars[id].name) + '</option>'; });
    h += '</select></label>';
    function add(iid, label, who, action, terms, details) {
      var q = FB.religiousInstitutionQuote(s, iid, who, action, terms);
      if (!q) return;
      var index = entries.length; entries.push({ quote:q, label:label });
      var key = [iid, action, terms.roleId || terms.affiliationId || terms.candidateId || terms.recognitionId ||
        terms.decision || '', terms.subject && terms.subject.id || ''].join('-');
      h += SH.reviewActionCardHtml({ id:'religious-review-' + key, label:label,
        disabled:!q.allowed, warn:!q.allowed,
        note:q.allowed ? FB.T('Cost on acceptance: {money:amount}.', { amount:q.cost }) : reason(q.reason),
        details:'<p>' + esc(details) + '</p>', data:{ religiousReview:index } });
    }
    var institutions = FB.playerReligiousInstitutions(s, personId).filter(function (iid) {
      var snap = FB.religiousInstitutionSnapshot(s, iid), def = snap.definition;
      return snap.members[personId] || def.religion === s.chars[personId].religion;
    });
    if (!institutions.length) h += '<p>' + esc(FB.T('No declared religious community is available to this household participant.')) + '</p>';
    institutions.forEach(function (iid) {
      var snap = FB.religiousInstitutionSnapshot(s, iid), def = snap.definition, p = snap.profile;
      var m = snap.members[personId], active = m && m.status === 'active';
      var holder = snap.holderId && s.chars[snap.holderId], scope = def.jurisdictionIds;
      h += '<section class="governance-card review-fact-card"><h4>' + esc(FB.localInstitutionName(iid, s)) + '</h4>' +
        kv(FB.T('Faith'), FB.dataText(s, personId, 'religion', def.religion, FB.religionOf(def.religion, s), 'name', {})) +
        kv(FB.T('Membership'), active ? roleName(s, snap, m.roleId) : FB.T('Not a member')) +
        kv(FB.T('Leadership'), holder ? holder.name : p.selection ? FB.T('Vacant') : FB.T('No leadership office')) +
        kv(FB.T('Access'), snap.available ? FB.T('Available') : FB.T('Unavailable')) +
        kv(FB.T('Local scope'), scope.map(function (pid) { return FB.world.byId[pid] ? FB.world.byId[pid].name : FB.T('Away from this map'); }).join(', ')) +
        kv(FB.T('Recorded recognition'), snap.recognitions.filter(function (r) { return r.status === 'active'; }).length);
      var common = FB.T('Membership retains your primary faith, household property and the county’s other communities.');
      if (p.actions.indexOf('admit') >= 0) Object.keys(p.roles).forEach(function (rid) {
        var role = p.roles[rid], c = s.chars[personId];
        var requirements = common + ' ' + FB.T('Minimum age {minimum}; current age {current}.', {
          minimum:role.minAge, current:FB.ageOf(c, s.date.year) }) + ' ' +
          (role.unmarried ? FB.T('This role requires remaining unmarried.') : FB.T('This role adds no marriage restriction.'));
        if (role.sexes.length) requirements += ' ' + FB.T('Permitted sex: {sex}.', {
          sex:role.sexes.map(function (sex) { return sex === 'f' ? FB.T('Female') : FB.T('Male'); }).join(', ') });
        Object.keys(role.skills).forEach(function (skill) { requirements += ' ' + FB.T('{skill}: {minimum} required; {current} now.', {
          skill:FB.T(FB.SKILL_NAMES[skill]), minimum:role.skills[skill], current:c.skills[skill] || 0 }); });
        if (role.professions.length) requirements += ' ' + FB.T('Required existing work: {careers}.', {
          careers:role.professions.map(function (id) { return FB.dataText(s, personId, 'career', id, FBDATA.careers[id], 'name', {}); }).join(', ') });
        if (role.affiliationId) requirements += ' ' + FB.T('Required affiliation: {name}.', { name:affiliationName(s, role.affiliationId) });
        if (def.provinceId) requirements += ' ' + FB.T('Residence required at {place}.', { place:FB.world.byId[def.provinceId].name });
        add(iid, FB.T('Review {role}', { role:roleName(s, snap, rid) }), actor, 'admit', { roleId:rid }, requirements);
      });
      if (p.actions.indexOf('affiliate') >= 0) p.affiliationIds.forEach(function (aid) {
        add(iid, FB.T('Review affiliation: {name}', { name:affiliationName(s, aid) }), actor, 'affiliate', { affiliationId:aid }, common);
      });
      (s.chars[personId].religiousAffiliations || []).forEach(function (aff) {
        if (aff.institutionId === iid && p.actions.indexOf('withdraw') >= 0)
          add(iid, FB.T('Withdraw from {name}', { name:affiliationName(s, aff.id) }), actor, 'withdraw', { affiliationId:aff.id }, common);
      });
      if (active && p.actions.indexOf('withdraw') >= 0) add(iid, FB.T('Review leaving this community'), actor, 'withdraw', {},
        FB.T('Leaving ends this membership and its bound affiliations. The institution, household and property remain. A held office becomes vacant.'));
      if (p.selection) Object.keys(snap.members).sort().forEach(function (cid) {
        if (!FB.religiousInstitutionOfficeEligible(s, iid, cid)) return;
        var target = { kind:'character', id:cid };
        if (p.actions.indexOf('assent') >= 0) add(iid, FB.T('Assent to {name}', { name:s.chars[cid].name }), actor,
          'assent', { decision:'appoint', subject:target }, FB.T('Your qualified assent counts only for this candidate and current control.'));
        var chooser = p.selection.policy === 'patron' && personId === s.player.charId ?
          { kind:'realm', id:FB.realmIdForRulerCharacter(s, personId) || 'player' } : actor;
        if (p.actions.indexOf('appoint') >= 0) add(iid, FB.T('Review appointing {name}', { name:s.chars[cid].name }), chooser, 'appoint', { candidateId:cid },
          FB.T('Selection reuses the canonical spiritual office. It grants no county ownership or public appointment.'));
      });
      if (holder && holder.id === personId && p.actions.indexOf('vacate') >= 0)
        add(iid, FB.T('Review resignation'), actor, 'vacate', {}, FB.T('The canonical office becomes vacant; its property remains.'));
      var subject = { kind:'character', id:s.player.charId }, pid = scope.indexOf(s.player.provinceId) >= 0 ? s.player.provinceId : scope[0];
      if (p.actions.indexOf('assent') >= 0 && p.actions.indexOf('recognize') >= 0)
        add(iid, FB.T('Assent to local recognition'), actor, 'assent', { decision:'recognize', subject:subject },
          FB.T('Assent concerns this person, this institution and current control. It does not change doctrinal standing.'));
      ['recognize','mediate'].forEach(function (action) {
        if (p.actions.indexOf(action) >= 0 && p.recognition.sources.length && pid)
          add(iid, action === 'mediate' ? FB.T('Review local mediation') : FB.T('Review local recognition'), actor, action,
            { subject:subject, provinceId:pid, source:p.recognition.sources[0] },
            FB.T('Qualified support is scoped to the named county. Worship protection and current consent are checked again.'));
      });
      snap.recognitions.forEach(function (r) {
        if (r.status !== 'active' || p.actions.indexOf('dispute') < 0) return;
        if (p.actions.indexOf('assent') >= 0) add(iid, FB.T('Assent to disputing recognition'), actor, 'assent',
          { decision:'dispute', subject:r.subject }, FB.T('A dispute needs the same declared constituency and quorum.'));
        add(iid, FB.T('Review disputing recognition'), actor, 'dispute',
          { subject:r.subject, provinceId:r.scope.id, source:r.source, recognitionId:r.id },
          FB.T('Dispute revokes this scoped support only. It removes no people or property.'));
      });
      h += '</section>';
    });
    h += '</div>';
    UI.openModal(FB.T('Religious communities'), h, { modalClass:'fullsheet-modal',
      titleDetailsHtml:'<p>' + esc(FB.T('Membership, spiritual leadership and public authority are separate. Every decision is reviewed before acceptance.')) + '</p>' });
    var list = SH.$('gm-body').querySelector('[data-religious-list]');
    SH.$('religious-person').onchange = function () { UI.showReligiousInstitutions({ personId:this.value }); };
    (view.expanded || []).forEach(function (id) {
      var detail = SH.$(id), toggle = list.querySelector('[aria-controls="' + id + '"]');
      if (detail && toggle) { detail.classList.remove('hidden'); toggle.setAttribute('aria-expanded', 'true'); }
    });
    list.scrollTop = view.scrollTop || 0;
    SH.$('gm-body').scrollTop = view.bodyScroll || 0;
    if (view.focusId && SH.$(view.focusId)) SH.$(view.focusId).focus({ preventScroll:true });
    list.querySelectorAll('[data-religious-review]').forEach(function (button) {
      button.onclick = function () {
        var entry = entries[Number(button.dataset.religiousReview)], q = entry.quote;
        var expanded = [];
        list.querySelectorAll('.settcard-details:not(.hidden)').forEach(function (detail) { expanded.push(detail.id); });
        var pos = { personId:personId, scrollTop:list.scrollTop, bodyScroll:SH.$('gm-body').scrollTop,
          focusId:button.id, expanded:expanded };
        function back() { UI.showReligiousInstitutions(pos); }
        var snap = FB.religiousInstitutionSnapshot(s, q.institutionId), payer = q.payer && s.realms[q.payer];
        var facts = kv(FB.T('Institution'), FB.localInstitutionName(q.institutionId, s)) +
          kv(FB.T('Participant'), s.chars[personId].name) + kv(FB.T('Decision'), entry.label) +
          kv(FB.T('Cost on acceptance'), FB.money(q.cost, s)) +
          kv(FB.T('Payer'), !q.cost ? FB.T('No payment') : q.payer === 'player' ? FB.T('Your available funds') : payer ? payer.name : FB.T('No payment')) +
          kv(FB.T('Required assent'), q.consent.required) + kv(FB.T('Current assent'), q.consent.characterIds.length) +
          kv(FB.T('Leadership'), snap.holderId ? s.chars[snap.holderId].name : FB.T('Vacant')) +
          '<p>' + esc(FB.T('People, their primary faith and existing property remain. Membership grants no public powers.')) + '</p>';
        if (q.terms.roleId) {
          var r = snap.profile.roles[q.terms.roleId];
          facts += kv(FB.T('Role'), roleName(s, snap, q.terms.roleId)) + kv(FB.T('Minimum age'), r.minAge) +
            kv(FB.T('Household restriction'), r.unmarried ? FB.T('Unmarried while a member') : FB.T('Marriage permitted by this role'));
        }
        UI.openModal(entry.label, SH.reviewFactsCard(FB.T('Exact decision terms'), facts) +
          SH.reviewActionsHtml(SH.reviewActionCardHtml({ id:'religious-confirm', label:FB.T('Confirm decision'),
            disabled:!q.allowed, warn:!q.allowed, note:q.allowed ? FB.T('Qualification, control, consent and funds are checked again.') : reason(q.reason) })),
          { modalClass:'fullsheet-modal', historyView:true, historyBack:true, historyBackRender:back });
        SH.$('religious-confirm').onclick = function () {
          var success = s === FB.state && FB.religiousInstitutionApply(s, q);
          UI.openModal(success ? FB.T('Decision recorded') : FB.T('Terms changed'), SH.reviewFactsCard('',
            esc(success ? FB.T('The local decision is recorded.') : FB.T('Review the current terms again. Nothing was spent.'))) +
            '<button class="actionbtn" type="button" id="religious-continue">' + esc(FB.T('Continue')) + '</button>', { replaceView:true });
          SH.$('religious-continue').onclick = function () { SH.modalHistoryBack(back); };
          if (SH.markActionsDirty) SH.markActionsDirty();
        };
      };
    });
  };
  function rentReason(code) {
    return { property:FB.T('An actual privately held settlement and its current rent charter are required.'),
      jurisdiction:FB.T('The see or competent temporal court lacks current jurisdiction or recognition.'),
      principal:FB.T('A living, available possessor distinct from the bishop is required.'),
      actor:FB.T('This decision belongs to the other party or the competent temporal ruler.'),
      closed:FB.T('This review is closed or already current.'),
      stale:FB.T('The proposal, principals or charter changed. Request a fresh review.'),
      funds:FB.T('The possessor’s private account cannot fund this compensation.')
    }[code] || FB.T('Review the current terms again.');
  }
  function rentStatus(snap) {
    var r = snap.record;
    if (!r) return FB.T('Existing charter; no claim filed');
    if (r.status === 'settled') {
      var period = Math.floor(FB.state.turn / 90);
      return period >= r.terms.endSeason ? FB.T('Composition expired; ordinary charter resumes') :
        period < r.terms.startSeason ? FB.T('Agreed; begins next season') :
        snap.effective ? FB.T('Composition in force') : FB.T('Composition suspended; original jurisdiction or holding changed');
    }
    if (snap.stale) return FB.T('Principals or charter changed; fresh review required');
    return { demanded:FB.T('Claim asserted; charter remains in force'), contested:FB.T('Evidence contested; no judgment'),
      proposed:FB.T('Agreement offered; awaiting the other party'), enforcement:FB.T('Temporal enforcement requested'),
      abandoned:FB.T('Claim abandoned; ordinary charter retained'), declined:FB.T('Agreement declined; ordinary charter retained'),
      rejected:FB.T('Enforcement refused; ordinary charter retained') }[r.status];
  }
  function rentPeople(s,snap) {
    var seen = {}, html = '';
    [[snap.bishopId,FB.T('Canonical bishop')],[snap.possessorId,FB.T('Current private possessor')],
      [snap.courtId,FB.T('Competent temporal ruler')]].forEach(function (entry) {
      var c = s.chars[entry[0]];
      if (c && !seen[c.id]) { html += SH.reviewPersonHtml(c,entry[1],null); seen[c.id] = true; }
    });
    return SH.reviewPeopleHtml(html);
  }
  function rentFacts(s,snap) {
    var p = FBDATA.episcopalClaims[snap.profileId], r = snap.record, t = r && r.terms;
    var sites = FB.world.sitesByProv[snap.provinceId], site = sites && sites.list[snap.settlement];
    var facts = rentPeople(s,snap) + kv(FB.T('Holding'),site ? site.name : FB.world.byId[snap.provinceId].name) +
      kv(FB.T('Status'),rentStatus(snap)) + kv(FB.T('Evidence'),snap.source ?
        FB.T('The recorded settlement grant and its current rent charter') : FB.T('No current charter')) +
      kv(FB.T('Dispute'),r && r.adjudicated ? FB.T('The competent temporal court composed the recorded rent.') :
        r && r.status === 'settled' && r.disputed ? FB.T('The parties composed the disputed rent by agreement.') :
        r && r.disputed ? FB.T('The possessor contests the asserted evidence. A temporal hearing is required for an imposed composition.') : FB.T('No objection recorded')) +
      kv(FB.T('Ordinary rent'),FB.T('{share}% of this holding’s ordinary tax and toll base each season', { share:snap.baselineShare * 100 })) +
      kv(FB.T('Negotiated rent'),FB.T('{share}% each season for {seasons} seasons, beginning next season', {
        share:snap.offeredShare * 100, seasons:p.termSeasons })) +
      kv(FB.T('Alternative compensation'),FB.T('{money:amount} once, replacing rent for {seasons} seasons beginning next season', {
        amount:p.compensation, seasons:p.termSeasons })) +
      kv(FB.T('Payer'),FB.T('The current possessor’s private household or barony account')) +
      kv(FB.T('Private funds available'),FB.money(snap.funds,s)) +
      kv(FB.T('Payee'),s.realms[snap.realmId] ? s.realms[snap.realmId].name : FB.T('The institutional see')) +
      kv(FB.T('Receiving account'),FB.T('The see’s public treasury; the bishop’s private purse receives nothing')) +
      kv(FB.T('Review and court fees'),FB.T('No fee; no arrears are asserted'));
    if (t) facts += kv(FB.T('Proposed immediate transfer'),FB.money(t.cost,s)) +
      kv(FB.T('Proposed seasonal rent'),FB.T('{share}% of the same rent base', { share:t.share * 100 })) +
      (r.status === 'proposed' ? kv(FB.T('Offer expires'),FB.T('In {days} days', { days:Math.max(0,t.offeredTurn + p.offerDays - s.turn) })) :
        kv(FB.T('Term remaining'),FB.T('{seasons} seasons', { seasons:Math.max(0,t.endSeason - Math.max(t.startSeason,Math.floor(s.turn / 90))) })));
    return SH.reviewFactsCard(FB.T('Exact rent and accounts'),facts);
  }
  UI.showEpiscopalClaims = function (view) {
    var s = FB.state, C = FB.episcopalClaims, entries = [], snaps = C.list(s,s.player.charId);
    view = view || {}; FB.game.setPaused(true);
    var h = '<div data-episcopal-list data-modal-scroll>';
    var labels = { demand:FB.T('Request a fresh rent review'), contest:FB.T('Contest the evidence'),
      recurring:FB.T('Propose recurring rent'), compensation:FB.T('Propose compensation'),
      accept:FB.T('Accept the offered agreement'), decline:FB.T('Decline the agreement'),
      abandon:FB.T('Abandon this claim'), request_enforcement:FB.T('Seek temporal enforcement'),
      adjudicate:FB.T('Adjudicate a rent composition'), reject_enforcement:FB.T('Refuse enforcement') };
    var consequences = {
      demand:FB.T('Record the existing charter for review. This asserts no arrears, awards no title and charges no money.'),
      contest:FB.T('Record the possessor’s objection. The assertion is not a judgment; the ordinary charter remains in force.'),
      recurring:FB.T('Offer the disclosed reduced seasonal rent. The other party may accept, contest or decline. Payment continues through the ordinary rent account, once per season.'),
      compensation:FB.T('Offer the disclosed private payment for a finite rent-free term. The transfer occurs only on acceptance, to the institutional public treasury.'),
      accept:FB.T('Bind only this holding’s future rent for the disclosed term. Existing land, buildings, military service and unrelated obligations remain with their owners.'),
      decline:FB.T('Close this proposed agreement without payment. The existing charter remains in force.'),
      abandon:FB.T('Withdraw this assertion without transferring property or forgiving an invented debt. The existing charter remains in force.'),
      request_enforcement:FB.T('Ask the actual temporal ruler to review the recorded charter. The ruler can refuse. Spiritual rank supplies no temporal jurisdiction.'),
      adjudicate:FB.T('As the competent temporal ruler, review the recorded grant and impose the disclosed finite rent composition. This resolves the civil rent only and creates no religious guilt, custody or confiscation.'),
      reject_enforcement:FB.T('Refuse this enforcement request. No money or property is taken; the ordinary charter remains in force.')
    };
    snaps.forEach(function (snap) {
      var p = FBDATA.episcopalClaims[snap.profileId], r = snap.record, actions = '';
      h += '<section><h4>' + esc(FB.dataText(s,s.player.charId,'episcopalClaim',snap.profileId,p,'name',{})) + '</h4>' +
        '<p>' + esc(FB.dataText(s,s.player.charId,'episcopalClaim',snap.profileId,p,'desc',{})) + '</p>' + rentFacts(s,snap);
      var choices = !r || snap.stale ? ['demand'] :
        ['demanded','contested','proposed'].indexOf(r.status) >= 0 ?
          ['contest','recurring','compensation','accept','decline','abandon','request_enforcement'] :
          r.status === 'enforcement' ? ['adjudicate','reject_enforcement','abandon'] : [];
      choices.forEach(function (action) {
        var q = C.quote(s,snap.profileId,snap.settlement,s.player.charId,action);
        if (!q || q.reason === 'actor') return;
        var index = entries.length; entries.push({ q:q, label:labels[action], details:consequences[action], snap:snap });
        actions += SH.reviewActionCardHtml({ id:'rent-' + snap.profileId + '-' + snap.settlement + '-' + action,
          label:labels[action],disabled:!q.allowed,warn:!q.allowed,
          note:q.allowed ? action === 'compensation' || action === 'accept' && q.cost ?
            FB.T('On acceptance: {money:amount} from the possessor to the see.', { amount:q.cost }) :
            FB.T('No immediate payment; only the disclosed future rent can change.') : rentReason(q.reason),
          details:'<p>' + esc(consequences[action]) + '</p>',data:{ rentReview:index } });
      });
      h += SH.reviewActionsHtml(actions) + '</section>';
    });
    if (!snaps.length) h += '<p>' + esc(FB.T('No supported rent claim concerns this household or office.')) + '</p>';
    var pastoral = !!FB.bishopricSnapshot(s,s.chars[s.player.charId]);
    if (pastoral) ['visit_diocese','ecclesiastical_court'].forEach(function (id) {
      var status = FB.instantStatus(s,id,{ pastoralOnly:true });
      h += SH.reviewActionCardHtml({ id:'rent-pastoral-' + id,label:id === 'visit_diocese' ?
        FB.T('Make the ordinary pastoral circuit') : FB.religiousCases.entry(s) ? FB.T('Review named ecclesiastical cases') : FB.T('Hear the ordinary ecclesiastical court'),
        disabled:!status.can, warn:!status.can, note:status.can ? id === 'ecclesiastical_court' && FB.religiousCases.entry(s) ?
          FB.T('No fee or day spent; review actual accusations and lawful judgments.') : FB.T('1 day; ordinary cooldown and event choices apply.') : status.reason,
        data:{ rentPastoral:id } });
    });
    h += '</div>';
    UI.openModal(FB.T('Episcopal rent claims'),h,{ modalClass:'fullsheet-modal',historyView:!!view.parentHistory,historyBack:!!view.parentHistory,
      titleDetailsHtml:'<p>' + esc(FB.T('This review concerns an existing temporal settlement rent, not every church building or a private estate claim.')) + '</p><p>' +
        esc(FB.T('Agreements follow the exact holding through inheritance and remain institutional through episcopal succession. Changed jurisdiction suspends the concession; its fixed term continues to expire.')) + '</p>' });
    var body = SH.$('gm-body'), list = body.querySelector('[data-episcopal-list]');
    function restore() {
      if (!document.body.contains(list)) return;
      body.scrollTop = view.bodyScroll || 0; list.scrollTop = view.scroll || 0;
      var focus = view.focus && SH.$(view.focus);
      if (!focus && view.focusPrefix) Array.from(list.querySelectorAll('[data-rent-review]')).some(function (button) {
        if (button.id.indexOf(view.focusPrefix) !== 0) return false;
        focus = button; return true;
      });
      if (focus) focus.focus({ preventScroll:true });
    }
    (view.details || []).forEach(function (id) { var n = list.querySelector('[aria-controls="' + id + '"]'); if (n) n.click(); });
    restore(); setTimeout(restore,0);
    list.querySelectorAll('[data-rent-pastoral]').forEach(function (button) {
      button.onclick = function () { UI.closeModal(); FB.runInstant(s,button.getAttribute('data-rent-pastoral'),{ pastoralOnly:true }); };
    });
    list.querySelectorAll('[data-rent-review]').forEach(function (button) {
      button.onclick = function () {
        var entry = entries[Number(button.getAttribute('data-rent-review'))], q = entry.q;
        var pos = { scroll:list.scrollTop,bodyScroll:body.scrollTop,focus:button.id,
          focusPrefix:'rent-' + q.profileId + '-' + q.settlement + '-',
          details:Array.from(list.querySelectorAll('.settcard-info[aria-expanded="true"]')).map(function (n) { return n.getAttribute('aria-controls'); }) };
        function back() { UI.showEpiscopalClaims(pos); }
        UI.openModal(entry.label,rentFacts(s,entry.snap) + SH.reviewActionsHtml(SH.reviewActionCardHtml({
          id:'rent-confirm',label:FB.T('Confirm decision'),disabled:!q.allowed,warn:!q.allowed,
          note:entry.details })),{ modalClass:'fullsheet-modal',historyView:true,historyBack:true,historyBackRender:back });
        SH.$('rent-confirm').onclick = function () {
          var success = s === FB.state && C.apply(s,q);
          if (success) C.respond(s,q.profileId,q.settlement);
          var current = C.snapshot(s,q.profileId,q.settlement);
          UI.openModal(success ? FB.T('Rent decision recorded') : FB.T('Terms changed'),rentFacts(s,current) +
            SH.reviewFactsCard('',esc(success ? FB.T('The recorded result is shown above. No land or unrelated right changed hands.') :
              FB.T('The review changed. Nothing was spent; review the current terms again.'))) +
            '<button class="actionbtn" type="button" id="rent-continue">' + esc(FB.T('Continue')) + '</button>',{ replaceView:true });
          SH.$('rent-continue').onclick = function () { SH.modalHistoryBack(back); };
          if (SH.markActionsDirty) SH.markActionsDirty();
        };
      };
    });
  };
})();

/* Named proceedings use the same retained review components as civil claims. */
(function () {
  'use strict';
  var UI = FB.ui, SH = UI._shared;
  function esc(v) { return FB.esc(String(v)); }
  function kv(k,v) { return SH.kv(k,esc(v)); }
  function labels() {
    return {charge:FB.T('Open a named prosecution'),dismiss:FB.T('Dismiss this matter'),challenge:FB.T('Challenge the evidence'),
      defend:FB.T('Present a defense'),settlement:FB.T('Offer a financial settlement'),accept:FB.T('Accept the settlement'),
      decline:FB.T('Decline the settlement'),refuse:FB.T('Refuse lawful process'),arrest:FB.T('Seek lawful custody'),
      submit:FB.T('Submit to the court'),penance:FB.T('Impose public penance'),imprison:FB.T('Impose imprisonment'),
      refer:FB.T('Refer to the secular authority'),accept_referral:FB.T('Accept secular enforcement'),
      reject_referral:FB.T('Refuse secular enforcement'),confiscate:FB.T('Confiscate only the named {term:fief}'),
      enforce:FB.T('Apply the secular sentence'),close_stale:FB.T('Close the interrupted proceeding')};
  }
  function statuses() {
    return {charged:FB.T('Accused; no judgment'),offered:FB.T('Settlement offered'),referred:FB.T('Awaiting secular decision'),
      accepted:FB.T('Secular enforcement accepted'),dismissed:FB.T('Dismissed without penalty'),vindicated:FB.T('Successful defense; no penalty'),
      settled:FB.T('Settlement paid'),penance:FB.T('Penance imposed'),imprisoned:FB.T('Prison term imposed'),
      confiscated:FB.T('Named fief confiscated'),enforced:FB.T('Secular sentence imposed'),interrupted:FB.T('Interrupted; no judgment')};
  }
  function recipient(s,p,snap) {
    var id = p.settlementRecipient === 'victim' ? snap.victimId : snap.principals.courtRealmId;
    return p.settlementRecipient === 'victim' ? s.chars[id] ? FB.fullName(s.chars[id]) : FB.T('The recorded victim is unavailable') :
      s.realms[id] ? s.realms[id].name : FB.T('The competent secular treasury');
  }
  function facts(s,snap,chosen) {
    var p = FBDATA.religiousCases[snap.profileId], r = snap.record, x = r ? r.principals : snap.principals;
    var people = '', seen = {};
    [[snap.defendantId,FB.T('Defendant')],[snap.victimId,FB.T('Recorded victim')],
      [x.bishopId,FB.T('Canonical bishop')],[x.courtId,FB.T('Competent temporal ruler')]].forEach(function (entry) {
      var c = s.chars[entry[0]];
      if (c && !seen[c.id]) { people += SH.reviewPersonHtml(c,entry[1],null); seen[c.id] = true; }
    });
    var a = chosen || r && r.asset, site = a && FB.world.sitesByProv[a.provinceId] && FB.world.sitesByProv[a.provinceId].list[a.settlement];
    var t = r && (r.offer || r.paid), custody = FB.justiceCustodyOf(s,snap.defendantId);
    var body = SH.reviewPeopleHtml(people) + kv(FB.T('Cause'),FB.dataText(s,s.player.charId,'religiousCase',snap.profileId,p,'name',{})) +
      kv(FB.T('Status'),r ? statuses()[r.status] : FB.T('Eligible recorded matter; no prosecution opened')) +
      kv(FB.T('Accusation'),snap.accusation.kind === 'abduction' ? FB.T('A recorded abduction of the identified cleric') : FB.T('A recorded killing of the identified cleric')) +
      kv(FB.T('Evidence'),snap.accusation.evidence === 'testimony' ? FB.T('Testimony') : snap.accusation.evidence === 'material' ? FB.T('Material evidence') : FB.T('Caught in the act')) +
      kv(FB.T('Actual private funds'),FB.money(snap.account.gold,s)) +
      kv(FB.T('Court fee on settlement'),FB.T('{money:fee} to the see’s institutional treasury',{fee:p.fee})) +
      kv(FB.T('Settlement'),t ? FB.money(t.amount,s) : FB.T('{share}% of available private funds, capped at {money:cap}',{share:p.settlementShare * 100,cap:p.settlementMax})) +
      kv(FB.T('Settlement recipient'),recipient(s,p,snap)) +
      kv(FB.T('Bishop’s private purse'),FB.T('Receives nothing')) +
      kv(FB.T('Selected property'),a ? site ? site.name : FB.world.byId[a.provinceId].name : FB.T('No asset selected; confiscation unavailable')) +
      (a ? kv(FB.T('Property recipient'),s.realms[a.recipientRealmId].name) : '') +
      kv(FB.T('Custody'),custody ? FB.T('Held by the identified court; sentence eligibility is checked separately') : FB.T('No actual custody; imprisonment and confiscation are unavailable')) +
      kv(FB.T('Review and dismissal'),FB.T('No payment or day spent; dismissal leaves money, piety and property untouched'));
    if (r && r.offer) body += kv(FB.T('Offer expires'),FB.T('In {days} days',{days:Math.max(0,r.offer.turn + p.offerDays - s.turn)}));
    if (r) body += kv(FB.T('Popular support change'),FB.T('Last decision in this {term:county}: {amount}',{amount:r.lastSupport}));
    if (snap.stale) body += kv(FB.T('Interrupted process'),FB.T('A principal, jurisdiction, local presence or recorded fact changed. Close this proceeding without a new penalty.'));
    body += '<p>' + esc(FB.dataText(s,s.player.charId,'religiousCase',snap.profileId,p,'desc',{})) + '</p>';
    return SH.reviewFactsCard(FB.T('Violence against clergy'),body);
  }
  function note(s,q,snap) {
    if (!q.allowed) return {
      actor:FB.T('This decision belongs to the other participant.'),custody:FB.T('The competent court does not hold this defendant.'),
      funds:FB.T('The actual private funds or named receiving account cannot meet these terms.'),
      asset:FB.T('The exact recorded delegated {term:fief} is unavailable.'),severity:FB.T('The applicable law does not justify this judgment.'),
      spent:FB.T('This response has already been recorded.'),offer:FB.T('No current offer can be accepted.'),
      stale:FB.T('The proceeding is closed or its reviewed facts have changed.'),jurisdiction:FB.T('The bishop or temporal court lacks current jurisdiction.'),
      location:FB.T('The defendant is no longer local.'),cause:FB.T('No eligible unjudged matter supports this prosecution.')
    }[q.reason] || FB.T('The current authority, custody or procedure prevents this decision.');
    if (q.terms) return FB.T('{money:fee} to the see and {money:amount} to {recipient}, only on acceptance; no day spent.',
      {fee:q.terms.fee,amount:q.terms.amount,recipient:recipient(s,FBDATA.religiousCases[q.profileId],snap)});
    if (q.action === 'challenge' || q.action === 'defend') return FB.T('{chance}% chance of dismissal without penalty; one defense of this matter.',{chance:Math.round(q.chance * 100)});
    if (q.action === 'arrest') return FB.T('{chance}% chance of actual custody. Existing authority, protection, truce and resistance rules apply.',{chance:Math.round(q.projection.chance * 100)});
    if (q.action === 'penance') return FB.T('The recorded sentence removes {piety} piety and {prestige} prestige, releases custody and closes this matter. Popular support loss: 2.',
      {piety:FBDATA.justiceSentences[q.projection.sentence].pietyCost || 40,prestige:FBDATA.justiceSentences[q.projection.sentence].prestigeCost || 20});
    if (q.projection && ['imprison','enforce'].indexOf(q.action) >= 0) return FB.T('Apply {sentence}; custody ends in {days} days when a prison term applies. Popular support loss: 2.',
      {sentence:FB.dataText(s,s.player.charId,'justiceSentence',q.projection.sentence,FBDATA.justiceSentences[q.projection.sentence],'name',{}),days:q.projection.endTurn === null ? 0 : q.projection.endTurn - s.turn});
    return {charge:FB.T('Record only the identified accusation and selected asset; no payment, custody or guilt is imposed.'),
      dismiss:FB.T('Close only this matter and release its provisional custody, without a penalty.'),
      decline:FB.T('Reject the offer without payment; the accusation still requires resolution.'),
      refuse:FB.T('Popular support loss: 3 in this {term:county}, with political standing loss. Refusal supplies no new finding of guilt.'),
      submit:FB.T('Enter provisional custody through the canonical court. No sentence is imposed by submission.'),
      refer:FB.T('The actual secular authority may accept or refuse; no property or money transfers on referral.'),
      accept_referral:FB.T('Accept jurisdiction over the same matter. The enforcing court must obtain its own actual custody.'),
      reject_referral:FB.T('Return the matter to the bishop. Popular support loss: 1; relations between distinct courts worsen by 5.'),
      confiscate:FB.T('Return only this delegated {term:fief} to its named temporal realm, then release custody. Private plots, businesses and other grants remain untouched. Popular support loss: 2.'),
      close_stale:FB.T('Close the interrupted matter without payment, confiscation or an inherited accusation.') }[q.action] || '';
  }
  UI.showReligiousCases = function (view) {
    view = view || {};
    var s = FB.state, R = FB.religiousCases, names = labels(), entries = [], snaps = R.list(s,s.player.charId);
    FB.game.setPaused(true);
    var h = '<div data-religious-cases data-modal-scroll>';
    snaps.forEach(function (snap) {
      var r = snap.record, choices = !r ? ['charge'] : snap.stale ? ['close_stale'] :
        r.status === 'referred' ? ['accept_referral','reject_referral','dismiss'] :
        r.status === 'accepted' ? ['arrest','submit','confiscate','enforce'] :
        ['charged','offered'].indexOf(r.status) >= 0 ? ['dismiss','challenge','defend','settlement','accept','decline','refuse','arrest','submit','penance','imprison','refer'] : [];
      var rowId = 'religious-' + snap.offenseId, actions = '';
      function add(action,slot) {
        var q = R.quote(s,snap.profileId,snap.offenseId,s.player.charId,action,slot);
        if (!q || q.reason === 'actor' || !r && !q.allowed) return;
        var index = entries.length, label = slot ? FB.T('Open a prosecution concerning this {term:fief}') : names[action];
        var chosen = q.asset, site = chosen && FB.world.sitesByProv[chosen.provinceId].list[chosen.settlement];
        entries.push({q:q,snap:snap,label:label,note:note(s,q,snap),rowId:rowId});
        actions += SH.reviewActionCardHtml({id:rowId + '-' + action + (slot || ''),label:label,disabled:!q.allowed,warn:!q.allowed,
          note:(site ? site.name + ' · ' : '') + note(s,q,snap),details:'<p>' + esc(note(s,q,snap)) + '</p>',data:{religiousReview:index}});
      }
      choices.forEach(function (action) { add(action,null); });
      if (!r) snap.assets.forEach(function (a) { add('charge',a.settlement); });
      h += '<section id="' + rowId + '" tabindex="-1">' + facts(s,snap) + SH.reviewActionsHtml(actions) + '</section>';
    });
    if (!snaps.length) h += '<p>' + esc(FB.T('No supported local accusation is recorded. Faith, wealth and rank alone establish no offense.')) + '</p>';
    if (FB.episcopalClaims.entry(s,'ecclesiastical_court')) h += '<button class="actionbtn" id="religious-civil">' + esc(FB.T('Review separate civil rent claims')) + '</button>';
    h += '</div>';
    UI.openModal(FB.T('Named ecclesiastical cases'),h,{modalClass:'fullsheet-modal',historyView:!!view.parentHistory,historyBack:!!view.parentHistory,
      titleDetailsHtml:'<p>' + esc(FB.T('Examine a recorded attack on a cleric. An accusation permits a hearing, not a presumption of guilt. Only the temporal court can enforce a secular sentence or recover the named delegated {term:fief}.')) + '</p><p>' + esc(FB.T('This discipline court examines recorded violence against Christian clergy. It grants no jurisdiction over every faith. Penance does not grant papal absolution. Heresy, other religious accusations and private-property confiscation are unsupported.')) + '</p>'});
    var body = SH.$('gm-body'), list = body.querySelector('[data-religious-cases]');
    function restore() {
      if (!document.body.contains(list)) return;
      body.scrollTop = view.bodyScroll || 0;
      var focus = SH.$(view.focus || '') || SH.$(view.rowId || '');
      if (focus) focus.focus({preventScroll:true});
    }
    (view.details || []).forEach(function (id) { var n = list.querySelector('[aria-controls="' + id + '"]'); if (n) n.click(); });
    restore(); setTimeout(restore,0);
    var civil = SH.$('religious-civil');
    if (civil) civil.onclick = function () { UI.showEpiscopalClaims({parentHistory:true}); };
    list.querySelectorAll('[data-religious-review]').forEach(function (button) {
      button.onclick = function () {
        var e = entries[Number(button.getAttribute('data-religious-review'))], q = e.q;
        var pos = {bodyScroll:body.scrollTop,focus:button.id,rowId:e.rowId,
          details:Array.from(list.querySelectorAll('.settcard-info[aria-expanded="true"]')).map(function (n) { return n.getAttribute('aria-controls'); })};
        function back() { UI.showReligiousCases(pos); }
        UI.openModal(e.label,facts(s,e.snap,q.asset) + SH.reviewActionsHtml(SH.reviewActionCardHtml({
          id:'religious-confirm',label:FB.T('Confirm decision'),note:e.note,disabled:!q.allowed,warn:!q.allowed})),
          {modalClass:'fullsheet-modal',historyView:true,historyBack:true,historyBackRender:back});
        SH.$('religious-confirm').onclick = function () {
          var ok = s === FB.state && R.apply(s,q);
          if (ok) R.respond(s,q.profileId,q.offenseId);
          var current = R.snapshot(s,q.profileId,q.offenseId);
          UI.openModal(ok ? FB.T('Court decision recorded') : FB.T('Terms changed'),facts(s,current) +
            '<p>' + esc(ok ? FB.T('The recorded result is shown above.') : FB.T('Nothing was spent. Review the current terms again.')) + '</p>' +
            '<button class="actionbtn" id="religious-continue">' + esc(FB.T('Continue')) + '</button>',{replaceView:true});
          SH.$('religious-continue').onclick = function () { SH.modalHistoryBack(back); };
          if (SH.markActionsDirty) SH.markActionsDirty();
        };
      };
    });
  };
})();
