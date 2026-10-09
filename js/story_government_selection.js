/* A contest card references the canonical government vacancy. It creates no
   rival candidates, elections, incumbents, property or succession scheduler. */
(function () {
  'use strict';
  function validateDefinition(def) {
    if (!def || typeof def.realmId !== 'string' || typeof def.name !== 'string' || typeof def.desc !== 'string')
      throw new Error(FB.T('A government contest needs a court, name and description.'));
  }
  FB.stories.registerType('government_contest', function (def) {
    validateDefinition(def);
    return { id:def.id, kind:'world', requires:def.requires || [],
      appliesTo:function (s) { return !!FB.governmentSelection.state(s, def.realmId) || !!FB.civicGovernment.row(s,def.realmId); },
      init:function () { return { realmId:def.realmId }; },
      validate:function (rec, s) {
        if (!rec || Object.keys(rec).length !== 1 || typeof rec.realmId !== 'string' || !s.realms[rec.realmId])
          throw new Error(FB.T('Invalid government contest reference.'));
      },
      title:function (s) { return FB.dataText(s, null, 'governmentContest', def.id, def, 'name', {}); },
      intro:function (s) { return FB.dataText(s, null, 'governmentContest', def.id, def, 'desc', {}); },
      status:function (s, rec) {
        var civic = FB.civicGovernment.row(s,rec.realmId);
        if (civic && FB.civicGovernment.active(s,rec.realmId)) {
          var vacancies = civic.offices.filter(function (o) { return o.vacancy && o.vacancy.status === 'open'; });
          return { phase:vacancies.length ? 'active' : 'resolved',name:vacancies.length ? FB.T('Civic selection remains open') : FB.T('Civic offices are occupied'),
            lines:[FB.T('{count} public offices await recognition; civic property and household livelihoods continue.',{ count:vacancies.length })] };
        }
        var data = FB.governmentSelection.state(s, rec.realmId), v = data && data.vacancy;
        if (!v || ['contested','vacant','minority','resolved'].indexOf(v.status) < 0) return null;
        var names = { contested:FB.T('Local recognition is divided'), vacant:FB.T('No eligible successor'),
          minority:FB.T('Eligible candidates are still minors'), resolved:FB.T('Local accession recorded') };
        var t = s.realms[rec.realmId].succession;
        var claims = Object.keys(v.support).map(function (id) { return v.support[id].candidateId; }).filter(function (id, i, ids) {
          return id && ids.indexOf(id) === i && t.members[id];
        }).map(function (id) { return t.members[id].name; });
        return { phase:v.status === 'resolved' ? 'resolved' : 'active', name:names[v.status],
          lines:[FB.T('{count} eligible adult candidates; private households continue.',
            { count:FB.governmentSelection.candidates(s, rec.realmId).length }),
            FB.T('Current supported claims: {names}. County possession follows ordinary control and war.',
              { names:claims.length ? claims.join(', ') : FB.T('None') })] };
      }
    };
  }, 'js/story_government_selection.js', validateDefinition);
})();
