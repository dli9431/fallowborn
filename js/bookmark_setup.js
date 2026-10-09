/* Declarative opening households, scoped offices and private estate evidence.
   Initialization is separate from restore; declarations never replay in a save. */
(function () {
  'use strict';
  function plain(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function own(v, k) { return Object.prototype.hasOwnProperty.call(v || {}, k); }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function slug(v) { return typeof v === 'string' && /^[a-z][a-z0-9_]*$/.test(v); }
  function fault(path) { throw new Error(FB.T('Invalid v4 save field at {path}.', { path:path })); }
  function definition(s) {
    var bm = FB.bookmark(s.start && s.start.id) || {};
    var revision = s.bookmarkSetup && s.bookmarkSetup.revision;
    if (revision !== undefined) {
      if (!slug(revision) || !plain(bm.openingRevisions) || !own(bm.openingRevisions, revision))
        fault('state.bookmarkSetup.revision');
      return bm.openingRevisions[revision];
    }
    return s.bookmarkSetup && bm.openingLegacyRevision
      ? bm.openingRevisions[bm.openingLegacyRevision] : bm.opening;
  }
  function actor(s, id) {
    var cid = s.bookmarkSetup && s.bookmarkSetup.actors[id];
    return cid && s.chars[cid] || null;
  }
  FB.bookmarkActor = actor;
  FB.openingDefinitionFaults = function (bm) {
    var d = bm && bm.opening, errors = [], year = bm && bm.date && bm.date.year;
    if (!bm || d === undefined) return errors;
    function fail(p) { errors.push('Invalid opening declaration: ' + p + '.'); }
    var counties = {}, realms = {};
    (Array.isArray(bm.provinces) ? bm.provinces : []).forEach(function (p) { if (p && !p.wasteland) counties[p.id] = p; });
    (Array.isArray(bm.realms) ? bm.realms : []).forEach(function (r) { if (r) realms[r.id] = r; });
    if (!plain(d) || !plain(d.actors) || !plain(d.appointments) ||
        !Array.isArray(d.estates) || !Array.isArray(d.claims) || !Array.isArray(d.migrations)) {
      fail('schema'); return errors;
    }
    Object.keys(d).forEach(function (k) {
      if (['actors','appointments','estates','claims','migrations'].indexOf(k) < 0) fail(k);
    });
    Object.keys(d.actors).forEach(function (id) {
      var p = d.actors[id];
      if (!slug(id) || !plain(p)) { fail('actors.' + id); return; }
      if (p.ref !== undefined) {
        var ref = p.ref;
        var validRef = plain(ref) && (ref.kind === 'realm_ruler'
          ? slug(ref.realmId) && !!realms[ref.realmId] && Object.keys(ref).every(function (k) { return ['kind','realmId'].indexOf(k) >= 0; })
          : ref.kind === 'story' && slug(ref.storyId) && typeof ref.field === 'string' && /^[a-z][a-zA-Z0-9_]*$/.test(ref.field) &&
            (bm.stories || []).indexOf(ref.storyId) >= 0 && Object.keys(ref).every(function (k) { return ['kind','storyId','field'].indexOf(k) >= 0; }));
        if (Object.keys(p).length !== 1 || !validRef)
          fail('actors.' + id + '.ref');
        return;
      }
      Object.keys(p).forEach(function (k) {
        if (['name','sex','culture','religion','born','station','role','dyn','father','mother',
          'skills','traits','home','rulerChildRealmId'].indexOf(k) < 0) fail('actors.' + id + '.' + k);
      });
      if (p.name !== undefined && (typeof p.name !== 'string' || !p.name) ||
          ['m','f'].indexOf(p.sex) < 0 || !FBDATA.cultures[p.culture] ||
          !FB.faithAssignable(p.religion, null) || !Number.isInteger(p.born) || p.born > year ||
          !Number.isInteger(p.station) || p.station < 0 || p.station > 7 || !counties[p.home] ||
          ['commander','claimant','notable','priest','monk','soldier'].indexOf(p.role) < 0 ||
          p.dyn !== undefined && (typeof p.dyn !== 'string' || !p.dyn) ||
          p.rulerChildRealmId !== undefined && !realms[p.rulerChildRealmId]) fail('actors.' + id);
      ['father','mother'].forEach(function (k) {
        var parent = p[k] && d.actors[p[k]];
        if (p[k] !== undefined && (!parent || parent.born >= p.born ||
            parent.sex !== (k === 'father' ? 'm' : 'f'))) fail('actors.' + id + '.' + k);
      });
      if (p.skills !== undefined && (!plain(p.skills) || Object.keys(p.skills).some(function (k) {
        return ['mar','ste','dip','int','lea'].indexOf(k) < 0 ||
          !Number.isInteger(p.skills[k]) || p.skills[k] < 0 || p.skills[k] > 20;
      }))) fail('actors.' + id + '.skills');
      if (p.traits !== undefined && (!Array.isArray(p.traits) || p.traits.some(function (t, i) {
        return !FBDATA.traits[t] || p.traits.indexOf(t) !== i;
      }))) fail('actors.' + id + '.traits');
    });
    Object.keys(d.appointments).forEach(function (id) {
      var a = d.appointments[id], office = a && FBDATA.authorityOffices[a.officeId];
      if (!slug(id) || !plain(a) || !office || !d.actors[a.actorId] || !realms[a.realmId] ||
          !plain(a.scope) || ['realm','county','host'].indexOf(a.scope.kind) < 0 ||
          typeof a.scope.id !== 'string' || !a.scope.id ||
          a.scope.kind === 'county' && (!counties[a.scope.id] || counties[a.scope.id].realm !== a.realmId) ||
          a.scope.kind === 'realm' && a.scope.id !== a.realmId ||
          office.scopes.indexOf(a.scope.kind) < 0 ||
          a.endTurn !== undefined && (!Number.isInteger(a.endTurn) || a.endTurn < 1) ||
          a.recognitionSource !== undefined && (!FBDATA.legitimacySources[a.recognitionSource] || a.scope.kind !== 'county'))
        fail('appointments.' + id);
      if (plain(a)) Object.keys(a).forEach(function (k) {
        if (['officeId','actorId','realmId','scope','endTurn','recognitionSource'].indexOf(k) < 0) fail('appointments.' + id + '.' + k);
      });
    });
    var estateIds = {}, estateShares = {}, claimIds = {};
    d.estates.forEach(function (e) {
      if (!plain(e) || !slug(e.id) || estateIds[e.id] || !d.actors[e.actorId] ||
          !counties[e.provinceId] || typeof e.evidence !== 'string' || !e.evidence ||
          ['tenure','possession','judgment'].indexOf(e.basis) < 0 ||
          !Number.isInteger(e.share0) || e.share0 < 1 || e.share0 > 10000 ||
          !d.actors[e.actorId].dyn || Object.keys(e).some(function (k) {
            return ['id','actorId','provinceId','share0','basis','evidence'].indexOf(k) < 0;
          })) fail('estates');
      if (plain(e)) {
        estateIds[e.id] = true;
        estateShares[e.provinceId] = (estateShares[e.provinceId] || 0) + e.share0;
        if (estateShares[e.provinceId] > 10000) fail('estates.share0');
      }
    });
    d.claims.forEach(function (c) {
      if (!plain(c) || !slug(c.id) || claimIds[c.id] || !realms[c.realmId] || !Array.isArray(c.countyIds) || !c.countyIds.length ||
          c.countyIds.some(function (pid, i) { return !counties[pid] || c.countyIds.indexOf(pid) !== i; }) ||
          !Number.isInteger(c.share0) || c.share0 < 1 || c.share0 > 10000 ||
          typeof c.evidence !== 'string' || !c.evidence || Object.keys(c).some(function (k) {
            return ['id','realmId','countyIds','share0','evidence'].indexOf(k) < 0;
          })) fail('claims');
      if (plain(c)) claimIds[c.id] = true;
    });
    d.migrations.forEach(function (m) {
      if (!plain(m) || !counties[m.from] || !counties[m.to] || m.from === m.to ||
          !Number.isFinite(m.rate) || m.rate <= 0 || m.rate > 1 ||
          !plain(m.community) || !FBDATA.cultures[m.community.culture] ||
          !FB.faithAssignable(m.community.religion, null) ||
          Object.keys(m).some(function (k) { return ['from','to','rate','community','actorIds'].indexOf(k) < 0; }) ||
          m.actorIds !== undefined && (!Array.isArray(m.actorIds) || m.actorIds.some(function (id, i) {
            var p = d.actors[id];
            return !p || p.ref && p.ref.kind === 'story' || m.actorIds.indexOf(id) !== i;
          })))
        fail('migrations');
    });
    return errors;
  };
  var validateBookmark = FB.validateBookmark;
  FB.validateBookmark = function (bm) {
    var errors = validateBookmark(bm).concat(FB.openingDefinitionFaults(bm));
    if (bm && (bm.openingRevision !== undefined || bm.openingRevisions !== undefined || bm.openingLegacyRevision !== undefined)) {
      var versions = bm.openingRevisions;
      if (!plain(bm.opening) || !plain(versions) || !slug(bm.openingRevision) || !own(versions, bm.openingRevision) ||
          JSON.stringify(bm.opening) !== JSON.stringify(versions[bm.openingRevision]) ||
          bm.openingLegacyRevision !== undefined && (!slug(bm.openingLegacyRevision) || !own(versions, bm.openingLegacyRevision)))
        errors.push('Invalid opening revision catalogue.');
      if (plain(versions)) Object.keys(versions).forEach(function (revision) {
        if (!slug(revision)) errors.push('Invalid opening revision id.');
        if (!plain(versions[revision])) errors.push('Missing opening revision declaration.');
        errors = errors.concat(FB.openingDefinitionFaults(Object.assign({}, bm, { opening:versions[revision] })));
      });
    }
    var layout = bm && FBDATA.settlementLayouts[bm.settlementLayout] || {};
    (bm && Array.isArray(bm.provinces) ? bm.provinces : []).forEach(function (p) {
      if (!p) return;
      var entries = p.settlements || layout[p.id] || [];
      (Array.isArray(entries) ? entries : []).forEach(function (site) {
        if (!site) return;
        if (site.communities === undefined) return;
        var mix = site.communities;
        if (!Array.isArray(mix) || !mix.length || mix.some(function (c, i) {
          return !plain(c) || !Number.isInteger(c.populationShare0) || c.populationShare0 < 1 ||
            c.populationShare0 > 10000 || !(Array.isArray(p.communities) ? p.communities : []).some(function (pc) {
              return pc && pc.culture === c.culture && pc.religion === c.religion;
            }) || mix.some(function (other, j) { return j < i && other.culture === c.culture && other.religion === c.religion; });
        }) || mix.reduce(function (n, c) { return n + c.populationShare0; }, 0) !== 10000)
          errors.push('Invalid settlement community partition: ' + p.id + '/' + site.site + '.');
      });
    });
    return errors;
  };
  function resolveActorReferences(s, d) {
    Object.keys(d.actors).forEach(function (id) {
      var ref = d.actors[id].ref;
      if (!ref || own(s.bookmarkSetup.actors, id)) return;
      var realmId = ref.kind === 'realm_ruler' && FB.startRealmId(s, ref.realmId);
      var rec = ref.kind === 'story' && s.stories && s.stories[ref.storyId];
      var c = realmId ? realmId === 'player' ? s.chars[s.player.charId] : FB.materializeRealmRuler(s, realmId) :
        rec && own(rec, ref.field) && typeof rec[ref.field] === 'string' && s.chars[rec[ref.field]];
      if (c) {
        if (Object.keys(s.bookmarkSetup.actors).some(function (key) { return s.bookmarkSetup.actors[key] === c.id; }))
          throw new Error('Opening actor references must identify distinct people.');
        s.bookmarkSetup.actors[id] = c.id;
      }
    });
  }
  function initialize(s) {
    var d = definition(s);
    if (!d || s.bookmarkSetup) return;
    var errors = FB.openingDefinitionFaults(FB.bookmark(s.start.id));
    if (errors.length) throw new Error(errors.join(' '));
    var store = s.bookmarkSetup = { schema:1, actors:{}, appointments:{}, estates:[], claims:[], migrations:[] };
    var bm = FB.bookmark(s.start.id);
    if (bm.openingRevision) store.revision = bm.openingRevision;
    Object.keys(d.actors).forEach(function (id) {
      var p = d.actors[id];
      if (p.ref) return;
      var c = FB.makeCharacter(s, {
        name:p.name, sex:p.sex, culture:p.culture, religion:p.religion, born:p.born,
        station:p.station, role:p.role, dyn:p.dyn, quality:2, traitsN:1,
        traits:p.traits && p.traits.slice()
      });
      if (p.skills) Object.keys(p.skills).forEach(function (k) { c.skills[k] = p.skills[k]; });
      c.homeProvinceId = p.home; c.generatedOfficeholder = !p.name;
      store.actors[id] = c.id;
    });
    resolveActorReferences(s, d);
    Object.keys(d.actors).forEach(function (id) {
      var p = d.actors[id], c = actor(s, id);
      if (p.ref) return;
      ['father','mother'].forEach(function (key) {
        var parent = p[key] && actor(s, p[key]);
        if (parent) { c[key + 'Id'] = parent.id; parent.childrenIds.push(c.id); }
      });
      if (p.rulerChildRealmId) {
        var child = FB.materializeRealmRuler(s, p.rulerChildRealmId);
        if (child) { child.fatherId = c.id; if (c.childrenIds.indexOf(child.id) < 0) c.childrenIds.push(child.id); }
      }
    });
    d.estates.forEach(function (e) {
      var c = actor(s, e.actorId);
      store.estates.push({ id:e.id, holderId:c.id, dynasty:c.dyn, provinceId:e.provinceId,
        share0:e.share0, basis:e.basis, evidence:e.evidence, status:'held', changedTurn:s.turn });
    });
    d.claims.forEach(function (c) {
      store.claims.push({ id:c.id, realmId:c.realmId, countyIds:c.countyIds.slice(), share0:c.share0,
        evidence:c.evidence, status:'demanded', contractId:null });
    });
    d.migrations.forEach(function (m, index) {
      var moved = FB.moveCommunityPopulationByPolicy(s, m.from, m.to, m);
      if (moved.count) (m.actorIds || []).forEach(function (id) { actor(s, id).homeProvinceId = m.to; });
      store.migrations.push({ index:index, from:m.from, to:m.to, count:moved.count, cohorts:moved.cohorts });
    });
    FB.touchFamily();
  }
  FB.bookmarkSetupAppointments = function (s) {
    var d = definition(s), store = s.bookmarkSetup;
    if (!d || !store) return;
    resolveActorReferences(s, d);
    Object.keys(d.appointments).forEach(function (id) {
      if (own(store.appointments, id)) return;
      var a = d.appointments[id], c = actor(s, a.actorId), proof = null;
      if (!c) return;
      if (a.recognitionSource) proof = FB.authorityRecognize(s, { source:a.recognitionSource,
        issuer:{ kind:'county', id:a.scope.id }, subject:{ kind:'character', id:c.id }, scope:a.scope });
      var row = FB.authorityAppoint(s, { officeId:a.officeId, institutionId:a.realmId,
        appointer:{ kind:'realm', id:a.realmId }, holder:{ kind:'character', id:c.id },
        scope:a.scope, endTurn:a.endTurn, recognitionId:proof && proof.id });
      if (!row) throw new Error('Opening appointment has no live scope: ' + id);
      store.appointments[id] = { id:row.id, recognitionId:proof && proof.id || null };
    });
  };
  FB.privateEstates = function (s, cid) {
    return (s.bookmarkSetup && s.bookmarkSetup.estates || []).filter(function (e) {
      return !cid || e.holderId === cid;
    }).map(clone);
  };
  function inheritEstates(s) {
    (s.bookmarkSetup && s.bookmarkSetup.estates || []).forEach(function (e) {
      var holder = s.chars[e.holderId];
      if (e.status !== 'held' || holder && !holder.dead) return;
      var kin = Object.keys(s.chars).map(function (id) { return s.chars[id]; }).filter(function (c) {
        return !c.dead && c.dyn === e.dynasty;
      }).sort(function (a, b) {
        var ac = holder && (a.fatherId === holder.id || a.motherId === holder.id);
        var bc = holder && (b.fatherId === holder.id || b.motherId === holder.id);
        return Number(!!bc) - Number(!!ac) || a.born - b.born || a.id.localeCompare(b.id);
      });
      if (kin.length) e.holderId = kin[0].id;
      else e.status = 'unclaimed';
      e.changedTurn = s.turn;
    });
  }
  var start = FB.stories.start, day = FB.stories.day;
  FB.stories.start = function (s, options) {
    if (!s.stories && !s.bookmarkSetup) FB.seedSettlementCommunities(s);
    initialize(s);
    var result = start(s, options);
    // Every bookmark can declare offices. World-story initialization has now
    // created any deferred hosts; an earlier story-owned appointment is kept.
    FB.bookmarkSetupAppointments(s);
    if (FB.aristocracy) FB.aristocracy.seed(s);
    var d = definition(s);
    if (d && (Object.keys(s.bookmarkSetup.actors).length !== Object.keys(d.actors).length ||
        Object.keys(s.bookmarkSetup.appointments).length !== Object.keys(d.appointments).length))
      throw new Error('Opening references did not resolve after story initialization.');
    return result;
  };
  FB.stories.day = function (s) { inheritEstates(s); return day(s); };
  var retained = FB.courtRecordRetained;
  FB.courtRecordRetained = function (s, c, kin, links) {
    if (!s || !c) return false;
    return !!(s.bookmarkSetup && Object.keys(s.bookmarkSetup.actors).some(function (id) {
      return s.bookmarkSetup.actors[id] === c.id;
    })) || Object.keys(s.stories || {}).some(function (id) {
      var story = s.stories[id];
      return story && (story.actorId === c.id || story.sourceId === c.id);
    }) || retained(s, c, kin, links);
  };
  var validate = FB.save.v4.validatePlatform;
  FB.save.v4.validatePlatform = function (s) {
    if (s.bookmarkSetup !== undefined) {
      var r = s.bookmarkSetup, d = definition(s), path = 'state.bookmarkSetup';
      if (!d || !plain(r) || r.schema !== 1 || !plain(r.actors) || !plain(r.appointments) ||
          !Array.isArray(r.estates) || !Array.isArray(r.claims) || !Array.isArray(r.migrations)) fault(path);
      if (Object.keys(r).some(function (k) { return ['schema','revision','actors','appointments','estates','claims','migrations'].indexOf(k) < 0; }) ||
          Object.keys(r.actors).length !== Object.keys(d.actors).length) fault(path + '.actors');
      var actorIds = {};
      Object.keys(r.actors).forEach(function (id) {
        if (!own(d.actors, id) || typeof r.actors[id] !== 'string' || !own(s.chars, r.actors[id]) || actorIds[r.actors[id]]) fault(path + '.actors');
        var ref = d.actors[id].ref, rec = ref && ref.kind === 'story' && s.stories && s.stories[ref.storyId];
        if (ref && ref.kind === 'story' && (!rec || !own(rec, ref.field) || rec[ref.field] !== r.actors[id]))
          fault(path + '.actors.' + id);
        actorIds[r.actors[id]] = true;
      });
      if (Object.keys(r.appointments).length !== Object.keys(d.appointments).length) fault(path + '.appointments');
      Object.keys(r.appointments).forEach(function (id) {
        var a = r.appointments[id];
        var expected = own(d.appointments, id) && FB.startRealmDefinition(s, d.appointments[id]);
        var row = plain(a) && (s.authority && s.authority.appointments || []).filter(function (entry) { return entry.id === a.id; })[0];
        if (!expected || !row || typeof a.id !== 'string' || row.officeId !== expected.officeId ||
            row.institutionId !== expected.realmId || !plain(row.holder) || row.holder.kind !== 'character' ||
            row.holder.id !== r.actors[expected.actorId] || !plain(row.scope) ||
            row.scope.kind !== expected.scope.kind || row.scope.id !== expected.scope.id ||
            a.recognitionId !== (row.recognitionId || null)) fault(path + '.appointments');
      });
      if (r.estates.length !== d.estates.length || r.claims.length !== d.claims.length || r.migrations.length !== d.migrations.length) fault(path);
      r.estates.forEach(function (e, i) {
        var def = d.estates[i];
        if (!plain(e) || e.id !== def.id || e.provinceId !== def.provinceId || e.share0 !== def.share0 ||
            e.evidence !== def.evidence || e.basis !== def.basis || typeof e.holderId !== 'string' || !own(s.chars, e.holderId) ||
            e.dynasty !== d.actors[def.actorId].dyn && !(FB.aristocracy && FB.aristocracy.estateDynastyValid(s,def,e)) ||
            e.status === 'held' && s.chars[e.holderId].dyn !== e.dynasty ||
            ['held','unclaimed'].indexOf(e.status) < 0 ||
            !Number.isInteger(e.changedTurn) || e.changedTurn < 0 || e.changedTurn > s.turn) fault(path + '.estates');
      });
      r.claims.forEach(function (c, i) {
        var def = d.claims[i];
        if (!plain(c) || c.id !== def.id || c.realmId !== FB.startRealmId(s, def.realmId) ||
            JSON.stringify(c.countyIds) !== JSON.stringify(def.countyIds) || c.share0 !== def.share0 ||
            c.evidence !== def.evidence || c.status !== 'demanded' || c.contractId !== null) fault(path + '.claims');
      });
      r.migrations.forEach(function (m, i) {
        var def = d.migrations[i];
        if (!plain(m) || m.index !== i || m.from !== def.from || m.to !== def.to ||
            !Number.isInteger(m.count) || m.count < 0 || !Array.isArray(m.cohorts) ||
            m.cohorts.some(function (c) { return !plain(c) || !Number.isInteger(c.count) || c.count < 1 ||
              c.culture !== def.community.culture || c.religion !== def.community.religion; }) ||
            m.cohorts.reduce(function (n, c) { return n + c.count; }, 0) !== m.count) fault(path + '.migrations');
      });
    }
    return validate(s);
  };
})();
