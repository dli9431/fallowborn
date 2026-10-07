/* Data-defined conditional foundations. A remnant may secede at peace; a
   conquered county must win its ordinary revolt before a court is founded. */
(function () {
  'use strict';
  function plain(row) { return !!row && typeof row === 'object' && !Array.isArray(row); }
  function id(value) { return typeof value === 'string' && /^[a-z][a-z0-9_]*$/.test(value); }
  function fresh() {
    return { phase:'pending', result:null, reason:null, outcomeTurn:null,
      startedTurn:null, deadline:null, rebellionId:null, formerOwnerId:null,
      realmId:null, founderId:null, founderMemberId:null, counties:[] };
  }
  function closed(s, def) {
    return s.date.year > def.lastYear || s.date.year === def.lastYear &&
      s.date.season === 3 && s.date.day === 90;
  }
  function realmId(s, authored) { return FB.startRealmId(s, authored); }
  function includes(s, ids, value) {
    return ids.some(function (rid) { return realmId(s, rid) === value; });
  }
  function protectedCounty(s, pid) {
    var holder = s.holder[pid];
    return s.owner[pid] === 'player' || holder === 'player' ||
      FB.liegeChain(s, holder).indexOf('player') >= 0;
  }
  function collapse(s, def) {
    return includes(s, def.collapse.ownerIds, s.owner[def.collapse.provinceId]) &&
      s.owner[def.collapse.provinceId] !== realmId(s, def.collapse.formerRealmId);
  }
  function community(s, def) {
    return FB.countyReligionShare(s, def.realm.capital, def.community.faithId) >= def.community.minimumShare;
  }
  function finish(s, rec, def, result, reason) {
    if (rec.phase === 'resolved') return;
    rec.phase = 'resolved'; rec.result = result; rec.reason = reason; rec.outcomeTurn = s.turn;
    var message = def.news && def.news[result];
    if (message) FB.news(s, FB.msg(message.key, message.text, {}));
  }
  function found(s, rec, def, counties, formerOwnerId, reason) {
    var realm = FB.foundPolity(s, def.realm, counties, formerOwnerId);
    if (!realm) return null;
    rec.realmId = realm.id;
    var ruler = FB.stories.ruler(s, realm.id);
    rec.founderId = ruler && ruler.id || null;
    rec.founderMemberId = realm.succession.rulerMemberId;
    rec.formerOwnerId = formerOwnerId; rec.counties = counties.slice();
    finish(s, rec, def, 'founded', reason);
    return realm;
  }
  function day(s, rec, def) {
    if (rec.phase === 'resolved' || s.date.year < def.firstYear) return;
    var pid = def.realm.capital, owner = s.owner[pid];
    if (s.realms[def.realm.id]) { finish(s, rec, def, 'diverted', 'realm_exists'); return; }
    if (protectedCounty(s, pid)) { finish(s, rec, def, 'diverted', 'player_control'); return; }
    if (rec.phase === 'rebelling') {
      var group = FB.rebellionById(s, rec.rebellionId);
      if (!group || !group.counties[pid]) { finish(s, rec, def, 'failed', 'revolt_ended'); return; }
      if (owner !== rec.formerOwnerId || group.target !== rec.formerOwnerId || !collapse(s, def) || !community(s, def)) {
        finish(s, rec, def, 'diverted', 'conditions_changed'); return;
      }
      if (s.turn >= rec.deadline) finish(s, rec, def, 'failed', 'revolt_timeout');
      return;
    }
    if (closed(s, def)) { finish(s, rec, def, 'diverted', 'window_closed'); return; }
    if (!includes(s, def.remnantRealmIds, owner) && !includes(s, def.revoltRealmIds, owner)) {
      finish(s, rec, def, 'diverted', 'local_control_changed'); return;
    }
    /* A delayed conquest may still open the foundation inside its window.
       Neither a surviving former seat nor a healthy conquered county is forced. */
    if (!collapse(s, def) || !community(s, def)) return;
    if (includes(s, def.remnantRealmIds, owner)) {
      if (!s.realms[owner] || !s.realms[owner].alive || FB.isRealmAtWar(s, owner) ||
          FB.countyInOpenRevolt(s, pid) ||
          (s.armies || []).some(function (a) { return a.at === pid && a.men > 0; })) return;
      found(s, rec, def, [pid], owner, 'surviving_remnant');
      return;
    }
    var revolt = FB.countyInOpenRevolt(s, pid);
    if (!revolt || revolt.target !== owner) return;
    rec.phase = 'rebelling'; rec.rebellionId = revolt.id; rec.formerOwnerId = owner;
    rec.startedTurn = s.turn; rec.deadline = s.turn + def.durationDays;
  }
  function foundRevolt(s, rec, def, group, counties) {
    if (rec.phase === 'resolved' || s.date.year < def.firstYear ||
        FB.rebellionById(s, group.id) !== group ||
        !(s.armies || []).some(function (a) { return a.rebellionId === group.id && a.men > 0; }) ||
        Object.keys(group.counties).some(function (pid) { return !group.counties[pid].occupied; }) ||
        rec.phase === 'pending' && closed(s, def) ||
        rec.phase === 'rebelling' && (rec.rebellionId !== group.id || s.turn >= rec.deadline) ||
        s.realms[def.realm.id] || !collapse(s, def) || !community(s, def) ||
        !includes(s, def.revoltRealmIds, group.target) || counties.indexOf(def.realm.capital) < 0 ||
        counties.some(function (pid) {
          return protectedCounty(s, pid) || s.owner[pid] !== group.target ||
            !group.counties[pid] || !group.counties[pid].occupied;
        })) return null;
    return found(s, rec, def, counties, group.target, 'revolt_independence');
  }
  function validateDefinition(def) {
    function ids(rows) { return Array.isArray(rows) && rows.length && rows.every(id); }
    var realm = def.realm, loss = def.collapse, faith = def.community;
    if (typeof def.name !== 'string' || typeof def.desc !== 'string' ||
        !Number.isInteger(def.firstYear) || !Number.isInteger(def.lastYear) || def.lastYear < def.firstYear ||
        !Number.isInteger(def.durationDays) || def.durationDays <= 0 ||
        !plain(loss) || !id(loss.provinceId) || !id(loss.formerRealmId) || !ids(loss.ownerIds) ||
        loss.ownerIds.indexOf(loss.formerRealmId) >= 0 ||
        !ids(def.remnantRealmIds) || !ids(def.revoltRealmIds) ||
        def.remnantRealmIds.some(function (rid) { return def.revoltRealmIds.indexOf(rid) >= 0; }) ||
        !plain(faith) || !FBDATA.religions[faith.faithId] ||
        !Number.isFinite(faith.minimumShare) || faith.minimumShare <= 0 || faith.minimumShare > 1 ||
        !plain(realm) || !id(realm.id) || realm.id === 'player' || !id(realm.capital) ||
        realm.capital === loss.provinceId || typeof realm.name !== 'string' || !realm.name ||
        !/^#[a-f0-9]{6}$/i.test(realm.color) || [1,2,3,4].indexOf(realm.rank) < 0 ||
        !Number.isFinite(realm.aggression) || realm.aggression < 0 ||
        !FBDATA.governmentForms[realm.government] || !FBDATA.religions[realm.religion] ||
        !plain(realm.ruler) || typeof realm.ruler.name !== 'string' || !realm.ruler.name ||
        ['m','f'].indexOf(realm.ruler.sex) < 0 || !FBDATA.cultures[realm.ruler.culture] ||
        !Number.isInteger(realm.ruler.born) || realm.ruler.born > def.firstYear - 16 ||
        !Number.isFinite(realm.ruler.mar) || FBDATA.rulerTraits.indexOf(realm.ruler.trait) < 0)
      throw new Error('Invalid polity foundation definition.');
    for (var event in def.news || {})
      if (['founded','failed','diverted'].indexOf(event) < 0 || !plain(def.news[event]) ||
          !/^news\.[a-z0-9_.-]+$/.test(def.news[event].key) || typeof def.news[event].text !== 'string')
        throw new Error('Invalid polity foundation message.');
  }
  function validate(rec, s, def) {
    function bad(field) { throw new Error(FB.T('Invalid v4 save field at {path}.',
      { path:'state.stories.' + def.id + '.' + field })); }
    if (!plain(rec) || ['pending','rebelling','resolved'].indexOf(rec.phase) < 0) bad('phase');
    if (rec.phase === 'resolved' ? ['founded','failed','diverted'].indexOf(rec.result) < 0 : rec.result !== null) bad('result');
    for (var key of ['startedTurn','deadline','outcomeTurn'])
      if (rec[key] !== null && (!Number.isInteger(rec[key]) || rec[key] < 0 ||
          key !== 'deadline' && rec[key] > s.turn)) bad(key);
    for (var field of ['reason','rebellionId','formerOwnerId','realmId','founderId','founderMemberId'])
      if (rec[field] !== null && (typeof rec[field] !== 'string' || !rec[field])) bad(field);
    if (rec.phase === 'resolved' ? rec.outcomeTurn === null || rec.reason === null :
        rec.outcomeTurn !== null || rec.reason !== null) bad('outcomeTurn');
    if (rec.phase === 'rebelling' && (!rec.rebellionId || !rec.formerOwnerId || rec.startedTurn === null || rec.deadline === null)) bad('rebellionId');
    if (rec.phase === 'pending' && (rec.startedTurn !== null || rec.rebellionId !== null || rec.formerOwnerId !== null)) bad('startedTurn');
    if ((rec.startedTurn === null) !== (rec.deadline === null) ||
        rec.deadline !== null && rec.deadline !== rec.startedTurn + def.durationDays) bad('deadline');
    var bookmark = FB.bookmark(s.start && s.start.id);
    var provinceIds = bookmark && bookmark.provinces.map(function (p) { return p.id; }) || [];
    if (!Array.isArray(rec.counties) || rec.counties.length > provinceIds.length || rec.counties.some(function (pid, i) {
      return provinceIds.indexOf(pid) < 0 || rec.counties.indexOf(pid) !== i;
    })) bad('counties');
    if (rec.result === 'founded') {
      if (rec.realmId !== def.realm.id || !s.realms[rec.realmId]) bad('realmId');
      var realm = s.realms[rec.realmId], members = realm.succession && realm.succession.members;
      /* Ordinary royal mortality may compact the full founder character.
         Its saved genealogy member remains the authoritative tombstone. */
      if (!rec.founderId || !rec.founderMemberId || !members || !members[rec.founderMemberId]) bad('founderId');
      var founder = members[rec.founderMemberId];
      if (founder.charId && founder.charId !== rec.founderId) bad('founderId');
      if (!rec.formerOwnerId || rec.counties.indexOf(def.realm.capital) < 0) bad('counties');
    } else if (rec.realmId !== null || rec.founderId !== null || rec.founderMemberId !== null || rec.counties.length) bad('realmId');
  }
  FB.stories.registerType('polity_foundation', function (def) {
    validateDefinition(def);
    for (var event in def.news || {}) {
      var msg = def.news[event]; FB.registerMessage(msg.key, { text:msg.text });
    }
    return { id:def.id, kind:'world', requires:def.requires || [], init:fresh,
      day:function (s, rec) { day(s, rec, FB.stories.definition(s, def)); },
      foundRevolt:function (s, rec, group, counties) { return foundRevolt(s, rec, FB.stories.definition(s, def), group, counties); },
      migrate:function (s) {
        var bookmark = FB.bookmark(s.start && s.start.id);
        if (!bookmark || (bookmark.stories || []).indexOf(def.id) < 0 || s.stories && s.stories[def.id]) return;
        if (!s.stories) s.stories = {};
        /* Add only semantic pending state, never people or territorial effects. */
        s.stories[def.id] = fresh();
      },
      validate:function (rec, s) { validate(rec, s, FB.stories.definition(s, def)); },
      title:function (s) { return FB.dataText(s, null, 'storyFoundation', def.id, def, 'name', {}); },
      intro:function (s) { return FB.dataText(s, null, 'storyFoundation', def.id, def, 'desc', {}); },
      status:function (s, rec) {
        if (rec.phase === 'pending' && s.date.year < def.firstYear) return null;
        var names = { pending:FB.T('Awaiting a local opening'), rebelling:FB.T('Local revolt underway'),
          founded:FB.T('A new court founded'), failed:FB.T('Foundation attempt ended'),
          diverted:FB.T('History took another course') };
        return { phase:rec.phase, name:names[rec.result || rec.phase],
          lines:[FB.T('A conquered county must earn independence through its local uprising.')] };
      } };
  }, 'js/story_polity_foundation.js', validateDefinition);
})();
