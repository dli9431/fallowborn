/* Detached civic validation rejects invented offices, receipts and electors.
   Missing optional records in older campaigns stay missing on restore. */
(function () {
  'use strict';
  var V = FB.civicGovernment, G = FB.governments, C = G.support;
  function plain(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function keys(v,list) { return plain(v) && Object.keys(v).length === list.length && list.every(function (k) { return Object.prototype.hasOwnProperty.call(v,k); }); }
  function integer(n,min,max) { return Number.isSafeInteger(n) && n >= min && n <= max; }
  function unique(a,max) { return Array.isArray(a) && a.length <= max && new Set(a).size === a.length; }
  V.profileFaults = function (table,forms,constituencies) {
    var errors = []; table = table || FBDATA.civicProfiles; forms = forms || FBDATA.governmentForms;
    constituencies = constituencies || FBDATA.constituencyProfiles;
    Object.keys(table || {}).forEach(function (id) {
      var p = table[id], cp = p && constituencies[p.constituency];
      if (!/^[a-z][a-z0-9_]*$/.test(id) || !keys(p,['name','constituency','eligibility','executive','interim','offices','consent']) ||
          typeof p.name !== 'string' || !p.name || !cp || !keys(p.eligibility,['sex','membership']) ||
          ['m','f','any'].indexOf(p.eligibility.sex) < 0 || typeof p.eligibility.membership !== 'boolean' ||
          ['chief','majority','unanimous'].indexOf(p.executive) < 0 || p.interim !== 'council' ||
          !Array.isArray(p.offices) || !p.offices.length || p.offices.length > 8 || p.offices.some(function (o,i) {
            return !keys(o,['id','name','termDays','salary']) || typeof o.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(o.id) ||
              p.offices.slice(0,i).some(function (q) { return q.id === o.id; }) || typeof o.name !== 'string' || !o.name ||
              o.termDays !== null && !integer(o.termDays,90,7200) || !Number.isFinite(o.salary) || o.salary < 0 || o.salary > 100;
          }) || !keys(p.consent,['war','treaty','extraordinary_tax','pledge','grant','conversion']) ||
          Object.keys(p.consent).some(function (k) { return !Number.isFinite(p.consent[k]) || p.consent[k] <= 0.5 || p.consent[k] > 1; }))
        errors.push(FB.T('Invalid civic office profile {id}.',{ id:id }));
    });
    Object.keys(forms || {}).forEach(function (id) {
      if (!plain(forms[id])) return;
      var p = forms[id].civicProfileId;
      var succession = G.strategy('succession',forms[id].succession);
      if (succession && succession.civicLeadership ? !table[p] : p !== undefined)
        errors.push(FB.T('Invalid civic profile on government {id}.',{ id:id }));
    });
    return errors;
  };
  var validate = G.validate;
  G.validate = function () { return validate().concat(V.profileFaults()); };
  V.definitionFaults = function (d,formId,year,provinces) {
    var f = FBDATA.governmentForms[formId], strategy = f && G.strategy('succession',f.succession);
    if (!strategy || !strategy.civicLeadership) return d.civicProfileId !== undefined || d.civicRights !== undefined ? ['civic declarations require civic government'] : [];
    var p = FBDATA.civicProfiles[d.civicProfileId || f.civicProfileId], errors = [];
    if (!p || d.constituency !== p.constituency || d.royalCourt || d.liege) errors.push('invalid civic profile, constituency or hereditary court');
    var cp = p && FBDATA.constituencyProfiles[p.constituency], incumbent = d.ruler || d.representative;
    if (p && cp && incumbent && (incumbent.sex && p.eligibility.sex !== 'any' && incumbent.sex !== p.eligibility.sex ||
        incumbent.born !== undefined && year - incumbent.born < cp.eligibility.minAge)) errors.push('invalid opening civic incumbent qualification');
    if (d.civicRights !== undefined && (!Array.isArray(d.civicRights) || d.civicRights.length > 12 || d.civicRights.some(function (r) {
      return !keys(r,['kind','grantorRealmId','provinceId','settlement','share','duration','evidenceId']) ||
        ['quarter','warehouse','jurisdiction','commercial'].indexOf(r.kind) < 0 || typeof r.grantorRealmId !== 'string' || r.grantorRealmId === d.id ||
        !provinces.some(function (q) { return q.id === r.provinceId && !q.wasteland; }) || !integer(r.settlement,0,7) ||
        r.share !== 0 || r.duration !== null || typeof r.evidenceId !== 'string' || !r.evidenceId;
    }))) errors.push('invalid civic opening rights');
    return errors;
  };
  V.validate = function (s) {
    var bookmark = FB.campaignBookmark(s), roots = s.authority && s.authority.governments || {}, assigned = {};
    function fault() { throw new Error(FB.T('Invalid civic institution, office or foreign right in this save.')); }
    Object.keys(roots).forEach(function (rid) {
      var r = roots[rid].civic;
      if (r === undefined) {
        var strategy = FBDATA.governmentForms[roots[rid].formId], succession = strategy && G.strategy('succession',strategy.succession);
        if (succession && succession.civicLeadership) fault();
        return;
      }
      var p = r && FBDATA.civicProfiles[r.profileId], electorate = C.row(s,rid);
      var selectedForm = FBDATA.governmentForms[roots[rid].formId], selectedSuccession = selectedForm && G.strategy('succession',selectedForm.succession);
      if (!keys(r,['schema','institutionId','profileId','originFormId','serial','revision','offices','citizens','history','rights','debts','dues','overreach']) ||
          r.schema !== 1 || r.institutionId !== rid || !p || !selectedSuccession || !selectedSuccession.civicLeadership ||
          !s.realms[rid] || !bookmark || !electorate || electorate.profileId !== p.constituency ||
          r.originFormId !== null && (!FBDATA.governmentForms[r.originFormId] || G.strategy('succession',FBDATA.governmentForms[r.originFormId].succession).delegatedLeadership) ||
          !integer(r.serial,0,Number.MAX_SAFE_INTEGER) || !integer(r.revision,0,Number.MAX_SAFE_INTEGER) || typeof r.overreach !== 'boolean' ||
          !Array.isArray(r.offices) || r.offices.length !== p.offices.length || !unique(r.citizens,32) ||
          r.citizens.some(function (cid) { return typeof cid !== 'string' || !s.chars[cid]; }) ||
          !Array.isArray(r.history) || r.history.length > 12 || !Array.isArray(r.rights) || r.rights.length > 12 ||
          !Array.isArray(r.debts) || r.debts.length > 8 || electorate.mandate && electorate.mandate.status === 'active' ||
          electorate.selection && electorate.selection.status === 'open' ||
          electorate.decisions.some(function (d) { return d.status === 'approved'; }) ||
          electorate.agreements.some(function (a) { return a.endTurn > s.turn; }) || electorate.dues && electorate.dues.endTurn > s.turn) fault();
      var ids = {}, people = {};
      function recordId(id,kind) {
        var prefix = r.institutionId + ':' + kind + ':', tail = typeof id === 'string' && id.indexOf(prefix) === 0 ? id.slice(prefix.length) : '';
        return /^[1-9][0-9]*$/.test(tail) && integer(Number(tail),1,r.serial);
      }
      function claim(id,kind) { if (!recordId(id,kind) || ids[id]) fault(); ids[id] = true; }
      r.offices.forEach(function (o,i) {
        var def = p.offices[i];
        if (!keys(o,['id','generation','incumbentId','mandateId','startTurn','endTurn','vacancy','lastSalaryPeriod']) || o.id !== def.id ||
            !integer(o.generation,0,Number.MAX_SAFE_INTEGER) || !integer(o.lastSalaryPeriod,0,Math.floor(s.turn / 90))) fault();
        if (o.incumbentId !== null) {
          if (typeof o.incumbentId !== 'string' || !s.chars[o.incumbentId] || people[o.incumbentId] || !o.generation ||
              !integer(o.startTurn,0,s.turn) || (def.termDays === null ? o.endTurn !== null : o.endTurn !== o.startTurn + def.termDays)) fault();
          people[o.incumbentId] = true; claim(o.mandateId,'mandate');
        } else if (o.mandateId !== null || o.startTurn !== null || o.endTurn !== null) fault();
        var v = o.vacancy;
        if (!keys(v,['id','cause','generation','nominations','votes','status','resolvedId']) ||
            ['opening','death','resign','term_end','remove','ineligible'].indexOf(v.cause) < 0 || !integer(v.generation,0,o.generation) ||
            !unique(v.nominations,16) || v.nominations.some(function (cid) { return typeof cid !== 'string' || !s.chars[cid]; }) ||
            !plain(v.votes) || Object.keys(v.votes).some(function (id) { return !electorate.members.some(function (m) { return m.id === id; }) ||
              v.votes[id] !== null && v.nominations.indexOf(v.votes[id]) < 0; }) ||
            ['open','resolved'].indexOf(v.status) < 0 ||
            (v.status === 'open' ? o.incumbentId !== null || v.resolvedId !== null || v.generation !== o.generation :
              !o.incumbentId || v.resolvedId !== o.mandateId || v.generation + 1 !== o.generation || v.nominations.indexOf(o.incumbentId) < 0)) fault();
        claim(v.id,'selection');
        if (i === 0 && selectedSuccession && selectedSuccession.civicLeadership && o.generation !== FB.realmRulerGeneration(s,rid)) fault();
      });
      r.history.forEach(function (h) {
        if (!keys(h,['id','officeId','characterId','cause','turn']) || !p.offices.some(function (o) { return o.id === h.officeId; }) ||
            typeof h.characterId !== 'string' || !h.characterId || ['death','resign','term_end','remove','ineligible'].indexOf(h.cause) < 0 ||
            !integer(h.turn,0,s.turn)) fault(); claim(h.id,'mandate');
      });
      r.rights.forEach(function (right) {
        if (!keys(right,['id','kind','grantorRealmId','provinceId','settlement','share','startTurn','endTurn','status','evidenceId']) ||
            ['quarter','warehouse','jurisdiction','revenue_share','commercial'].indexOf(right.kind) < 0 || !s.realms[right.grantorRealmId] || right.grantorRealmId === rid ||
            !bookmark.provinces.some(function (q) { return q.id === right.provinceId; }) || !integer(right.settlement,0,7) ||
            !Number.isFinite(right.share) || right.share < 0 || right.share > 1 || (right.kind === 'revenue_share' ? !right.share : right.share !== 0) ||
            !integer(right.startTurn,0,s.turn) || right.endTurn !== null && (!integer(right.endTurn,right.startTurn + 90,right.startTurn + 7200)) ||
            ['active','suspended','expired','revoked'].indexOf(right.status) < 0 || right.evidenceId !== null && (typeof right.evidenceId !== 'string' || !right.evidenceId) ||
            right.endTurn === null && !right.evidenceId) fault();
        claim(right.id,'right');
        // Counties compile eight stable physical slots, including generated
        // sites. A right can survive subsequent loss of current visibility.
        if ((right.status === 'active' || right.status === 'suspended') && (right.endTurn === null || right.endTurn > s.turn)) {
          var key = right.grantorRealmId + ':' + right.provinceId + ':' + right.settlement;
          assigned[key] = (assigned[key] || 0) + right.share;
          if (assigned[key] > 1 + 0.000001) fault();
        }
      });
      r.debts.forEach(function (d) {
        if (!keys(d,['id','lenderRealmId','principal','remaining','interest','startTurn','dueTurn','status']) || !s.realms[d.lenderRealmId] || d.lenderRealmId === rid ||
            !Number.isFinite(d.principal) || d.principal <= 0 || d.principal > C.profile(s,rid).obligations.maxDues * 5 ||
            !Number.isFinite(d.interest) || d.interest < 0 || d.interest > 0.25 || !integer(d.startTurn,0,s.turn) || !integer(d.dueTurn,d.startTurn + 90,d.startTurn + 1440) ||
            ['active','paid'].indexOf(d.status) < 0 || d.remaining !== (d.status === 'paid' ? 0 : d.principal * (1 + d.interest))) fault();
        claim(d.id,'debt');
      });
      if (r.dues !== null) {
        var d = r.dues;
        if (!keys(d,['id','amount','startTurn','endTurn']) || !Number.isFinite(d.amount) || d.amount <= 0 || d.amount > C.profile(s,rid).obligations.maxDues ||
            !integer(d.startTurn,0,s.turn) || !integer(d.endTurn,d.startTurn + 1,d.startTurn + 360)) fault(); claim(d.id,'dues');
      }
    });
    return true;
  };
  var validateSupport = C.validate;
  C.validate = function (s) { validateSupport(s); return V.validate(s); };
})();
