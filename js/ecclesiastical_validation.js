/* Detached validation and explicit conversion. Restore never seeds an office. */
(function () {
  'use strict';
  var E = FB.ecclesiasticalGovernment, G = FB.governments;
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function plain(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function keys(v,list) { return plain(v) && Object.keys(v).length === list.length && list.every(function (k) { return Object.prototype.hasOwnProperty.call(v,k); }); }
  function list(v,allowed) { return Array.isArray(v) && new Set(v).size === v.length && v.every(function (k) { return allowed.indexOf(k) >= 0; }); }
  E.profileFaults = function (table) {
    var errors = []; table = table || FBDATA.ecclesiasticalProfiles;
    if (!plain(table)) return ['Invalid ecclesiastical profiles'];
    Object.keys(table).forEach(function (id) {
      var p = table[id];
      if (!/^[a-z][a-z0-9_]*$/.test(id) || !keys(p,['name','source','chapter','layRecognition','appointmentCost','recognitionCost','reserve','revenueRate','levyRate','interim','reserved','powers']) ||
          typeof p.name !== 'string' || !p.name || ['papal_election','local_office'].indexOf(p.source) < 0 ||
          typeof p.chapter !== 'boolean' || typeof p.layRecognition !== 'boolean' ||
          ['appointmentCost','recognitionCost','reserve'].some(function (k) { return !Number.isFinite(p[k]) || p[k] < 0 || p[k] > 1000; }) ||
          ['revenueRate','levyRate'].some(function (k) { return !Number.isFinite(p[k]) || p[k] < 0 || p[k] > 1; }) ||
          !list(p.interim,['revenue','peace','defence','levy']) || !list(p.reserved,['war','treaty','grant','extraordinary_tax','pledge']) ||
          !list(p.powers,['ban','peace','revenue']) ||
          p.source === 'local_office' && !p.chapter || p.source === 'papal_election' && p.chapter)
        errors.push(FB.T('Invalid ecclesiastical profile {id}.',{ id:id }));
    });
    return errors;
  };
  E.bindingFaults = function (t,definitions,offices) {
    var p = t && FBDATA.ecclesiasticalProfiles[t.profileId], d = t && definitions[t.institutionId], office = t && offices[t.officeId];
    if (!keys(t,['profileId','officeId','institutionId']) || !p || typeof t.officeId !== 'string' || !office) return ['invalid religious office reference'];
    if (p.source === 'papal_election') return t.institutionId !== null || office.head.succession !== 'papal_election' || office.head.holderKind !== 'realm' ? ['invalid canonical election binding'] : [];
    var chapter = d && definitions[d.chapterId];
    return !d || d.officeId !== t.officeId || !office.head.local || !chapter || chapter.officeId ||
      chapter.kind !== 'congregation' || chapter.provinceId !== d.provinceId ? ['invalid local office or chapter binding'] : [];
  };
  E.definitionFaults = function (d,formId,bookmark) {
    var form = FBDATA.governmentForms[formId], bound = form && (G.strategy('succession',form.succession) || {}).officeBound;
    if (!bound) return d.ecclesiastical !== undefined ? ['ecclesiastical binding requires institutional government'] : [];
    var defs = bookmark && bookmark.localInstitutions || FBDATA.localInstitutions || {},
      state = { start:{ id:bookmark && bookmark.id },realms:{},chars:{},faiths:{},faithRelations:{} };
    var offices = FB.religiousOffices(state), errors = E.bindingFaults(d.ecclesiastical,defs,offices);
    if (d.royalCourt || d.constituency || d.id === 'player') errors.push('institutional jurisdiction is not a hereditary household');
    var p = d.ecclesiastical && FBDATA.ecclesiasticalProfiles[d.ecclesiastical.profileId];
    if (p && p.layRecognition && !d.liege) errors.push('declared lay recognition requires a superior');
    if (d.ecclesiastical && bookmark && (bookmark.realms || []).some(function (other) {
      return other.id !== d.id && other.ecclesiastical && other.ecclesiastical.officeId === d.ecclesiastical.officeId;
    })) errors.push('a religious office cannot bind two temporal governments');
    return errors;
  };
  E.validate = function (s) {
    var roots = s.authority && s.authority.governments || {}, offices = FB.religiousOffices(s), seen = {};
    var bookmark = FB.campaignBookmark(s), provinces = bookmark && bookmark.provinces || [];
    function fault() { throw new Error(FB.T('Invalid ecclesiastical government or canonical office binding in this save.')); }
    Object.keys(s.realms || {}).forEach(function (rid) {
      var formId = roots[rid] && roots[rid].formId || s.start && s.start.defaultGovernment || 'territorial';
      var form = FBDATA.governmentForms[formId], rule = form && G.strategy('succession',form.succession);
      if (s.realms[rid].alive !== false && rule && rule.officeBound && !E.row(s,rid)) fault();
    });
    Object.keys(roots).forEach(function (rid) {
      if (!plain(roots[rid])) fault();
      var r = roots[rid].ecclesiastical, f = FBDATA.governmentForms[roots[rid].formId], active = f && G.strategy('succession',f.succession).officeBound;
      if (r === undefined) { if (active) fault(); return; }
      if (!active || rid === 'player' || !s.realms[rid] ||
          !keys(r,['schema','profileId','officeId','institutionId','scope','originFormId','temporalRecognitionId']) || r.schema !== 1 ||
          E.bindingFaults({ profileId:r.profileId,officeId:r.officeId,institutionId:r.institutionId },FB.localInstitutionDefinitions(s),offices).length ||
          seen[r.officeId] || !Array.isArray(r.scope) || !r.scope.length || r.scope.length > 128 || new Set(r.scope).size !== r.scope.length ||
          r.scope.some(function (id) { return typeof id !== 'string' || !provinces.some(function (p) { return p.id === id && !p.wasteland; }); }) ||
          r.originFormId !== null && !FBDATA.governmentForms[r.originFormId] ||
          r.institutionId !== null && (!s.localInstitutions || !s.localInstitutions[r.institutionId])) fault();
      seen[r.officeId] = true;
      var p = E.profile(s,rid), office = offices[r.officeId], holder = s.religiousHeads && s.religiousHeads[r.officeId];
      if (r.temporalRecognitionId !== null) {
        var proof = (s.authority.recognitions || []).filter(function (proof) { return proof.id === r.temporalRecognitionId; })[0];
        if (!p.layRecognition || !proof || proof.source !== 'imperial_commission' || proof.issuer.kind !== 'realm' ||
            proof.subject.kind !== 'character' || !proof.scope || proof.scope.kind !== 'realm' || proof.scope.id !== rid) fault();
      }
      if (p.source === 'papal_election' && holder && holder !== rid) {
        // Losing the seat is lawful, but it cannot silently bind another polity's claimant.
        if (!s.realms[holder]) fault();
      }
      if (p.source === 'local_office') {
        var def = FB.localInstitutionDefinitions(s)[r.institutionId];
        if (!office.head.local || r.scope.indexOf(def.provinceId) < 0 || !s.localInstitutions[def.chapterId]) fault();
      }
      if (r.originFormId === null) {
        var d = bookmark && bookmark.realms.filter(function (d) { return d.id === rid; })[0];
        if (!d || !d.ecclesiastical || d.ecclesiastical.profileId !== r.profileId || d.ecclesiastical.officeId !== r.officeId || d.ecclesiastical.institutionId !== r.institutionId) fault();
      }
    });
    return true;
  };
  var validate = G.validate;
  G.validate = function () { return validate().concat(E.profileFaults()); };
  E.conversionQuote = function (s,rid,terms) {
    var realm = s.realms[rid], t = copy(terms || {}), current = realm && G.forRealm(s,rid);
    if (!realm || !current) return null;
    var faults = E.bindingFaults(t,FB.localInstitutionDefinitions(s),FB.religiousOffices(s));
    var scopes = FB.realmHeldCounties(s,rid).slice().sort(), reason = faults.length ? 'missing_binding' : null;
    if (rid === 'player' || !realm.alive || !scopes.length || scopes.length > 128 || E.row(s,rid) ||
        current.use.succession.delegatedLeadership || current.use.succession.selectionManaged || current.use.succession.mobileLeadership ||
        scopes.some(function (pid) { return s.owner[pid] !== FB.topRealm(s,rid); }) || FB.isRealmAtWar(s,rid) ||
        Object.keys(s.realms).some(function (id) { return s.realms[id].alive && s.realms[id].liege === rid; })) reason = reason || 'outside_scope';
    var p = FBDATA.ecclesiasticalProfiles[t.profileId], holder = !faults.length && FB.religiousOfficeSnapshot(s,t.officeId);
    var c = !faults.length && (p.source === 'papal_election' ? holder && holder.id === rid && FB.papalOfficeIncumbentSnapshot(s,t.officeId) : holder);
    var ruler = FB.realmRulerCharacterSnapshot(s,rid);
    if (!c || !ruler || c.id !== ruler.id) reason = reason || 'different_incumbent';
    if (p && p.layRecognition && !realm.liege) reason = reason || 'recognition';
    if (p && p.chapter) {
      var def = FB.localInstitutionDefinitions(s)[t.institutionId];
      if (!def || scopes.indexOf(def.provinceId) < 0 || !FB.localInstitutionConsent(s,def.chapterId,{ kind:'realm',id:rid })) reason = reason || 'chapter';
    }
    if (Object.keys(s.authority && s.authority.governments || {}).some(function (id) { var r = E.row(s,id); return r && r.officeId === t.officeId; })) reason = reason || 'duplicate_binding';
    var consent = QConsent(s,rid);
    if (!consent.allowed) reason = reason || 'withheld';
    return { realmId:rid,terms:t,allowed:!reason,reason:reason,cost:0,scopes:scopes,
      stamp:{ turn:s.turn,realm:copy(realm),authority:copy(s.authority),office:copy(c || null),profile:copy(p || null),
        institutions:copy(s.localInstitutions || null),player:copy(s.player),consent:copy(consent),
        sources:scopes.map(function (id) { return [id,s.owner[id],s.holder[id]]; }) } };
  };
  function QConsent(s,rid) { return FB.political.consent(s,{ kind:'realm',id:rid },'treaty',{}); }
  E.convert = function (s,reviewed) {
    var q = reviewed && E.conversionQuote(s,reviewed.realmId,reviewed.terms);
    if (!q || !q.allowed || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    var previous = G.forRealm(s,q.realmId).id;
    if (!E.setFormReviewed(s,q.realmId,'ecclesiastical_principality')) return false;
    s.authority.governments[q.realmId].ecclesiastical = { schema:1,profileId:q.terms.profileId,officeId:q.terms.officeId,
      institutionId:q.terms.institutionId,scope:q.scopes.slice(),originFormId:previous,temporalRecognitionId:null };
    G.invalidate(); E.sync(s,q.realmId); return true;
  };
})();
