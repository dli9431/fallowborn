/* Retained shared government review; spiritual and temporal facts stay distinct. */
(function () {
  'use strict';
  var UI = FB.ui, SH = UI._shared, E = FB.ecclesiasticalGovernment;
  function esc(v) { return FB.esc(String(v)); }
  function kv(k,v) { return SH.kv(k,esc(v)); }
  function reason(id) {
    return {
      occupied:FB.T('The institution does not control this jurisdiction.'),
      vacancy:FB.T('The canonical spiritual office is vacant.'),
      recognition:FB.T('The selected incumbent still needs temporal recognition.'),
      chapter:FB.T('The chapter has not assented to the current government.'),
      canonical_election:FB.T('Selection belongs to the existing religious election.'),
      qualification:FB.T('The candidate must meet the declared spiritual office requirements and reside at the see.'),
      occupied_office:FB.T('The spiritual office already has an incumbent.'),
      no_incumbent:FB.T('Only the current incumbent may resign.'),
      no_cause:FB.T('Removal requires loss of the canonical office qualification.'),
      funds:FB.T('The public treasury cannot pay this cost while retaining its reserve.'),
      rights:FB.T('The declared institution rights do not permit this decision.'),
      consent:FB.T('The required members have not assented.'),
      unavailable:FB.T('The religious community is unavailable at this place or date.'),
      lay_refusal:FB.T('The lay superior cannot or will not recognize these temporal rights.'),
      already_recognized:FB.T('No new temporal recognition is required.'),
      different_incumbent:FB.T('The current territorial ruler must already be the canonical spiritual incumbent.'),
      outside_scope:FB.T('Resolve occupation, war, subordinate courts or an existing managed constitution first.'),
      missing_binding:FB.T('A valid spiritual office, institution and temporal scope are required.'),
      duplicate_binding:FB.T('This spiritual office already binds another temporal government.'),
      withheld:FB.T('The existing government withholds consent.')
    }[id] || FB.T('Review the current terms again.');
  }
  function powerName(id) { return { revenue:FB.T('Public receipts'),peace:FB.T('Local jurisdiction'),defence:FB.T('Local defence'),levy:FB.T('Military service') }[id] || id; }
  E.conversionBindings = function (s,rid) {
    var ruler = FB.realmRulerCharacterSnapshot(s,rid), out = [], defs = FB.localInstitutionDefinitions(s);
    if (!ruler || E.active(s,rid)) return out;
    Object.keys(FB.religiousOffices(s)).forEach(function (id) {
      var o = FB.religiousOffices(s)[id], holder = FB.religiousOfficeSnapshot(s,id), localId = null;
      if (o.head.local) Object.keys(defs).some(function (key) { if (defs[key].officeId === id) { localId = key; return true; } return false; });
      var c = o.head.succession === 'papal_election' ? holder && holder.id === rid && FB.papalOfficeIncumbentSnapshot(s,id) : holder;
      if (!c || c.id !== ruler.id) return;
      Object.keys(FBDATA.ecclesiasticalProfiles).forEach(function (profileId) {
        var p = FBDATA.ecclesiasticalProfiles[profileId];
        if (p.source === 'papal_election' ? o.head.succession === 'papal_election' : !!o.head.local)
          out.push({ profileId:profileId,officeId:id,institutionId:localId });
      });
    });
    return out;
  };
  UI.showEcclesiasticalGovernment = function (rid,view) {
    var s = FB.state,r = E.row(s,rid),p = E.profile(s,rid),entries = [],facts = '',actions = '',people = '';
    view = view || {};
    function add(label,q,apply,details) {
      if (!q) return;
      var index = entries.length; entries.push({ label:label,q:q,apply:apply });
      actions += SH.reviewActionCardHtml({ id:'ecclesiastical-action-' + index,label:label,
        disabled:!q.allowed,warn:!q.allowed,note:q.allowed ? FB.T('Immediate cost: {money:amount}.',{ amount:q.cost }) : reason(q.reason),
        details:'<p>' + esc(details) + '</p>',data:{ ecclesiasticalReview:index } });
    }
    if (r && p) {
      var c = E.incumbent(s,rid),def = r.institutionId && FB.localInstitutionDefinitions(s)[r.institutionId];
      facts = kv(FB.T('Institution'),s.realms[rid].name) +
        kv(FB.T('Constitution'),FB.dataText(s,s.player.charId,'ecclesiasticalProfile',r.profileId,p,'name',{})) +
        kv(FB.T('Spiritual office'),def ? FB.localInstitutionName(r.institutionId,s) : FB.religiousHeadTitle(s,s.realms[rid].religion)) +
        kv(FB.T('Spiritual status'),c ? FB.T('Occupied') : FB.T('Vacant')) +
        kv(FB.T('Temporal status'),E.recognized(s,rid) ? FB.T('Recognized') : FB.T('Interim administration')) +
        kv(FB.T('Public treasury'),FB.money(FB.treasuryAvailable(s,rid),s)) + kv(FB.T('Public reserve'),FB.money(p.reserve,s)) +
        kv(FB.T('Household money'),FB.money(s.player.gold,s)) +
        kv(FB.T('Vacancy powers'),p.interim.map(powerName).join(', ')) +
        kv(FB.T('Chapter assent'),!p.chapter ? FB.T('Not separately required') : E.chapter(s,rid) ? FB.T('Assent') : FB.T('Withheld')) +
        kv(FB.T('Lay superior'),s.realms[rid].liege ? s.realms[s.realms[rid].liege].name : FB.T('None'));
      if (c) people = SH.reviewPeopleHtml(SH.reviewPersonHtml(c,FB.T('Canonical incumbent'),'ecclesiastical-person'));
      r.scope.forEach(function (pid) { facts += kv(FB.world.byId[pid].name,E.controlled(s,rid,pid) ? FB.T('Institutional public jurisdiction') : FB.T('Outside current temporal control')); });
      var rights = (s.authority.rights || []).filter(function (right) { return right.beneficiary && right.beneficiary.kind === 'realm' && right.beneficiary.id === rid && right.status === 'active'; });
      facts += kv(FB.T('Existing institutional rights'),rights.length) + kv(FB.T('Succession'),FB.T('Office and public property are not inherited by the incumbent’s household'));
      if (p.layRecognition) add(FB.T('Review temporal recognition'),E.review(s,rid,'recognize',{}),E.apply,
        FB.T('The lay superior recognizes public jurisdiction only. This neither elects nor consecrates a spiritual incumbent.'));
      if (p.source === 'local_office' || p.source === 'institution_profile') {
        add(FB.T('Review your appointment'),E.review(s,rid,'appoint',{ candidateId:s.player.charId }),E.apply,
          FB.T('The chapter, office qualification, residence and actual public funds are checked. Standing or wealth alone grants no spiritual office.'));
        if (c && c.id === s.player.charId) add(FB.T('Review resignation'),E.review(s,rid,'resign',
          p.source === 'institution_profile' ? {} : { characterId:c.id }),E.apply,
          FB.T('Resignation vacates the spiritual office. The institution retains its public property and obligations; your household retains its own possessions.'));
        if (!c) add(FB.T('Review removal of an ineligible holder'),E.review(s,rid,'remove',{}),E.apply,
          FB.T('Only a recorded holder who no longer meets the spiritual office requirements may be removed through this review.'));
      }
    } else {
      facts = kv(FB.T('Institution'),s.realms[rid].name) + kv(FB.T('Public treasury'),FB.money(FB.treasuryAvailable(s,rid),s));
      E.conversionBindings(s,rid).forEach(function (t) {
        var def = FBDATA.ecclesiasticalProfiles[t.profileId];
        add(FB.T('Review constitution: {name}',{ name:FB.dataText(s,s.player.charId,'ecclesiasticalProfile',t.profileId,def,'name',{}) }),
          E.conversionQuote(s,rid,t),E.convert,FB.T('Bind existing temporal jurisdiction to the current spiritual incumbent. No election, new person, property transfer or household confiscation takes place.'));
      });
    }
    UI.openModal(FB.T('Ecclesiastical government'),'<div data-ecclesiastical-list data-modal-scroll>' +
      SH.reviewFactsCard(FB.T('Office and temporal jurisdiction'),people + facts) + SH.reviewActionsHtml(actions) + '</div>',
      { modalClass:'fullsheet-modal',titleDetailsHtml:'<p>' + esc(FB.T('Religious office, temporal control, institutional property and private household property have separate authority. Military obligations still require ordinary troops, supplies and public funds.')) + '</p>' });
    var body = SH.$('gm-body'), list = body.querySelector('[data-ecclesiastical-list]');
    function position() { return { scroll:list.scrollTop,bodyScroll:body.scrollTop,focus:document.activeElement && document.activeElement.id,
      details:Array.from(list.querySelectorAll('.settcard-info[aria-expanded="true"]')).map(function (n) { return n.getAttribute('aria-controls'); }) }; }
    (view.details || []).forEach(function (id) { var n = list.querySelector('[aria-controls="' + id + '"]'); if (n) n.click(); });
    list.scrollTop = view.scroll || 0; body.scrollTop = view.bodyScroll || 0;
    if (view.focus && SH.$(view.focus)) SH.$(view.focus).focus({ preventScroll:true });
    var person = SH.$('ecclesiastical-person');
    if (person) person.onclick = function () { UI.showCharModal(E.incumbent(s,rid).id); };
    list.querySelectorAll('[data-ecclesiastical-review]').forEach(function (button) {
      button.onclick = function () {
        var entry = entries[Number(button.getAttribute('data-ecclesiastical-review'))],q = entry.q,pos = position();
        function back() { UI.showEcclesiasticalGovernment(rid,pos); }
        var binding = r || q.terms, institution = binding.institutionId && FB.localInstitutionDefinitions(s)[binding.institutionId];
        var detail = kv(FB.T('Institution'),s.realms[rid].name) +
          kv(FB.T('Spiritual office'),institution ? FB.localInstitutionName(binding.institutionId,s) : FB.religiousHeadTitle(s,s.realms[rid].religion)) +
          kv(FB.T('Public cost'),FB.money(q.cost,s)) + kv(FB.T('Household property'),FB.T('Retained by its existing owners'));
        var cid = q.terms.candidateId || q.terms.characterId || q.stamp.incumbent && q.stamp.incumbent.id || q.stamp.office && q.stamp.office.id;
        if (cid && s.chars[cid]) detail = SH.reviewPeopleHtml(SH.reviewPersonHtml(s.chars[cid],FB.T('Participant'),null)) + detail;
        (r ? r.scope : q.scopes).forEach(function (pid) { detail += kv(FB.T('County'),FB.world.byId[pid].name); });
        if (institution && institution.chapterId) detail += kv(FB.T('Chapter'),FB.localInstitutionName(institution.chapterId,s));
        if (s.realms[rid].liege) detail += kv(FB.T('Lay superior'),s.realms[s.realms[rid].liege].name);
        UI.openModal(entry.label,SH.reviewFactsCard(FB.T('Exact decision terms'),detail) +
          SH.reviewActionsHtml(SH.reviewActionCardHtml({ id:'ecclesiastical-confirm',label:FB.T('Confirm decision'),
            note:FB.T('Office, consent, control and public funds are checked again.') })),
          { modalClass:'fullsheet-modal',historyView:true,historyBack:true,historyBackRender:back });
        SH.$('ecclesiastical-confirm').onclick = function () {
          var success = s === FB.state && entry.apply(s,q);
          UI.openModal(success ? FB.T('Decision recorded') : FB.T('Terms changed'),SH.reviewFactsCard('',
            esc(success ? FB.T('The institutional decision is recorded.') : FB.T('Review current terms again. Nothing was spent.'))) +
            '<button class="actionbtn" type="button" id="ecclesiastical-continue">' + esc(FB.T('Continue')) + '</button>',{ replaceView:true });
          SH.$('ecclesiastical-continue').onclick = function () { SH.modalHistoryBack(back); };
          if (SH.markActionsDirty) SH.markActionsDirty();
        };
      };
    });
  };
})();
