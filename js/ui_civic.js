/* Civic reviews use the shared cards and retained modal navigation. */
(function () {
  'use strict';
  var UI = FB.ui, SH = UI._shared, V = FB.civicGovernment, C = FB.governments.support;
  function esc(v) { return FB.esc(String(v)); }
  function kv(label,value) { return SH.kv(label,esc(value)); }
  function reason(id) {
    var labels = {
      missing_person:FB.T('That person is unavailable.'), not_local:FB.T('Local residence is required.'),
      minor:FB.T('The declared adult age is required.'), not_free:FB.T('A free household member is required.'),
      service:FB.T('Complete the declared public service.'), skills:FB.T('The declared effective skills are required.'),
      qualification:FB.T('This person does not meet the office’s declared qualification.'), membership:FB.T('Admission to the civic institution is required separately.'),
      unavailable:FB.T('Captivity or exile prevents holding this office.'), already_holds_office:FB.T('This person already holds another magistracy.'),
      no_vacancy:FB.T('The current office remains occupied.'), already_nominated:FB.T('The candidate is already nominated or the slate is full.'),
      funds:FB.T('The nomination fee is unaffordable.'), reserve:FB.T('The public reserve must remain funded.'),
      occupied:FB.T('Military occupation prevents this public act.'), no_mandate:FB.T('The declared executive quorum is unavailable.'),
      withheld:FB.T('The required civic interests withhold assent.'), constituency_unresolved:FB.T('A represented interest is unavailable.'),
      unjustified:FB.T('Removal requires present evidence of neglect, overreach or ineligibility.'),
      outside_scope:FB.T('These terms exceed the institution’s public powers.'), partner_withheld:FB.T('The other polity withholds assent or cannot fund this commitment.'),
      source_assigned:FB.T('These receipts are already assigned.'), commitment_limit:FB.T('An existing commitment must end first.'),
      existing_dues:FB.T('Current extraordinary dues remain in force.'), inactive_institution:FB.T('This institution is no longer governing.'),
      existing_obligations:FB.T('Resolve existing war, public appointments or service contracts before changing this constitution.')
    };
    return labels[id] || FB.T('Review the current terms again.');
  }
  function officeName(s,rid,o) {
    var p = V.profile(s,rid), def = p.offices.filter(function (d) { return d.id === o.id; })[0];
    return FB.dataText(s,s.player.charId,'civicOffice',V.row(s,rid).profileId + '.' + o.id,def,'name',{});
  }
  function rightName(kind) { return { quarter:FB.T('Foreign quarter'),warehouse:FB.T('Warehouse right'),jurisdiction:FB.T('Scoped jurisdiction'),
    revenue_share:FB.T('Assigned public receipts'),commercial:FB.T('Commercial agreement') }[kind] || FB.T('Foreign right'); }
  function conversionPropertyFacts(s,rid,captured) {
    var household = captured ? captured.household : s.player, economy = captured ? captured.finance : s.economy;
    var authority = captured ? captured.authority : s.authority, turn = captured ? captured.turn : s.turn;
    var scopes = captured ? captured.electorate.scopes : FB.realmHeldCounties(s,rid);
    var loans = economy ? FB.financeActiveLoans(s,economy) : [];
    var html = kv(FB.T('Public counties retained'),scopes.map(function (pid) { return FB.world.byId[pid].name; }).join(', ')) +
      kv(FB.T('Household land plots retained'),(household.landPlots || []).length) +
      kv(FB.T('Household enterprises retained'),(household.enterprises || []).length) +
      kv(FB.T('Household debt retained'),FB.money(loans.reduce(function (n,loan) { return n + FB.financeDueNow(s,loan,economy); },0),s));
    loans.forEach(function (loan) { html += kv(FB.T('Household obligation {id}',{ id:loan.id }),
      FB.T('{money:amount}; due in {days} days',{ amount:FB.financeDueNow(s,loan,economy),days:Math.max(0,loan.dueTurn - turn) })); });
    var rights = (authority && authority.rights || []).filter(function (right) {
      return right.status === 'active' && (right.issuer && right.issuer.id === rid || right.beneficiary && right.beneficiary.id === rid);
    });
    html += kv(FB.T('Public rights retained'),rights.length);
    rights.slice(0,12).forEach(function (right) {
      var power = { ban:FB.T('Military command'),peace:FB.T('Public jurisdiction'),revenue:FB.T('Public receipts'),consent:FB.T('Reserved consent') }[right.power] || FB.T('Public authority');
      var scope = right.scope && (FB.world.byId[right.scope.id] || s.realms[right.scope.id]);
      html += kv(power,scope ? scope.name : FB.T('Existing scoped grant'));
    });
    return html;
  }
  UI.showCivicConstitution = function (rid,view) {
    var s = FB.state; view = view || {};
    var profiles = Object.keys(FBDATA.civicProfiles), profileId = profiles.indexOf(view.profileId) >= 0 ? view.profileId : profiles[profiles.length - 1];
    var p = FBDATA.civicProfiles[profileId], cp = FBDATA.constituencyProfiles[p.constituency], scopes = FB.realmHeldCounties(s,rid);
    var people = Object.keys(s.chars).filter(function (cid) { var c = s.chars[cid];
      return !c.dead && scopes.indexOf(cid === s.player.charId ? s.player.provinceId : c.homeProvinceId) >= 0;
    }).sort().slice(0,64);
    var nominees = p.offices.map(function (o,i) { return view.nominees && people.indexOf(view.nominees[i]) >= 0 ? view.nominees[i] : people[i] || null; });
    function select(id,label,values,current,name) {
      return '<label for="' + id + '">' + esc(label) + '</label><select class="field" id="' + id + '">' + values.map(function (value) {
        return '<option value="' + esc(value) + '"' + (value === current ? ' selected' : '') + '>' + esc(name(value)) + '</option>';
      }).join('') + '</select>';
    }
    var html = select('civic-profile',FB.T('Proposed constitution'),profiles,profileId,function (id) {
      return FB.dataText(s,s.player.charId,'civicProfile',id,FBDATA.civicProfiles[id],'name',{});
    });
    p.offices.forEach(function (o,i) { html += select('civic-founder-' + i,FB.dataText(s,s.player.charId,'civicOffice',profileId + '.' + o.id,o,'name',{}),people,nominees[i],function (cid) { return s.chars[cid].name; }); });
    var q = V.conversionQuote(s,rid,{ profileId:profileId,incumbents:nominees });
    html += SH.reviewFactsCard(FB.T('Current institution'),kv(FB.T('Polity'),s.realms[rid].name) + kv(FB.T('Current ruler'),s.realms[rid].ruler.name) +
      kv(FB.T('Public treasury'),FB.money(FB.treasuryAvailable(s,rid),s)) + kv(FB.T('Household money'),FB.money(s.player.gold,s)) +
      kv(FB.T('Minimum age'),cp.eligibility.minAge) + kv(FB.T('Required service'),FB.T('{years} years',{ years:cp.eligibility.minServiceYears })) +
      conversionPropertyFacts(s,rid)) +
      SH.reviewActionCardHtml({ id:'civic-conversion-review',label:FB.T('Review constitution'),disabled:!q || !q.allowed,
        note:q && q.allowed ? FB.T('No charge; current rule and unanimous founding assent are reviewed.') : reason(q && q.reason),
        details:'<p>' + esc(FB.T('Existing public rights, household property, treasury and family records retain their owners. No historical foreign concession is awarded. War, active public commissions and service contracts require settlement first.')) + '</p>' });
    UI.openModal(FB.T('Civic constitution'),'<div data-modal-scroll>' + html + '</div>',{ modalClass:'fullsheet-modal' });
    var body = SH.$('gm-body'); body.scrollTop = view.scroll || 0;
    if (view.focus && SH.$(view.focus)) SH.$(view.focus).focus({ preventScroll:true });
    function position() { return { profileId:SH.$('civic-profile').value,nominees:p.offices.map(function (o,i) { return SH.$('civic-founder-' + i).value; }),
      scroll:body.scrollTop,focus:document.activeElement && document.activeElement.id }; }
    SH.$('civic-profile').onchange = function () { var pos = position(); delete pos.nominees; UI.showCivicConstitution(rid,pos); };
    p.offices.forEach(function (o,i) { SH.$('civic-founder-' + i).onchange = function () { UI.showCivicConstitution(rid,position()); }; });
    SH.$('civic-conversion-review').onclick = function () {
      var pos = position(); function back() { UI.showCivicConstitution(rid,pos); }
      var facts = kv(FB.T('Current ruler'),q.stamp.realm.ruler.name) + kv(FB.T('Public treasury'),FB.money(q.stamp.realm.treasury ? q.stamp.realm.treasury.gold : 0,s)) +
        kv(FB.T('Household money'),FB.money(q.stamp.household.gold,s)) + conversionPropertyFacts(s,rid,q.stamp) +
        kv(FB.T('Foreign concessions'),FB.T('No opening concession is created'));
      q.candidates.forEach(function (candidate) { facts += SH.reviewPeopleHtml(SH.reviewPersonHtml(s.chars[candidate.characterId],FB.T('Founding nominee'),null)); });
      UI.openModal(FB.T('Review constitution'),SH.reviewFactsCard(FB.T('Exact decision terms'),facts) + '<button class="actionbtn" type="button" id="civic-convert">' + esc(FB.T('Confirm constitution')) + '</button>',
        { modalClass:'fullsheet-modal',historyView:true,historyBack:true,historyBackRender:back });
      SH.$('civic-convert').onclick = function () {
        var success = s === FB.state && V.convert(s,q);
        UI.openModal(success ? FB.T('Constitution adopted') : FB.T('Terms changed'),'<p>' + esc(success ? FB.T('The civic institution now holds public authority. Your household keeps its property.') : FB.T('Review current terms again. Nothing was spent.')) + '</p>' +
          '<button class="actionbtn" type="button" id="civic-conversion-continue">' + esc(FB.T('Continue')) + '</button>',{ replaceView:true });
        SH.$('civic-conversion-continue').onclick = function () { SH.modalHistoryBack(success ? function () { UI.showCivicGovernment(rid); } : back); };
        if (SH.markActionsDirty) SH.markActionsDirty();
      };
    };
  };
  UI.showCivicGovernment = function (rid,view) {
    var s = FB.state, r = V.row(s,rid), p = V.profile(s,rid), cp = C.profile(s,rid);
    if (!r || !p || !cp) return;
    view = view || {};
    var entries = [], cards = '', actions = '', electorate = '', rights = '';
    function add(label,q,apply,details) {
      if (!q) return;
      var index = entries.length; entries.push({ label:label,q:q,apply:apply });
      actions += SH.reviewActionCardHtml({ id:'civic-action-' + index,label:label,disabled:!q.allowed,warn:!q.allowed,
        note:q.allowed ? FB.T('Immediate cost: {money:amount}.',{ amount:q.cost || q.charge || 0 }) : reason(q.reason),
        details:'<p>' + esc(details) + '</p>',data:{ civicReview:index } });
    }
    var facts = kv(FB.T('Institution'),s.realms[rid].name) + kv(FB.T('Constitution'),FB.dataText(s,s.player.charId,'civicProfile',r.profileId,p,'name',{})) + kv(FB.T('Public treasury'),FB.money(FB.treasuryAvailable(s,rid),s)) +
      kv(FB.T('Household money'),FB.money(s.player.gold,s)) + kv(FB.T('Public reserve'),FB.money(cp.obligations.reserve,s)) +
      kv(FB.T('Minimum age'),cp.eligibility.minAge) + kv(FB.T('Required service'),FB.T('{years} years',{ years:cp.eligibility.minServiceYears })) +
      kv(FB.T('Required skills'),Object.keys(cp.eligibility.skills).map(function (k) { return FB.T('{skill}: {value}',{ skill:FB.skillName(k),value:cp.eligibility.skills[k] }); }).join(', ')) +
      kv(FB.T('Office qualification'),{ m:FB.T('Male candidates'),f:FB.T('Female candidates'),any:FB.T('All candidates') }[p.eligibility.sex]) +
      kv(FB.T('Civic membership'),p.eligibility.membership ? r.citizens.indexOf(s.player.charId) >= 0 ? FB.T('Admitted') : FB.T('Separate admission required') : FB.T('Residence and qualification')) +
      kv(FB.T('Executive policy'),{ chief:FB.T('Chief magistrate'),majority:FB.T('Majority of magistrates'),unanimous:FB.T('All magistrates') }[p.executive]) +
      kv(FB.T('Vacancy administration'),FB.T('Civic interests retain ordinary administration and public property'));
    r.offices.forEach(function (o) {
      var c = V.incumbent(s,rid,o.id), def = p.offices.filter(function (d) { return d.id === o.id; })[0];
      var content = (c ? SH.reviewPeopleHtml(SH.reviewPersonHtml(c,FB.T('Public incumbent'),'civic-person-' + o.id)) : '') +
        kv(FB.T('Office'),officeName(s,rid,o)) + kv(FB.T('Status'),c ? FB.T('Occupied') : FB.T('Vacant or suspended')) +
        kv(FB.T('Tenure'),def.termDays === null ? FB.T('Life tenure; no family inheritance') : FB.T('{days} days',{ days:def.termDays })) +
        kv(FB.T('Remaining term'),o.endTurn === null ? FB.T('No scheduled expiry') : FB.T('{days} days',{ days:Math.max(0,o.endTurn - s.turn) })) +
        kv(FB.T('Seasonal salary'),FB.T('Up to {money:amount} from public funds',{ amount:def.salary })) +
        kv(FB.T('Your eligibility'),V.eligible(s,rid,s.player.charId,o.id).allowed ? FB.T('Eligible') : reason(V.eligible(s,rid,s.player.charId,o.id).reason));
      if (o.vacancy && o.vacancy.status === 'open') content += kv(FB.T('Nominations'),o.vacancy.nominations.map(function (cid) { return s.chars[cid].name; }).join(', ') || FB.T('None'));
      cards += SH.reviewFactsCard(officeName(s,rid,o),content);
      if (o.vacancy && o.vacancy.status === 'open') {
        add(FB.T('Seek office: {office}',{ office:officeName(s,rid,o) }),V.officeQuote(s,rid,o.id,'nominate',{ candidateId:s.player.charId }),V.officeApply,
          FB.T('The personal nomination fee buys no office or membership. Civic support and qualification decide selection.'));
        add(FB.T('Review selection: {office}',{ office:officeName(s,rid,o) }),V.officeQuote(s,rid,o.id,'recognize',{}),V.officeApply,
          FB.T('The declared civic interests assess the current slate. A selected magistrate gains a public mandate; household station and property stay separate.'));
      }
      if (c && c.id === s.player.charId) add(FB.T('Resign: {office}',{ office:officeName(s,rid,o) }),V.officeQuote(s,rid,o.id,'resign',{ characterId:c.id }),V.officeApply,
        FB.T('The public office becomes vacant. Your enterprises, household money and family remain yours.'));
      if (o.incumbentId) ['neglect','overreach','ineligible'].forEach(function (cause) {
        var q = V.officeQuote(s,rid,o.id,'remove',{ reason:cause });
        if (q.allowed) add(FB.T('Review lawful removal: {office}',{ office:officeName(s,rid,o) }),q,V.officeApply,
          FB.T('The declared civic assent and present evidence end this mandate. Public rights and private property survive.'));
      });
    });
    if (p.eligibility.membership && r.citizens.indexOf(s.player.charId) < 0) add(FB.T('Seek civic admission'),
      V.officeQuote(s,rid,p.offices[0].id,'admit',{ candidateId:s.player.charId }),V.officeApply,
      FB.T('Admission requires qualification and civic assent. Wealth alone does not establish membership or award office.'));
    C.members(s,rid).forEach(function (m) {
      var def = cp.members.filter(function (d) { return d.id === m.id; })[0];
      electorate += kv(FB.dataText(s,s.player.charId,'constituencyMember',p.constituency + '.' + m.id,def,'name',{}),FB.T('Influence {weight}',{ weight:m.weight }));
    });
    var peers = Object.keys(s.realms).filter(function (id) { return id !== rid && s.realms[id].alive && FB.treasuryCounterparty(s,id); }).sort();
    var partner = peers.indexOf(view.partner) >= 0 ? view.partner : peers[0];
    var foreignCounties = Object.keys(s.holder).filter(function (pid) { return s.holder[pid] === partner && s.owner[pid] === partner; }).sort();
    var county = foreignCounties.indexOf(view.county) >= 0 ? view.county : foreignCounties[0];
    function selector(id,label,values,current,names) {
      return '<label for="' + id + '">' + esc(label) + '</label><select class="field" id="' + id + '">' + values.map(function (v) {
        return '<option value="' + esc(v) + '"' + (v === current ? ' selected' : '') + '>' + esc(names(v)) + '</option>';
      }).join('') + '</select>';
    }
    var selects = selector('civic-partner',FB.T('Other polity'),peers,partner,function (id) { return s.realms[id].name; }) +
      selector('civic-county',FB.T('Foreign county'),foreignCounties,county,function (pid) { return FB.world.byId[pid].name; });
    var publicActor = r.offices.some(function (o) { var c = V.incumbent(s,rid,o.id); return c && c.id === s.player.charId; });
    if (publicActor) {
      add(FB.T('Review extraordinary dues'),V.proposalQuote(s,rid,'extraordinary_tax',{ amount:Math.min(5,cp.obligations.maxDues),duration:90 }),V.proposalApply,
        FB.T('The additional seasonal public receipts last 90 days and require civic assent. They never enter a magistrate’s private wallet.'));
      if (partner) add(FB.T('Review public borrowing'),V.proposalQuote(s,rid,'pledge',{ lenderRealmId:partner,amount:Math.min(20,cp.obligations.maxDues * 5),interest:0.1,duration:360 }),V.proposalApply,
        FB.T('The lender pays the city’s public treasury. Repayment includes the quoted interest after 360 days. Household property is not collateral.'));
      if (partner && county) ['quarter','jurisdiction','revenue_share'].forEach(function (kind) {
        add(FB.T('Review right: {right}',{ right:rightName(kind) }),V.proposalQuote(s,rid,'treaty',{
          kind:kind,grantorRealmId:partner,provinceId:county,settlement:0,share:kind === 'revenue_share' ? 0.2 : 0,duration:360,price:5 }),V.proposalApply,
          FB.T('The city pays the host polity once. This is a limited right in one settlement for 360 days. The host retains its county and inhabitants. Assigned receipts are deducted from that settlement’s public revenue.'));
      });
      if (partner && county) add(FB.T('Review public campaign'),V.warQuote(s,rid,{ causes:[{ type:'aggression',enemy:partner,target:county }] }),V.launchWar,
        FB.T('Civic interests and the executive must assent. This begins an ordinary campaign; troops, equipment, travel and upkeep use their existing paid rules.'));
      FB.realmWars(s,rid).forEach(function (war) { add(FB.T('Review white peace'),V.peaceQuote(s,rid,{ warId:war.id }),V.makePeace,
        FB.T('Both polities must accept the current terms. This ends the named campaign through the ordinary peace settlement.')); });
      if (partner) C.row(s,rid).scopes.filter(function (pid) { return pid !== s.realms[rid].capital; }).forEach(function (pid) {
        add(FB.T('Review county grant: {county}',{ county:FB.world.byId[pid].name }),V.proposalQuote(s,rid,'grant',{ provinceId:pid,recipientId:partner }),V.proposalApply,
          FB.T('This permanent public grant transfers the named county’s sovereignty and public holder to the accepting polity. Private households and enterprises retain their owners.'));
      });
      r.debts.filter(function (d) { return d.status === 'active'; }).forEach(function (d) {
        add(FB.T('Review public repayment'),V.proposalQuote(s,rid,'repay',{ debtId:d.id }),V.proposalApply,
          FB.T('The city pays its actual outstanding public debt. The household wallet pays nothing.'));
      });
    }
    r.rights.forEach(function (right) {
      var site = FB.settlementsOf(s,right.provinceId)[right.settlement];
      rights += kv(rightName(right.kind),(site ? site.name : FB.world.byId[right.provinceId].name) + ', ' + s.realms[right.grantorRealmId].name) +
        kv(FB.T('Current right'),V.rightEffective(s,rid,right) ? FB.T('Effective') : FB.T('Inactive')) +
        kv(FB.T('Public receipt share'),FB.T('{percent}%',{ percent:Math.round(right.share * 100) }));
      if (publicActor && ['active','suspended'].indexOf(right.status) >= 0) add(FB.T('Review surrender of right'),V.proposalQuote(s,rid,'revoke',{ rightId:right.id }),V.proposalApply,
        FB.T('Only this institution-owned right ends. The host’s sovereignty and private household enterprises remain.'));
      if (publicActor && right.status === 'suspended') add(FB.T('Review renewed recognition'),V.proposalQuote(s,rid,'renew',{ rightId:right.id }),V.proposalApply,
        FB.T('Recognition requires the original host’s restored control and fresh assent; an expired right cannot be renewed by this review.'));
    });
    UI.openModal(FB.T('Civic government'),'<div data-civic-list data-modal-scroll>' + SH.reviewFactsCard(FB.T('Public institution'),facts) +
      cards + SH.reviewFactsCard(FB.T('Represented civic interests'),electorate) + SH.reviewFactsCard(FB.T('Foreign rights'),rights || esc(FB.T('No foreign rights'))) +
      SH.reviewFactsCard(FB.T('Proposal counterpart'),selects) + SH.reviewActionsHtml(actions) + '</div>',
      { modalClass:'fullsheet-modal',titleDetailsHtml:'<p>' + esc(FB.T('Political influence, qualification and proposal numbers are simulation rules. Public office, family property, the city treasury and foreign sovereignty have independent owners.')) + '</p>' });
    var body = SH.$('gm-body'), list = body.querySelector('[data-civic-list]');
    function position() { return { partner:SH.$('civic-partner').value,county:SH.$('civic-county').value,
      scroll:list.scrollTop,bodyScroll:body.scrollTop,focus:document.activeElement && document.activeElement.id,
      details:Array.from(list.querySelectorAll('.settcard-info[aria-expanded="true"]')).map(function (n) { return n.getAttribute('aria-controls'); }) }; }
    (view.details || []).forEach(function (id) { var n = list.querySelector('[aria-controls="' + id + '"]'); if (n) n.click(); });
    list.scrollTop = view.scroll || 0; body.scrollTop = view.bodyScroll || 0;
    if (view.focus && SH.$(view.focus)) SH.$(view.focus).focus({ preventScroll:true });
    SH.$('civic-partner').onchange = function () { var v = position(); delete v.county; UI.showCivicGovernment(rid,v); };
    SH.$('civic-county').onchange = function () { UI.showCivicGovernment(rid,position()); };
    r.offices.forEach(function (o) { var button = SH.$('civic-person-' + o.id), c = V.incumbent(s,rid,o.id); if (button && c) button.onclick = function () { UI.showCharModal(c.id); }; });
    list.querySelectorAll('[data-civic-review]').forEach(function (button) {
      button.onclick = function () {
        var entry = entries[Number(button.getAttribute('data-civic-review'))], q = entry.q, pos = position();
        function back() { UI.showCivicGovernment(rid,pos); }
        var detail = kv(FB.T('Immediate cost'),FB.money(q.cost || q.charge || 0,s));
        var other = q.terms.grantorRealmId || q.terms.lenderRealmId || q.terms.recipientId || q.partnerId;
        if (other) detail += kv(FB.T('Other polity'),s.realms[other].name);
        if (q.terms.provinceId) detail += kv(FB.T('County'),FB.world.byId[q.terms.provinceId].name);
        if (q.terms.settlement !== undefined) detail += kv(FB.T('Settlement'),FB.settlementsOf(s,q.terms.provinceId)[q.terms.settlement].name);
        if (q.terms.kind) detail += kv(FB.T('Right'),rightName(q.terms.kind));
        if (q.terms.causes) q.terms.causes.forEach(function (cause) { detail += kv(FB.T('Campaign objective'),FB.world.byId[cause.target].name + ', ' + s.realms[cause.enemy].name); });
        if (q.war) detail += kv(FB.T('Campaign'),s.realms[q.war.attacker].name + ', ' + s.realms[q.war.defender].name);
        if (q.terms.amount !== undefined) detail += kv(FB.T('Public amount'),FB.money(q.terms.amount,s));
        if (q.terms.duration) detail += kv(FB.T('Duration'),FB.T('{days} days',{ days:q.terms.duration }));
        if (q.terms.interest !== undefined) detail += kv(FB.T('Repayment'),FB.money(q.terms.amount * (1 + q.terms.interest),s));
        if (q.terms.share !== undefined) detail += kv(FB.T('Receipt share'),FB.T('{percent}%',{ percent:Math.round(q.terms.share * 100) }));
        var cid = q.selectedId || q.terms.candidateId || q.terms.characterId;
        if (cid && s.chars[cid]) detail = SH.reviewPeopleHtml(SH.reviewPersonHtml(s.chars[cid],FB.T('Participant'),null)) + detail;
        var ballots = q.ballots && q.ballots.length ? q.ballots : q.decision && q.decision.ballots || [];
        ballots.forEach(function (b) { var def = cp.members.filter(function (m) { return m.id === b.memberId; })[0];
          detail += kv(FB.dataText(s,s.player.charId,'constituencyMember',p.constituency + '.' + b.memberId,def,'name',{}),b.assent ? FB.T('Assent') : FB.T('Withheld')); });
        UI.openModal(entry.label,SH.reviewFactsCard(FB.T('Exact decision terms'),detail) + SH.reviewActionsHtml(SH.reviewActionCardHtml({
          id:'civic-confirm',label:FB.T('Confirm decision'),note:FB.T('Current office, civic interests, resources and exact terms are checked again.'),
          details:'<p>' + esc(FB.T('A changed review applies no charge or public authority.')) + '</p>' })),
          { modalClass:'fullsheet-modal',historyView:true,historyBack:true,historyBackRender:back });
        SH.$('civic-confirm').onclick = function () {
          var success = s === FB.state && entry.apply(s,q);
          UI.openModal(success ? FB.T('Decision recorded') : FB.T('Terms changed'),SH.reviewFactsCard('',
            '<p>' + esc(success ? FB.T('The civic decision is recorded.') : FB.T('Review current terms again. Nothing was spent.')) + '</p>') +
            '<button class="actionbtn" type="button" id="civic-continue">' + esc(FB.T('Continue')) + '</button>',{ replaceView:true });
          SH.$('civic-continue').onclick = function () { SH.modalHistoryBack(back); };
          if (SH.markActionsDirty) SH.markActionsDirty();
        };
      };
    });
  };
})();
