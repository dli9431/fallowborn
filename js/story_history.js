/* Reusable negotiated partitions and dated religious campaign opportunities.
   Data names the parties. A date grants no land, ruler replacement or victory. */
(function () {
  'use strict';
  function plain(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function id(v) { return typeof v === 'string' && /^[a-z][a-z0-9_]*$/.test(v); }
  function number(d) { return d.year * 360 + d.season * 90 + d.day - 1; }
  function date(d) {
    return plain(d) && Number.isInteger(d.year) && d.year > 0 &&
      Number.isInteger(d.season) && d.season >= 0 && d.season < 4 &&
      Number.isInteger(d.day) && d.day >= 1 && d.day <= 90;
  }
  function live(s, rid) { return !!(s.realms[rid] && s.realms[rid].alive); }
  function ruler(s, rid) {
    return FB.stories.ruler(s, rid);
  }
  function controlled(s, rid) {
    var c = ruler(s, rid);
    return rid === 'player' || !!(c && c.id === s.player.charId);
  }
  function held(s, pid) { return s.holder[pid] || s.owner[pid]; }
  function effective(s, def) { return FB.stories.definition(s, def); }
  function invalid(path) {
    throw new Error(FB.T('Invalid v4 save field at {path}.', { path:'state.' + path }));
  }
  function baseDefinition(def) {
    if (!plain(def) || !id(def.id) || typeof def.name !== 'string' || typeof def.desc !== 'string' ||
        !date(def.firstDate) || !date(def.lastDate) || number(def.lastDate) < number(def.firstDate))
      throw new Error('Invalid historical story definition.');
    Object.keys(def.news || {}).forEach(function (key) {
      var msg = def.news[key];
      if (!plain(msg) || !/^news\.[a-z0-9_.-]+$/.test(msg.key || '') || typeof msg.text !== 'string')
        throw new Error('Invalid historical story message.');
    });
  }
  function text(s, def, field) { return FB.dataText(s, null, 'storyCampaign', def.id, def, field, {}); }
  function notice(s, def, event, params) {
    var msg = def.news && def.news[event];
    if (msg) FB.news(s, FB.msg(msg.key, msg.text, params || {}));
  }
  function finish(s, rec, def, result, reason) {
    if (rec.phase === 'resolved') return;
    rec.phase = 'resolved'; rec.result = result; rec.reason = reason; rec.outcomeTurn = s.turn;
    notice(s, def, result);
  }
  function time(s, def) {
    return number(s.date) < number(def.firstDate) ? 'early' :
      number(s.date) > number(def.lastDate) ? 'late' : 'open';
  }
  function basicRecord(rec, s, def, results) {
    if (!plain(rec) || ['pending','started','resolved'].indexOf(rec.phase) < 0 ||
        rec.result !== null && results.indexOf(rec.result) < 0 ||
        rec.reason !== null && !id(rec.reason) ||
        rec.outcomeTurn !== null && (!Number.isInteger(rec.outcomeTurn) || rec.outcomeTurn < 0 || rec.outcomeTurn > s.turn) ||
        (rec.phase === 'resolved') !== (rec.result !== null && rec.outcomeTurn !== null) ||
        rec.phase !== 'resolved' && (rec.result !== null || rec.reason !== null || rec.outcomeTurn !== null) ||
        rec.phase === 'resolved' && rec.reason === null)
      invalid(def.id);
  }

  function partitionDefinition(def) {
    baseDefinition(def);
    var b = def.beneficiary, g = def.grant;
    if (!plain(def.actor) || !id(def.actor.realmId) || !id(def.actor.capital) ||
        !plain(b) || typeof b.name !== 'string' || !b.name || ['m','f'].indexOf(b.sex) < 0 ||
        !Number.isInteger(b.born) || def.firstDate.year - b.born < 16 ||
        !own(FBDATA.cultures, b.culture) || !FB.faithAssignable(b.religion, null) ||
        b.dyn !== undefined && (typeof b.dyn !== 'string' || !b.dyn) ||
        b.trait !== undefined && !own(FBDATA.traits, b.trait) ||
        !plain(g) || !id(g.realmId) || !id(g.liege) || !id(g.capital) ||
        !Number.isInteger(g.rank) || g.rank < 1 || g.rank > 4 ||
        ['county','duchy','kingdom','empire'].indexOf(g.kind) < 0 || typeof g.place !== 'string' || !g.place ||
        !Array.isArray(g.counties) || !g.counties.length || g.counties.length > 24 ||
        g.counties.indexOf(g.capital) < 0 || g.counties.indexOf(def.actor.capital) >= 0 ||
        g.counties.some(function (pid, i) { return !id(pid) || g.counties.indexOf(pid) !== i; }) ||
        def.parentStoryId !== undefined && (def.requires || []).indexOf(def.parentStoryId) < 0)
      throw new Error('Invalid negotiated partition declaration.');
  }
  function partitionParties(rec, def) {
    var parties = ['grantor','beneficiary'];
    if (def.grant.liege !== def.actor.realmId) parties.push('liege');
    return parties;
  }
  function partitionTerms(facts) {
    return JSON.stringify([facts.actorId, facts.generation, facts.liegeId,
      facts.liegeGeneration, facts.beneficiaryId, facts.counties]);
  }
  function partitionFacts(s, rec, def) {
    var actor = ruler(s, def.actor.realmId), liege = ruler(s, def.grant.liege);
    var b = s.chars[rec.beneficiaryId];
    return { phase:rec.phase, time:time(s, def), actorId:actor && actor.id || null,
      generation:FB.realmRulerGeneration(s, def.actor.realmId),
      liegeId:liege && liege.id || null, liegeGeneration:FB.realmRulerGeneration(s, def.grant.liege),
      beneficiaryId:b && b.id || null, dead:!b || !!b.dead,
      beneficiaryRealm:b && FB.realmIdForRulerCharacter(s, b) || null,
      captive:!!(b && FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s, b.id)),
      capital:s.owner[def.actor.capital] || null,
      counties:def.grant.counties.map(function (pid) { return [pid, s.owner[pid], held(s, pid)]; }),
      wars:[FB.isRealmAtWar(s, def.actor.realmId), FB.isRealmAtWar(s, def.grant.liege)],
      approvals:JSON.parse(JSON.stringify(rec.approvals)),
      destination:!!s.realms[def.grant.realmId],
      parent:def.parentStoryId ? (FB.stories.record(s, def.parentStoryId) || {}).result || null : null };
  }
  function partitionBlock(s, rec, def, facts) {
    if (rec.phase !== 'pending') return 'closed';
    if (facts.time !== 'open') return 'date';
    if (!live(s, def.actor.realmId) || facts.actorId !== rec.actorId || facts.generation !== rec.actorGeneration)
      return 'actor_changed';
    if (facts.dead) return 'beneficiary_dead';
    if (facts.capital !== FB.topRealm(s, def.actor.realmId)) return 'capital_lost';
    if (def.parentStoryId && facts.parent !== 'granted') return 'parent_unsettled';
    if (!live(s, def.grant.liege) || !facts.liegeId) return 'liege_missing';
    if (!FB.realmRank.above(s.realms[def.grant.liege], def.grant.rank, s)) return 'liege_rank';
    if (facts.destination || facts.beneficiaryRealm) return 'already_landed';
    if (rec.beneficiaryId === s.player.charId) return 'player_recipient';
    if (facts.captive || FB.intrigueRealmRulerCaptive &&
        (FB.intrigueRealmRulerCaptive(s, def.actor.realmId) || FB.intrigueRealmRulerCaptive(s, def.grant.liege)))
      return 'captivity';
    if (facts.wars[0] || facts.wars[1]) return 'war_ongoing';
    var top = FB.topRealm(s, def.actor.realmId);
    if (FB.topRealm(s, def.grant.liege) !== top) return 'liege_changed';
    for (var county of facts.counties) {
      var fault = countyBlock(s, def, top, county);
      if (fault) return fault;
    }
    return null;
  }
  // One granted county's facts row: [county id, owner, holder].
  function countyBlock(s, def, top, county) {
    if (!FB.world.byId[county[0]] || FB.world.byId[county[0]].wasteland ||
        county[1] !== top || county[2] !== def.actor.realmId) return 'not_held';
    if (FB.isProtected && FB.isProtected(s, 'grantCounty', county[0])) return 'protected';
    if (!FB.political.power(s, { kind:'realm', id:def.actor.realmId }, 'consent', { provinceId:county[0] }).allowed)
      return 'consent_power';
    return null;
  }
  function partyIsPlayer(s, rec, def, party) {
    return party === 'beneficiary' ? rec.beneficiaryId === s.player.charId :
      controlled(s, party === 'grantor' ? def.actor.realmId : def.grant.liege);
  }
  function partitionQuote(s, rec, def, choice) {
    var facts = partitionFacts(s, rec, def), reason = partitionBlock(s, rec, def, facts);
    var party = choice.slice(choice.indexOf('_') + 1);
    var action = choice.split('_')[0];
    var allowed = ['accept','decline'].indexOf(action) >= 0 &&
      partitionParties(rec, def).indexOf(party) >= 0 && partyIsPlayer(s, rec, def, party) &&
      (action === 'decline' ? rec.phase === 'pending' && facts.time === 'open' : !reason);
    return { id:choice, allowed:allowed, reason:allowed ? null : reason || 'not_party', facts:facts,
      stamp:JSON.stringify(facts) };
  }
  function grantPartition(s, rec, def) {
    var facts = partitionFacts(s, rec, def);
    if (partitionBlock(s, rec, def, facts) ||
        rec.approvalStamp !== partitionTerms(facts) ||
        partitionParties(rec, def).some(function (p) { return rec.approvals[p] !== true; })) return false;
    var g = def.grant, b = s.chars[rec.beneficiaryId];
    var realm = FB.makeVassalRealm(s, { id:g.realmId, capital:g.capital, rank:g.rank,
      liege:g.liege, culture:b.culture, religion:b.religion, nameStyle:{ kind:g.kind, place:g.place } });
    FB.assignRealmRulerCharacter(s, realm.id, b.id);
    var form = FB.political.government(s, { kind:'realm', id:def.actor.realmId });
    if (form) FB.authoritySetGovernment(s, realm.id, form.formId);
    g.counties.forEach(function (pid) {
      s.holder[pid] = realm.id;
      if (def.actor.realmId === 'player' && s.player.provs.indexOf(pid) >= 0)
        s.player.provs.splice(s.player.provs.indexOf(pid), 1);
    });
    b.homeProvinceId = g.capital;
    rec.realmId = realm.id; rec.grantedCounties = g.counties.slice();
    rec.liegeGeneration = facts.liegeGeneration;
    FB.invalidateRealmCache();
    if (FB.invalidateSettlementLordships) FB.invalidateSettlementLordships(s);
    if (FB.invalidatePoliticsState) FB.invalidatePoliticsState();
    if (FB.syncHomeCountyLord) FB.syncHomeCountyLord(s);
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    finish(s, rec, def, 'granted', 'consenting_partition');
    return true;
  }
  function partitionDay(s, rec, def) {
    if (rec.phase !== 'pending') return;
    var facts = partitionFacts(s, rec, def), reason = partitionBlock(s, rec, def, facts);
    if (facts.time === 'early') return;
    if (facts.time === 'late') { finish(s, rec, def, 'diverted', 'window_closed'); return; }
    if (['actor_changed','beneficiary_dead','capital_lost','already_landed','liege_changed'].indexOf(reason) >= 0) {
      finish(s, rec, def, 'interrupted', reason); return;
    }
    if (def.parentStoryId && facts.parent && facts.parent !== 'granted') {
      finish(s, rec, def, 'diverted', 'parent_diverted'); return;
    }
    if (reason) { rec.approvals = {}; rec.approvalStamp = null; return; }
    /* Every approval belongs to these exact living parties and holdings.
       Succession or changed terms discards it before another party can accept. */
    var terms = partitionTerms(facts);
    if (rec.approvalStamp !== terms) { rec.approvals = {}; rec.approvalStamp = terms; }
    partitionParties(rec, def).forEach(function (party) {
      if (!partyIsPlayer(s, rec, def, party)) rec.approvals[party] = true;
    });
    grantPartition(s, rec, def);
  }
  /* Presentation. Names are live display text for the sheet and the card;
     saved news keeps its own message parameters. Every helper is a pure read. */
  var STAGE = 'story stage';
  function countyName(pid) { return FB.world.byId[pid] ? FB.world.byId[pid].name : pid; }
  function kindName(kind) {
    if (kind === 'county') return FB.T('{term:county}');
    if (kind === 'duchy') return FB.T('{term:duchy}');
    return kind === 'kingdom' ? FB.T('{term:kingdom}') : FB.T('{term:empire}');
  }
  function kindTitle(kind) {
    if (kind === 'county') return FB.T('{Term:county}');
    if (kind === 'duchy') return FB.T('{Term:duchy}');
    return kind === 'kingdom' ? FB.T('{Term:kingdom}') : FB.T('{Term:empire}');
  }
  function parentStory(def) { return def.parentStoryId ? FB.stories.get(def.parentStoryId) : null; }
  function parentName(s, def) {
    var parent = parentStory(def);
    if (!parent) return def.parentStoryId || '';
    var grant = parent.declaration && parent.declaration.grant;
    return grant ? grant.place : parent.title(s, FB.stories.record(s, parent.id));
  }
  /* A court as a message parameter. A parent partition's court has no realm
     until that grant is made, so it is named from the declared grant. */
  function courtParam(s, def, rid) {
    if (rid === 'player' && !(s.realms.player && s.realms.player.name))
      return FB.fullName(s.chars[s.player.charId]);
    if (s.realms[rid]) return FB.realmNameParam(s, rid);
    var parent = parentStory(def), grant = parent && parent.declaration && parent.declaration.grant;
    return grant && grant.realmId === rid ?
      FB.T('{style} of {name}', { style:kindTitle(grant.kind), name:grant.place }) : FB.T('No current court');
  }
  function courtText(s, def, rid) {
    var court = courtParam(s, def, rid);
    return court && court.$realmName ? FB.renderRealmNameSnapshot(court.$realmName) : court;
  }
  function partitionWords(s, rec, def) {
    var b = s.chars[rec.beneficiaryId];
    return { place:def.grant.place, name:b ? b.name : def.beneficiary.name,
      grantor:courtParam(s, def, def.actor.realmId), liege:courtParam(s, def, def.grant.liege),
      counties:def.grant.counties.map(countyName).join(', '), count:def.grant.counties.length,
      capital:countyName(def.actor.capital), kind:kindName(def.grant.kind), last:def.lastDate.year };
  }
  function dateBlockText(def, when) {
    return when === 'late' ? FB.T('Closed after {year}.', { year:def.lastDate.year }) :
      FB.T('Opens in {season} {year}.',
        { season:FB.seasonName(def.firstDate.season), year:def.firstDate.year });
  }
  function windowText(def) {
    var p = { first:def.firstDate.year, last:def.lastDate.year };
    return p.first === p.last ? String(p.first) : FB.T('{first} to {last}', p);
  }
  /* One sentence for each partitionBlock code and for a refused party. A
     county code names the first county that fails the same checks. */
  function partitionBlockText(s, rec, def, reason) {
    var p = partitionWords(s, rec, def);
    if (reason === 'closed') return FB.T('This partition is settled.');
    if (reason === 'date') return dateBlockText(def, time(s, def));
    if (reason === 'actor_changed') return FB.T('{grantor} has a new ruler; the offer lapsed.', p);
    if (reason === 'beneficiary_dead') return FB.T('{name} has died.', p);
    if (reason === 'capital_lost') return FB.T('{grantor} no longer holds {capital}.', p);
    if (reason === 'parent_unsettled')
      return FB.T('Waits until {parent} is granted.', { parent:parentName(s, def) });
    if (reason === 'liege_missing') return FB.T('{liege} has no living ruler.', p);
    if (reason === 'liege_rank') return FB.T('{liege} must outrank the new {kind} to grant it.', p);
    if (reason === 'already_landed') return FB.T('{name} already rules land.', p);
    if (reason === 'player_recipient') return FB.T('Not available while you play {name}.', p);
    if (reason === 'captivity') return FB.T('{name} or one of the rulers is held captive.', p);
    if (reason === 'war_ongoing') return FB.T('{grantor} or {liege} is at war.', p);
    if (reason === 'liege_changed') return FB.T('{liege} no longer shares {grantor}’s overlord.', p);
    if (reason === 'not_party') return FB.T('You are not a party to this partition.');
    if (['not_held','protected','consent_power'].indexOf(reason) < 0) return null;
    var top = FB.topRealm(s, def.actor.realmId);
    var failed = partitionFacts(s, rec, def).counties.filter(function (county) {
      return countyBlock(s, def, top, county);
    })[0];
    p.county = countyName(failed ? failed[0] : def.grant.counties[0]);
    if (reason === 'not_held') return FB.T('{grantor} must hold {county} directly.', p);
    if (reason === 'protected') return FB.T('{county} cannot be granted right now.', p);
    return FB.T('{grantor} lacks the authority to grant {county}.', p);
  }
  function partitionRole(s, rec, def) {
    if (partyIsPlayer(s, rec, def, 'grantor')) return FB.T('Grantor');
    if (partyIsPlayer(s, rec, def, 'beneficiary')) return FB.T('Recipient');
    return controlled(s, def.grant.liege) ? FB.T('Overlord') : FB.T('Observer');
  }
  // The player's own missing approval comes first; stale approvals do not count.
  function awaitedParty(s, rec, def, facts) {
    var parties = partitionParties(rec, def);
    var approvals = rec.approvalStamp === partitionTerms(facts) ? rec.approvals : {};
    var missing = parties.filter(function (party) { return !approvals[party]; });
    var party = missing.filter(function (p) { return partyIsPlayer(s, rec, def, p); })[0] || missing[0] || parties[0];
    if (party === 'beneficiary') return partitionWords(s, rec, def).name;
    return courtParam(s, def, party === 'grantor' ? def.actor.realmId : def.grant.liege);
  }
  function partitionClosed(s, rec, def) {
    var p = partitionWords(s, rec, def), reason = rec.reason;
    if (reason === 'window_closed') return FB.T('Closed: the window ended in {last}.', p);
    if (reason === 'parent_diverted')
      return FB.T('Closed: {parent} was never granted.', { parent:parentName(s, def) });
    if (reason === 'actor_changed') return FB.T('Closed: {grantor} changed rulers and the offer lapsed.', p);
    if (reason === 'beneficiary_dead') return FB.T('Closed: {name} died.', p);
    if (reason === 'capital_lost') return FB.T('Closed: {grantor} lost {capital}.', p);
    if (reason === 'already_landed') return FB.T('Closed: {name} already rules land.', p);
    if (reason === 'liege_changed') return FB.T('Closed: {liege} left {grantor}’s overlord.', p);
    return FB.T('Closed: history took another course.');
  }
  // The present state: a short word for the stage line and the Now sentence.
  function partitionProgress(s, rec, def) {
    function out(state, text) { return { state:state, text:text }; }
    var p = partitionWords(s, rec, def);
    if (rec.phase === 'resolved') {
      if (rec.result === 'granted') return out(FB.TC(STAGE, 'Granted'), FB.T('Granted: {name} rules {place}.', p));
      if (rec.result === 'declined') return out(FB.TC(STAGE, 'Refused'), FB.T('Refused.'));
      return out(FB.TC(STAGE, 'Closed'), partitionClosed(s, rec, def));
    }
    var when = time(s, def);
    if (when !== 'open') return out(when === 'early' ? FB.TC(STAGE, 'Not open yet') : FB.TC(STAGE, 'Closed'),
      partitionBlockText(s, rec, def, 'date'));
    var facts = partitionFacts(s, rec, def), reason = partitionBlock(s, rec, def, facts);
    return out(FB.TC(STAGE, 'Waiting'), reason ? partitionBlockText(s, rec, def, reason) :
      FB.T('Waiting for {party} to agree.', { party:awaitedParty(s, rec, def, facts) }));
  }
  /* The shared story status shape (docs/designs/stories.md). */
  function partitionStatus(s, rec, def) {
    var p = partitionWords(s, rec, def), now = partitionProgress(s, rec, def);
    var stage = FB.T('Partition of {place} · {state}', { place:p.place, state:now.state });
    return { phase:rec.phase, name:stage, stage:stage, lines:[], facts:[
      [FB.T('Your role'), partitionRole(s, rec, def)],
      [FB.T('Counties'), p.counties],
      [FB.T('Recipient'), p.name],
      [FB.T('Overlord'), courtText(s, def, def.grant.liege)],
      [FB.T('Window'), windowText(def)],
      [FB.T('Now'), now.text]
    ] };
  }
  function partitionChoice(s, rec, def, party) {
    var p = partitionWords(s, rec, def), label, detail;
    if (party === 'grantor') {
      label = FB.T('Grant {place} to {name}', p);
      detail = FB.T('{name} rules {counties} as a {term:vassal} of {liege} once every party agrees. You keep {capital}.', p);
    } else {
      label = party === 'beneficiary' ? FB.T('Accept {place} from {grantor}', p) :
        FB.T('Approve {name} as ruler of {place}', p);
      detail = FB.T('{name} rules {counties} as a {term:vassal} of {liege} once every party agrees.', p);
    }
    return [{ id:'accept_' + party, label:label, detail:detail },
      { id:'decline_' + party, label:FB.T('Refuse the partition of {place}', p),
        detail:FB.renderMessage(FB.msg('fx.ui.story_partition_refuse', { forms:{ select:'plural', param:'count', cases:{
          one:'{counties} stays with {grantor}. The offer closes for good.',
          other:'{counties} stay with {grantor}. The offer closes for good.' } } },
          { count:p.count, counties:p.counties, grantor:p.grantor }),
          { state:s, viewer:s.player && s.player.charId }) }];
  }
  FB.storyPartition = { quote:partitionQuote, grant:grantPartition };
  FB.stories.registerType('partition', function (def) {
    partitionDefinition(def);
    return { id:def.id, kind:'world', requires:def.requires || [],
      init:function (s) {
        var d = effective(s, def), actor = ruler(s, d.actor.realmId);
        if (!actor) return null;
        if (!FB.world.byId[d.actor.capital] || d.grant.counties.some(function (pid) { return !FB.world.byId[pid]; }))
          throw new Error('A partition must name existing counties.');
        var b = FB.makeCharacter(s, Object.assign({}, d.beneficiary,
          { station:3, role:'notable', quality:2, traits:d.beneficiary.trait ? [d.beneficiary.trait] : [] }));
        b.homeProvinceId = d.actor.capital;
        return { phase:'pending', result:null, reason:null, outcomeTurn:null,
          actorId:actor.id, actorGeneration:FB.realmRulerGeneration(s, d.actor.realmId),
          beneficiaryId:b.id, approvals:{}, approvalStamp:null, realmId:null,
          liegeGeneration:null, grantedCounties:[] };
      },
      day:function (s, rec) { partitionDay(s, rec, effective(s, def)); },
      title:function (s) { return text(s, def, 'name'); },
      intro:function (s) { return text(s, def, 'desc'); },
      choices:function (s, rec) {
        var d = effective(s, def);
        if (rec.phase !== 'pending' || time(s, d) !== 'open') return [];
        var out = [];
        partitionParties(rec, d).forEach(function (party) {
          if (partyIsPlayer(s, rec, d, party)) out = out.concat(partitionChoice(s, rec, d, party));
        });
        return out;
      },
      quote:function (s, rec, choice) { return partitionQuote(s, rec, effective(s, def), choice); },
      blocker:function (s, rec, reason) { return partitionBlockText(s, rec, effective(s, def), reason); },
      review:function (s, rec) {
        var d = effective(s, def), p = partitionWords(s, rec, d);
        return [FB.T('Recipient: {name}.', p),
          FB.T('Counties: {names}.', { names:p.counties }),
          FB.T('{Term:liege}: {name}.', { name:p.liege })];
      },
      apply:function (s, rec, choice, reviewed) {
        var d = effective(s, def), q = partitionQuote(s, rec, d, choice);
        if (!q.allowed || !reviewed || reviewed.id !== choice || reviewed.stamp !== q.stamp) return false;
        if (choice.indexOf('decline_') === 0) finish(s, rec, d, 'declined', 'player_declined');
        else {
          var facts = q.facts;
          var terms = partitionTerms(facts);
          if (rec.approvalStamp !== terms) rec.approvals = {};
          rec.approvalStamp = terms;
          rec.approvals[choice.slice(7)] = true;
          partitionDay(s, rec, d);
        }
        return true;
      },
      status:function (s, rec) { return partitionStatus(s, rec, effective(s, def)); },
      validate:function (rec, s) {
        basicRecord(rec, s, def, ['granted','declined','diverted','interrupted']);
        if (rec.phase === 'started' || !id(rec.actorId) || !id(rec.beneficiaryId) ||
            !Number.isInteger(rec.actorGeneration) || rec.actorGeneration < 1 || !plain(rec.approvals) ||
            rec.actorId === rec.beneficiaryId ||
            Object.keys(rec.approvals).some(function (p) { return partitionParties(rec, def).indexOf(p) < 0 || rec.approvals[p] !== true; }) ||
            rec.approvalStamp !== null && typeof rec.approvalStamp !== 'string' ||
            rec.realmId !== null && rec.realmId !== def.grant.realmId ||
            !Array.isArray(rec.grantedCounties) ||
            (rec.result === 'granted' ? rec.realmId !== def.grant.realmId ||
              JSON.stringify(rec.grantedCounties) !== JSON.stringify(def.grant.counties) ||
              !Number.isInteger(rec.liegeGeneration) || rec.liegeGeneration < 1 ||
              rec.approvalStamp === null || partitionParties(rec, def).some(function (p) { return rec.approvals[p] !== true; }) :
              rec.realmId !== null || rec.grantedCounties.length || rec.liegeGeneration !== null)) invalid(def.id);
        if (rec.phase === 'pending' && (!s.chars[rec.beneficiaryId] || !s.chars[rec.actorId])) invalid(def.id + '.parties');
      } };
  }, 'js/story_history.js', partitionDefinition);

  function holyDefinition(def, lookup, bookmark) {
    baseDefinition(def);
    if (!id(def.systemId) || !FBDATA.systems[def.systemId] || !id(def.religion) || !own(FBDATA.religions, def.religion) || !plain(def.target) || !id(def.target.kingdomId) ||
        def.historySeed !== undefined && (!Array.isArray(def.historySeed) || def.historySeed.length > 24))
      throw new Error('Invalid dated holy-war definition.');
    if (def.openingCall !== undefined && (!plain(def.openingCall) || def.openingCall.schema !== 1 ||
        Object.keys(def.openingCall).some(function (key) { return key !== 'schema'; }) ||
        (def.historySeed || []).length)) throw new Error('Invalid opening holy-war preparation.');
    if (bookmark && !FB.titleIds.resolve('kingdom', def.target.kingdomId, bookmark.kingdoms))
      throw new Error('A holy-war story must name an existing kingdom.');
    var ids = {};
    (def.historySeed || []).forEach(function (row) {
      if (!plain(row) || !id(row.id) || ids[row.id] || !date(row.date) ||
          !id(row.target) || ['attackers','defenders','partial','diverted'].indexOf(row.outcome) < 0 ||
          number(row.date) >= number(def.firstDate)) throw new Error('Invalid holy-war history seed.');
      ids[row.id] = true;
    });
  }
  function holyQuote(s, rec, def, choice) {
    var head = FB.religiousHeadSnapshot(s, def.religion), pope = popeSnapshot(s, def.religion);
    var facts = { phase:rec.phase, time:time(s, def), head:head && head.id || null,
      claimant:pope && pope.id || null, generation:head && FB.realmRulerGeneration(s, head.id),
      campaign:s.greatHolyWar && s.greatHolyWar.id || null,
      history:JSON.stringify(s.greatHolyWarHistory || null),
      targets:FB.greatHolyWarTargets(s, def.religion, true),
      opening:rec.openingCall || null,
      eligible:!!head && FB.canCallGreatHolyWar(s, def.religion, def.target.kingdomId, head.id, true) };
    var allowed = rec.phase === 'pending' && facts.time === 'open' && (choice === 'decline' || facts.eligible) &&
      (choice === 'call' || choice === 'decline') && !!head &&
      (controlled(s, head.id) || !!(pope && pope.id === s.player.charId)) &&
      (!rec.openingCall || rec.openingCall.disposition === 'pending' && !s.greatHolyWar && openingHeadMatches(s, rec, def));
    return { id:choice, allowed:allowed, reason:allowed ? null : 'head_or_target',
      facts:facts, stamp:JSON.stringify(facts) };
  }
  function popeSnapshot(s, faith) {
    var papacy = FB.papacyState && FB.papacyState(s, faith);
    var obedience = papacy && papacy.obediences && papacy.obediences[papacy.romanObedience];
    var c = obedience && s.chars[obedience.claimantId];
    return c && !c.dead ? c : null;
  }
  function holyCall(s, rec, def) {
    if (rec.phase !== 'pending' || rec.openingCall && !openingHeadMatches(s, rec, def)) return false;
    var head = FB.religiousHeadOf(s, def.religion);
    if (!head || !FB.canCallGreatHolyWar(s, def.religion, def.target.kingdomId, head.id)) return false;
    var campaign = FB.callGreatHolyWar(s, def.religion, def.target.kingdomId, head.id);
    if (!campaign) return false;
    holyBind(s, rec, def, campaign);
    return true;
  }
  function holyBind(s, rec, def, campaign) {
    rec.phase = 'started'; rec.campaignId = campaign.id; rec.calledTurn = campaign.calledTurn;
    rec.callerRealmId = campaign.callerRealm;
    rec.callerCharacterId = campaign.callerClaimantId || (ruler(s, campaign.callerRealm) || {}).id || null;
    if (rec.openingCall) {
      rec.openingCall.disposition = 'called'; rec.openingCall.evaluatedTurn = s.turn;
    }
    notice(s, def, 'called');
  }
  function openingHead(s, def) {
    var head = FB.religiousHeadSnapshot(s, def.religion), pope = popeSnapshot(s, def.religion);
    var person = pope || head && ruler(s, head.id);
    return { realmId:head && head.id || null, characterId:person && !person.dead ? person.id : null,
      generation:head && FB.realmRulerGeneration(s, head.id) || null };
  }
  function openingHeadMatches(s, rec, def) {
    var current = openingHead(s, def), saved = rec.openingCall;
    return !!current.realmId && !!current.characterId && saved.headRealmId === current.realmId &&
      saved.headCharacterId === current.characterId && saved.headGeneration === current.generation;
  }
  function openingUnavailable(s, rec, def, reason) {
    rec.openingCall.disposition = 'unavailable'; rec.openingCall.evaluatedTurn = s.turn;
    finish(s, rec, def, 'diverted', reason);
  }
  function openingDay(s, rec, def) {
    if (rec.phase !== 'pending' || rec.openingCall.disposition !== 'pending') return;
    if (time(s, def) === 'late') { openingUnavailable(s, rec, def, 'window_closed'); return; }
    if (!openingHeadMatches(s, rec, def)) { openingUnavailable(s, rec, def, 'head_changed'); return; }
    if (time(s, def) === 'early') return;
    if (!FB.systemEnabled(s, def.systemId, { faith:def.religion })) {
      openingUnavailable(s, rec, def, 'system_disabled'); return;
    }
    var campaign = s.greatHolyWar;
    if (campaign) {
      var callDate = FB.dateAtTurn(s, campaign.calledTurn);
      if (campaign.callingReligion === def.religion && campaign.targetKingdom === def.target.kingdomId &&
          campaign.callerRealm === rec.openingCall.headRealmId &&
          (!campaign.callerClaimantId || campaign.callerClaimantId === rec.openingCall.headCharacterId) &&
          campaign.calledTurn >= rec.openingCall.evaluatedTurn && number(callDate) >= number(def.firstDate) &&
          number(callDate) <= number(def.lastDate)) holyBind(s, rec, def, campaign);
      else openingUnavailable(s, rec, def, 'campaign_conflict');
      return;
    }
    var head = FB.religiousHeadSnapshot(s, def.religion), pope = popeSnapshot(s, def.religion);
    if (!FB.canCallGreatHolyWar(s, def.religion, def.target.kingdomId, head.id, true)) {
      openingUnavailable(s, rec, def, 'head_or_target'); return;
    }
    if (controlled(s, head.id) || pope && pope.id === s.player.charId) return;
    holyCall(s, rec, def);
  }
  /* Automatic dispatch consults only attached opted-in records. Compilation and
     restore never run preparation, and an absent old story is never attached. */
  FB.prepareOpeningHolyWarCalls = function (s) {
    Object.keys(s.stories || {}).forEach(function (storyId) {
      var story = FB.stories.get(storyId), def = story && story.declaration, rec = s.stories[storyId];
      if (def && def.type === 'holy_war' && def.openingCall && rec && rec.openingCall)
        openingDay(s, rec, effective(s, def));
    });
  };
  FB.openingHolyWarCallPending = function (s, religionId) {
    return Object.keys(s.stories || {}).some(function (storyId) {
      var story = FB.stories.get(storyId), def = story && story.declaration, rec = s.stories[storyId];
      return def && def.type === 'holy_war' && def.religion === religionId &&
        rec && rec.phase === 'pending' && rec.openingCall && rec.openingCall.disposition === 'pending';
    });
  };
  function validateOpeningCall(rec, s, def) {
    if (!own(rec, 'openingCall')) {
      if (def.openingCall) invalid(def.id + '.openingCall');
      return;
    }
    var o = rec.openingCall, campaign = s.greatHolyWar;
    if (!def.openingCall || !plain(o) || o.schema !== 1 ||
        Object.keys(o).length !== 6 || Object.keys(o).some(function (key) {
          return ['schema','evaluatedTurn','disposition','headRealmId','headCharacterId','headGeneration'].indexOf(key) < 0;
        }) || !Number.isInteger(o.evaluatedTurn) || o.evaluatedTurn < 0 || o.evaluatedTurn > s.turn ||
        ['pending','called','declined','unavailable'].indexOf(o.disposition) < 0 ||
        o.headRealmId !== null && !id(o.headRealmId) || o.headCharacterId !== null && !id(o.headCharacterId) ||
        o.headGeneration !== null && (!Number.isInteger(o.headGeneration) || o.headGeneration < 1) ||
        (o.headRealmId === null) !== (o.headGeneration === null) ||
        o.disposition !== 'unavailable' && (!o.headRealmId || !o.headCharacterId) ||
        o.disposition === 'pending' && rec.phase !== 'pending' ||
        o.disposition === 'pending' && (!s.chars[o.headCharacterId] || !s.realms[o.headRealmId]) ||
        o.disposition === 'called' && (rec.phase !== 'started' && ['won','failed'].indexOf(rec.result) < 0 ||
          rec.callerRealmId !== o.headRealmId || rec.callerCharacterId !== o.headCharacterId ||
          rec.calledTurn > o.evaluatedTurn) ||
        o.disposition === 'declined' && rec.result !== 'declined' ||
        o.disposition === 'unavailable' && rec.result !== 'diverted' ||
        o.disposition !== 'called' && (rec.campaignId !== null || rec.calledTurn !== null ||
          rec.callerRealmId !== null || rec.callerCharacterId !== null) ||
        ['declined','unavailable'].indexOf(o.disposition) >= 0 && rec.outcomeTurn !== o.evaluatedTurn)
      invalid(def.id + '.openingCall');
    if (o.disposition === 'called') {
      var callDate = FB.dateAtTurn(s, rec.calledTurn);
      if (number(callDate) < number(def.firstDate) || number(callDate) > number(def.lastDate) ||
          campaign && campaign.id === rec.campaignId && (campaign.callingReligion !== def.religion ||
            campaign.targetKingdom !== def.target.kingdomId || campaign.callerRealm !== rec.callerRealmId ||
            campaign.calledTurn !== rec.calledTurn || campaign.callerClaimantId &&
              campaign.callerClaimantId !== rec.callerCharacterId)) invalid(def.id + '.openingCall.campaign');
    }
  }
  function holyDay(s, rec, def) {
    if (rec.phase === 'resolved') return;
    if (rec.phase === 'started') {
      if (s.greatHolyWar && s.greatHolyWar.id === rec.campaignId) return;
      var completed = (s.greatHolyWarHistory && s.greatHolyWarHistory.campaigns || [])
        .filter(function (row) { return row.id === rec.campaignId; })[0];
      finish(s, rec, def, completed && completed.outcome === 'attackers' ? 'won' : 'failed',
        completed ? 'campaign_ended' : 'campaign_missing');
      return;
    }
    if (rec.openingCall) { openingDay(s, rec, def); return; }
    if (!FB.systemEnabled(s, def.systemId, { faith:def.religion })) return;
    if (time(s, def) === 'early') return;
    if (time(s, def) === 'late') { finish(s, rec, def, 'diverted', 'window_closed'); return; }
    var targets = FB.greatHolyWarTargets(s, def.religion);
    if (!targets.some(function (t) { return t.kingdomId === def.target.kingdomId; })) {
      finish(s, rec, def, 'diverted', 'target_restored'); return;
    }
    var head = FB.religiousHeadOf(s, def.religion), pope = FB.romanPope && FB.romanPope(s, def.religion);
    if (!head || controlled(s, head.id) || pope && pope.id === s.player.charId) return;
    holyCall(s, rec, def);
  }
  FB.validateHistoricalHolyWarState = function (s) {
    var history = s.greatHolyWarHistory;
    if (!history || !Array.isArray(history.campaigns)) return true;
    /* Detached save validation precedes world activation. Resolve against the
       saved bookmark, including its legacy aliases, not the currently played map. */
    var bookmark = FB.campaignBookmark(s);
    var kingdoms = bookmark && bookmark.kingdoms || {};
    var seen = {}, start = s.start && { year:s.start.year, season:s.start.season, day:s.start.day };
    history.campaigns.forEach(function (row) {
      if (!row || !own(row, 'historical')) return;
      if (row.historical !== true || !id(row.id) || seen[row.id] || !date(row.date) || !date(start) ||
          number(row.date) >= number(start) || row.turn !== number(row.date) - number(start) ||
          !own(FBDATA.religions, row.religion) || !id(row.target) ||
          !(own(kingdoms, row.target) || own(kingdoms, 'k_' + row.target)) ||
          ['attackers','defenders','partial','diverted'].indexOf(row.outcome) < 0) invalid('greatHolyWarHistory');
      seen[row.id] = true;
    });
    return true;
  };
  // The same name the campaign's own event context uses.
  function targetName(def) {
    var kingdom = FBDATA.kingdoms[def.target.kingdomId];
    return kingdom ? kingdom.name : def.target.kingdomId;
  }
  function headControlled(s, def) {
    var head = FB.religiousHeadSnapshot(s, def.religion), pope = popeSnapshot(s, def.religion);
    return !!(head && controlled(s, head.id) || pope && pope.id === s.player.charId);
  }
  function headName(s, def) {
    var pope = popeSnapshot(s, def.religion);
    if (pope) return FB.fullName(pope);
    var head = FB.religiousHeadSnapshot(s, def.religion);
    return s.realms[head.id] ? FB.realmNameParam(s, head.id) : FB.fullName(head);
  }
  function openingOpen(s, rec, def) {
    return !rec.openingCall || rec.openingCall.disposition === 'pending' && openingHeadMatches(s, rec, def);
  }
  /* The first cause that keeps the call closed, read from the quote's facts.
     An observer is not told that someone else controls the head. */
  function holyBlockText(s, rec, def, facts, observing) {
    var p = { kingdom:targetName(def) };
    if (facts.time !== 'open') return dateBlockText(def, facts.time);
    if (!facts.head) return FB.T('Your faith has no religious head.');
    if (!observing && !headControlled(s, def))
      return FB.T('Only {head} can call this holy war.', { head:headName(s, def) });
    if (!openingOpen(s, rec, def)) return FB.T('The head who could make this call has changed.');
    if (s.greatHolyWar) return FB.T('Another holy war is already underway.');
    var until = ((s.greatHolyWarHistory || {}).cooldownUntil || {})[def.religion] || 0;
    if (until > s.turn) return FB.renderMessage(FB.msg('fx.ui.story_holy_war_cooldown', { forms:{
      select:'plural', param:'days', cases:{
        one:'Your faith called a holy war recently; wait {days} more day.',
        other:'Your faith called a holy war recently; wait {days} more days.' } } }, { days:until - s.turn }),
      { state:s, viewer:s.player && s.player.charId });
    if (!facts.targets.some(function (t) { return (t.targetId || t.kingdomId) === def.target.kingdomId; }))
      return FB.T('{kingdom} is no longer a valid target.', p);
    return FB.T('The head’s authority is too low, the faith is divided by schism, or the treasury is under restriction.');
  }
  function holyEnded(def, rec) {
    var p = { kingdom:targetName(def), last:def.lastDate.year }, reason = rec.reason;
    if (rec.result === 'won') return FB.T('Ended: the holy war for {kingdom} was won.', p);
    if (reason === 'campaign_missing') return FB.T('Ended: no result of the holy war was recorded.');
    if (rec.result === 'failed') return FB.T('Ended: the holy war for {kingdom} failed.', p);
    if (rec.result === 'declined') return FB.T('Ended: the call was declined.');
    if (reason === 'window_closed') return FB.T('Ended: the window closed after {last}.', p);
    if (reason === 'target_restored') return FB.T('Ended: {kingdom} is no longer a valid target.', p);
    if (reason === 'head_changed') return FB.T('Ended: the head who could make this call has changed.');
    if (reason === 'campaign_conflict') return FB.T('Ended: another holy war was already underway.');
    if (reason === 'system_disabled') return FB.T('Ended: holy wars are not available.');
    if (reason === 'head_or_target') return FB.T('Ended: the head could not call a holy war on {kingdom}.', p);
    return FB.T('Ended: history took another course.');
  }
  function holyProgress(s, rec, def) {
    function out(state, text) { return { state:state, text:text }; }
    if (rec.phase === 'started') {
      var since = FB.dateAtTurn(s, rec.calledTurn);
      return out(FB.TC(STAGE, 'Underway'), FB.T('Underway since {season} {year}.',
        { season:FB.seasonName(since.season), year:since.year }));
    }
    if (rec.phase === 'resolved') {
      var states = { won:FB.TC(STAGE, 'Won'), failed:FB.TC(STAGE, 'Failed'),
        declined:FB.TC(STAGE, 'Declined'), diverted:FB.TC(STAGE, 'Closed') };
      return out(states[rec.result], holyEnded(def, rec));
    }
    var facts = holyQuote(s, rec, def, 'call').facts;
    if (facts.time === 'open' && facts.eligible && openingOpen(s, rec, def))
      return out(FB.TC(STAGE, 'Ready to call'), FB.T('Ready to call.'));
    var caller = headControlled(s, def), person = s.chars[s.player.charId];
    var text = caller || facts.time !== 'open' || person && person.religion === def.religion ?
      holyBlockText(s, rec, def, facts, !caller) : FB.T('Waiting until the religious head can call it.');
    return out(facts.time === 'late' ? FB.TC(STAGE, 'Closed') : FB.TC(STAGE, 'Waiting'), text);
  }
  function holyStatus(s, rec, def) {
    var now = holyProgress(s, rec, def), kingdom = targetName(def);
    var caller = rec.phase === 'pending' ? headControlled(s, def) : rec.result === 'declined' ||
      !!rec.callerRealmId && (rec.callerCharacterId === s.player.charId || controlled(s, rec.callerRealmId));
    var stage = FB.T('Holy war on {kingdom} · {state}', { kingdom:kingdom, state:now.state });
    return { phase:rec.phase, name:stage, stage:stage, lines:[], facts:[
      [FB.T('Your role'), caller ? FB.T('Caller') : FB.T('Observer')],
      [FB.T('Target'), kingdom],
      [FB.T('Window'), windowText(def)],
      [FB.T('Now'), now.text]
    ] };
  }
  FB.stories.registerType('holy_war', function (def) {
    holyDefinition(def);
    return { id:def.id, kind:'world', requires:def.requires || [],
      init:function (s) {
        var seeded = [];
        if (FB.systemEnabled(s, def.systemId, { faith:def.religion })) {
          if (!FB.titleLevels.has('kingdom', def.target.kingdomId) ||
              (def.historySeed || []).some(function (row) { return !FB.titleLevels.has('kingdom', row.target); }))
            throw new Error('A holy-war story must name existing kingdoms.');
          FB.ensureGreatHolyWar(s);
          var history = s.greatHolyWarHistory, start = { year:s.start.year, season:s.start.season, day:s.start.day };
          (def.historySeed || []).forEach(function (row) {
            if (number(row.date) >= number(start) || history.campaigns.some(function (past) { return past.id === row.id; })) return;
            history.campaigns.push({ id:row.id, religion:def.religion, target:row.target,
              outcome:row.outcome, reason:'historical_record', historical:true,
              date:Object.assign({}, row.date), turn:number(row.date) - number(start) });
            seeded.push(row.id);
          });
          if (seeded.length) {
            history.sequence = Math.max(history.sequence, history.campaigns.length);
            history.firstCall[def.religion] = true; history.firstLaunched[def.religion] = true;
            history.unlockChecked[def.religion] = true;
            while (history.campaigns.length > 24) history.campaigns.shift();
          }
        }
        var rec = { phase:'pending', result:null, reason:null, outcomeTurn:null,
          campaignId:null, calledTurn:null, callerRealmId:null, callerCharacterId:null, seededIds:seeded };
        if (def.openingCall) {
          var d = effective(s, def);
          if (FB.faithHasSystem(d.religion, 'papacy', s) && FB.ensurePapacy) FB.ensurePapacy(s, d.religion);
          var current = FB.religiousHeadOf(s, d.religion);
          /* Materialize the existing compact ruler once through its canonical
             owner; previews and restore retain the saved person unchanged. */
          if (current && s.realms[current.id] && current.id !== 'player') FB.realmRulerCharacter(s, current.id);
          var head = openingHead(s, d);
          rec.openingCall = { schema:1, evaluatedTurn:s.turn, disposition:'pending',
            headRealmId:head.realmId, headCharacterId:head.characterId, headGeneration:head.generation };
          openingDay(s, rec, d);
        }
        return rec;
      },
      day:function (s, rec) { holyDay(s, rec, effective(s, def)); },
      title:function (s) { return text(s, def, 'name'); },
      intro:function (s) { return text(s, def, 'desc'); },
      choices:function (s, rec) {
        var d = effective(s, def);
        if (rec.phase !== 'pending' || time(s, d) !== 'open' || !headControlled(s, d)) return [];
        var p = { kingdom:targetName(d) };
        return [{ id:'call', label:FB.T('Call a holy war on {kingdom}', p),
          detail:FB.T('The faithful go to war for {kingdom} at once; armies and allies decide it.', p) },
          { id:'decline', label:FB.T('Let the call on {kingdom} pass', p),
            detail:FB.T('No holy war now. You can still call one later through religious decisions.') }];
      },
      quote:function (s, rec, choice) { return holyQuote(s, rec, effective(s, def), choice); },
      blocker:function (s, rec) {
        var d = effective(s, def);
        return holyBlockText(s, rec, d, holyQuote(s, rec, d, 'call').facts);
      },
      apply:function (s, rec, choice, reviewed) {
        var d = effective(s, def), q = holyQuote(s, rec, d, choice);
        if (!q.allowed || !reviewed || reviewed.id !== choice || reviewed.stamp !== q.stamp) return false;
        if (choice === 'decline') {
          if (rec.openingCall) {
            rec.openingCall.disposition = 'declined'; rec.openingCall.evaluatedTurn = s.turn;
          }
          finish(s, rec, d, 'declined', 'player_declined'); return true;
        }
        return holyCall(s, rec, d);
      },
      status:function (s, rec) {
        if (rec.phase === 'pending' && time(s, def) === 'early') return null;
        return holyStatus(s, rec, effective(s, def));
      },
      validate:function (rec, s) {
        basicRecord(rec, s, def, ['won','failed','declined','diverted']);
        validateOpeningCall(rec, s, def);
        var seeds = (def.historySeed || []).map(function (r) { return r.id; });
        if (!Array.isArray(rec.seededIds) || rec.seededIds.some(function (v, i) { return seeds.indexOf(v) < 0 || rec.seededIds.indexOf(v) !== i; }) ||
            rec.campaignId !== null && !/^ghw_[0-9]+$/.test(rec.campaignId) ||
            rec.calledTurn !== null && (!Number.isInteger(rec.calledTurn) || rec.calledTurn < 0 || rec.calledTurn > s.turn) ||
            rec.callerRealmId !== null && !id(rec.callerRealmId) || rec.callerCharacterId !== null && !id(rec.callerCharacterId) ||
            (rec.phase === 'started' || rec.result === 'won' || rec.result === 'failed') &&
              (!rec.campaignId || rec.calledTurn === null || !rec.callerRealmId) ||
            rec.phase === 'pending' && (rec.campaignId !== null || rec.calledTurn !== null || rec.callerRealmId !== null || rec.callerCharacterId !== null))
          invalid(def.id);
      } };
  }, 'js/story_history.js', holyDefinition);
})();
