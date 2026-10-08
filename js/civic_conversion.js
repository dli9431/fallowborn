/* Deliberate adoption of a civic constitution. Restore never invokes this
   transaction and conversion never imports a bookmark's opening concessions. */
(function () {
  'use strict';
  var V = FB.civicGovernment, G = FB.governments, C = G.support, Q = FB.political;
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function equal(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  function electorate(rid,p,scopes) {
    var cp = FBDATA.constituencyProfiles[p.constituency];
    return { id:rid,profileId:p.constituency,scopes:scopes.slice(),serial:0,revision:0,
      mandate:null,selection:null,decisions:[],history:[],overreach:false,dues:null,agreements:[],
      members:cp.members.map(function (m) { return { id:m.id,principal:{ kind:'county',id:scopes[0] },
        scope:scopes.slice(),basis:m.basis,weight:m.weight,continuity:m.continuity }; }) };
  }
  V.conversionQuote = function (s,rid,terms) {
    var realm = s.realms[rid], current = realm && G.forRealm(s,rid), t = copy(terms || {}), p = FBDATA.civicProfiles[t.profileId];
    if (!realm || !current || !p) return null;
    var authority = s.authority || { governments:{} };
    var scopes = FB.realmHeldCounties(s,rid).slice().sort(), reason = null;
    var complete = Object.keys(t).length === 2 && Array.isArray(t.incumbents) && t.incumbents.length === p.offices.length &&
      new Set(t.incumbents).size === t.incumbents.length && t.incumbents.every(function (cid) { return typeof cid === 'string' && s.chars[cid]; });
    if (!complete || !realm.alive || rid === 'player' || realm.liege || !scopes.length ||
        scopes.some(function (pid) { return s.owner[pid] !== rid; }) || current.use.succession.delegatedLeadership ||
        current.use.succession.selectionManaged || V.row(s,rid) || C.row(s,rid) ||
        Object.keys(s.realms).some(function (id) { return s.realms[id].alive && s.realms[id].liege === rid; })) reason = 'outside_scope';
    if (FB.isRealmAtWar(s,rid) || (authority.appointments || []).some(function (a) { return a.institutionId === rid && a.status === 'active'; }) ||
        (authority.contracts || []).some(function (a) { return a.status === 'active' && (a.patronRealmId === rid || a.federateRealmId === rid); })) reason = reason || 'existing_obligations';
    var virtual = Object.assign({},s,{ authority:copy(authority),governmentSupport:copy(s.governmentSupport || { schema:1,polities:{} }) });
    virtual.authority.governments[rid] = Object.assign({},virtual.authority.governments[rid],{ formId:'city_republic',sinceTurn:s.turn,
      civic:{ profileId:t.profileId,citizens:complete ? t.incumbents.slice() : [],offices:[] } });
    virtual.governmentSupport.polities[rid] = electorate(rid,p,scopes);
    var candidates = complete ? t.incumbents.map(function (cid,i) {
      return { characterId:cid,officeId:p.offices[i].id,person:copy(s.chars[cid]),
        eligibility:V.eligible(virtual,rid,cid,p.offices[i].id),support:V.ballot(virtual,rid,cid,p.consent.conversion) };
    }) : [];
    if (candidates.some(function (c) { return !c.eligibility.allowed; })) reason = reason || 'qualification';
    if (candidates.some(function (c) { return !c.support.allowed; })) reason = reason || 'withheld';
    var consent = Q.consent(s,{ kind:'realm',id:rid },'treaty',{ formId:'city_republic' });
    if (!consent.allowed) reason = reason || 'withheld';
    return { realmId:rid,terms:t,allowed:!reason,reason:reason,candidates:candidates,consent:copy(consent),charge:0,
      stamp:{ turn:s.turn,realm:copy(realm),authority:copy(s.authority || null),finance:copy(s.economy || null),enterprises:copy(s.enterprises || null),
        profile:copy(p),constituency:copy(FBDATA.constituencyProfiles[p.constituency]),
        ruler:copy(FB.realmRulerCharacterSnapshot(s,rid)),household:copy(s.player),
        electorate:copy(virtual.governmentSupport.polities[rid]),
        scopes:scopes.map(function (pid) { return [pid,s.owner[pid],s.holder[pid],FB.countyPopularSupport(s,pid)]; }) } };
  };
  V.convert = function (s,reviewed) {
    var q = reviewed && V.conversionQuote(s,reviewed.realmId,reviewed.terms);
    if (!q || !q.allowed || !equal(q,reviewed)) return false;
    var rid = q.realmId, previous = G.forRealm(s,rid).id, scopes = q.stamp.electorate.scopes;
    if (!V.setFormReviewed(s,rid,'city_republic')) return false;
    if (!s.governmentSupport) s.governmentSupport = { schema:1,polities:{} };
    s.governmentSupport.polities[rid] = electorate(rid,FBDATA.civicProfiles[q.terms.profileId],scopes);
    V.establish(s,rid,q.terms.profileId,q.terms.incumbents,previous);
    G.invalidate(); FB.invalidateRealmCache();
    FB.news(s,FB.msg('news.civic.constitution','{realm} adopts a civic constitution. Public property and household property retain their owners.',{ realm:FB.realmNameParam(s,rid) }));
    return true;
  };
})();
