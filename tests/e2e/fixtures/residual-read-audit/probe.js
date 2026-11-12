'use strict';

const paths = ['js/model.js', 'js/government_aristocracy.js', 'js/mobile_confederations.js'];
function instrument(file, source) {
  source = source.replace(/\r\n/g,'\n');
  function replace(before, after) {
    if (source.indexOf(before) < 0 || source.indexOf(before) !== source.lastIndexOf(before)) {
      throw new Error('Read audit source marker changed: ' + file + ': ' + before);
    }
    source = source.replace(before, after);
  }
  if (file === 'js/model.js') {
    replace('  function localOfficeInputs(state, graph) {',
      '  function localOfficeInputs(state, graph) {\n' +
      '    const readAudit = window.__residualReadAudit, auditFrame = readAudit && readAudit.enterOffice(state);\n    try {');
    replace('\n  }\n  function localOfficeTable(state, graph, definitions) {',
      '\n    } finally { if (readAudit) readAudit.leaveOffice(auditFrame); }\n  }\n  function localOfficeTable(state, graph, definitions) {');
  } else if (file === 'js/government_aristocracy.js') {
    replace('  function constituencyLookups(s,interests) {',
      '  function constituencyLookups(s,interests) {\n    if (window.__residualReadAudit) window.__residualReadAudit.index(s,interests);');
    for (const pair of [['assigned','appointmentSlots'], ['local','rightSlots']]) {
      replace('    for (i = 0; i < ' + pair[0] + '.length; i++) {',
        '    for (i = 0; i < ' + pair[0] + '.length; i++) {\n' +
        '      if (window.__residualReadAudit) window.__residualReadAudit.slot(\'' + pair[1] + '\');');
    }
    replace('    return {first:first,rights:selected};',
      '    if (window.__residualReadAudit) window.__residualReadAudit.builtIndex();\n    return {first:first,rights:selected};');
  } else if (file === 'js/mobile_confederations.js') {
    replace('  FB.realmIdForRulerCharacter = function (s,value) {',
      '  FB.realmIdForRulerCharacter = function (s,value) {\n' +
      '    var readAudit = window.__residualReadAudit, auditFrame = readAudit && readAudit.enterMobile(s,value);\n    try {');
    replace('function (id) { return !!(root[id] && root[id].mobile)',
      'function (id) { if (readAudit) readAudit.mobileSlot(); return !!(root[id] && root[id].mobile)');
    replace("    return rulerRealm(s,value) || M.landedHomeRealm && M.landedHomeRealm(s,cid) || rid;\n  };",
      "    return rulerRealm(s,value) || M.landedHomeRealm && M.landedHomeRealm(s,cid) || rid;\n" +
      '    } finally { if (readAudit) readAudit.leaveMobile(auditFrame); }\n  };');
  } else throw new Error('Unsupported read audit source ' + file);
  return source;
}

function install() {
  if (window.__residualReadAudit) throw new Error('Read audit already installed');
  const frames = [], offices = [], mobiles = [], restore = [];
  let report, cadence = 'outside';
  function counts() {
    return {indexCalls:0, indexBuilds:0, appointmentSlots:0, rightSlots:0,
      officeEntries:0, officeWorldReads:0, officeWorldRepeats:0,
      mobileEntries:0, mobileSlots:0, mobileActiveCalls:0, mobileLeaderCalls:0,
      mobileLeaderSameResultRepeats:0};
  }
  function phase() { return report.cadences[cadence] || (report.cadences[cadence] = Object.assign({days:0},counts())); }
  function add(key, value) { report.total[key] += value === undefined ? 1 : value; phase()[key] += value === undefined ? 1 : value; }
  function scopeRow(kind) {
    return report.scopes[kind] || (report.scopes[kind] = {calls:0, indexCalls:0, equivalentIndexRepeats:0,
      changedIndexInputs:0, mobileQueries:0, repeatedCharacterQueries:0, errors:0, examples:[]});
  }
  function enter(kind, state, id) {
    const frame = {kind:kind, state:state, data:FBDATA, id:id, indexes:[], characters:[]};
    scopeRow(kind).calls++; frames.push(frame);
    report.maxScopeDepth = Math.max(report.maxScopeDepth,frames.length);
    return frame;
  }
  function leave(frame) { if (frames.pop() !== frame) throw new Error('Read audit scope mismatch'); }
  function query(kind, state, fn) {
    const frame = enter(kind,state);
    try { return fn(); } catch (e) { scopeRow(kind).errors++; throw e; } finally { leave(frame); }
  }
  function wrap(owner, name, kind) {
    if (!owner || typeof owner[name] !== 'function') throw new Error('Missing audited reader ' + name);
    const original = owner[name];
    owner[name] = function () {
      const receiver = this, args = arguments;
      return query(kind,args[0],function () { return original.apply(receiver,args); });
    };
    restore.push(function () { owner[name] = original; });
  }
  function snapshotIndex(state, interests) {
    const authority = state.authority || {}, assigned = authority.appointments || [], rights = authority.rights || [];
    if (!Array.isArray(interests) || interests.length < 2 || interests.map !== Array.prototype.map ||
        !Array.isArray(assigned) || !Array.isArray(rights) || assigned.filter !== Array.prototype.filter || rights.filter !== Array.prototype.filter) return null;
    if (interests.some(function (row) { return !row || typeof row.appointmentId !== 'string' ||
          !Array.isArray(row.rightIds) || row.rightIds.indexOf !== Array.prototype.indexOf ||
          row.rightIds.some(function (id) { return typeof id !== 'string'; }); }) ||
        assigned.some(function (row) { return !row || typeof row.id !== 'string'; }) ||
        rights.some(function (row) { return !row || typeof row.id !== 'string'; })) return null;
    return {state:state, data:FBDATA, interests:interests, assigned:assigned, rights:rights,
      map:interests.map, assignedFilter:assigned.filter, rightsFilter:rights.filter,
      request:JSON.stringify(interests.map(function (row) { return [row.appointmentId,row.rightIds]; })),
      assignedRows:assigned.slice(), rightRows:rights.slice(),
      assignedIds:assigned.map(function (row) { return row.id; }), rightIds:rights.map(function (row) { return row.id; })};
  }
  function sameIndex(a,b) {
    if (!a || !b || a.state !== b.state || a.data !== b.data || a.interests !== b.interests ||
        a.assigned !== b.assigned || a.rights !== b.rights || a.request !== b.request ||
        a.map !== b.map || a.assignedFilter !== b.assignedFilter || a.rightsFilter !== b.rightsFilter) return false;
    for (const name of ['assignedRows','rightRows','assignedIds','rightIds']) {
      if (a[name].length !== b[name].length) return false;
      for (let i = 0; i < a[name].length; i++) if (a[name][i] !== b[name][i]) return false;
    }
    return true;
  }
  const audit = {
    reset:function () {
      if (frames.length || offices.length || mobiles.length) throw new Error('Cannot reset active read audit');
      report = {total:counts(), cadences:{}, scopes:{}, maxScopeDepth:0, maxMobileDepth:0,
        indexInputSizes:{}, mobileInputSizes:{}};
    },
    snapshot:function () { return JSON.parse(JSON.stringify(report)); },
    query:query,
    enterOffice:function (state) {
      const frame = {state:state, previous:null}; offices.push(frame); add('officeEntries'); return frame;
    },
    leaveOffice:function (frame) { if (offices.pop() !== frame) throw new Error('Office audit mismatch'); },
    index:function (state, interests) {
      add('indexCalls');
      const input = snapshotIndex(state,interests);
      if (!input) return;
      const size = [interests.length,input.assigned.length,input.rights.length].join('/');
      report.indexInputSizes[size] = (report.indexInputSizes[size] || 0) + 1;
      for (const frame of frames) {
        const row = scopeRow(frame.kind); row.indexCalls++;
        const previous = frame.indexes.find(function (item) { return item.interests === interests && item.state === state; });
        if (previous) {
          if (sameIndex(previous,input)) {
            row.equivalentIndexRepeats++;
            if (row.examples.length < 3) row.examples.push({kind:'index',sizes:size});
          } else row.changedIndexInputs++;
          frame.indexes[frame.indexes.indexOf(previous)] = input;
        } else frame.indexes.push(input);
      }
    },
    slot:function (key) { add(key); },
    builtIndex:function () { add('indexBuilds'); },
    enterMobile:function (state,value) {
      const cid = typeof value === 'string' ? value : value && value.id;
      const root = state.authority && state.authority.governments;
      const size = Object.keys(root || {}).length;
      report.mobileInputSizes[size] = (report.mobileInputSizes[size] || 0) + 1;
      add('mobileEntries');
      for (const frame of frames) {
        const row = scopeRow(frame.kind); row.mobileQueries++;
        if (frame.characters.some(function (item) { return item.state === state && item.data === FBDATA && item.cid === cid; })) row.repeatedCharacterQueries++;
        else frame.characters.push({state:state, data:FBDATA, cid:cid});
      }
      const frame = {state:state, cid:cid, leaders:[]}; mobiles.push(frame);
      report.maxMobileDepth = Math.max(report.maxMobileDepth,mobiles.length);
      return frame;
    },
    leaveMobile:function (frame) { if (mobiles.pop() !== frame) throw new Error('Mobile audit mismatch'); },
    mobileSlot:function () { add('mobileSlots'); },
    stop:function () {
      if (frames.length || offices.length || mobiles.length) throw new Error('Read audit scope leaked');
      for (let i = restore.length - 1; i >= 0; i--) restore[i]();
      delete window.__residualReadAudit;
      return audit.snapshot();
    }
  };
  const bookmark = FB.campaignBookmark;
  FB.campaignBookmark = function (state) {
    const result = bookmark.apply(this,arguments), frame = offices[offices.length - 1];
    if (frame) {
      add('officeWorldReads');
      if (frame.previous && frame.previous.state === state && frame.previous.data === FBDATA && frame.previous.result === result) add('officeWorldRepeats');
      frame.previous = {state:state,data:FBDATA,result:result};
    }
    return result;
  };
  restore.push(function () { FB.campaignBookmark = bookmark; });
  for (const name of ['active','leader']) {
    const original = FB.mobile[name];
    FB.mobile[name] = function (state,rid) {
      const frame = mobiles[mobiles.length - 1];
      if (frame) add(name === 'active' ? 'mobileActiveCalls' : 'mobileLeaderCalls');
      const value = original.apply(this,arguments);
      if (frame) {
        if (name === 'leader') {
          const previous = frame.leaders.find(function (row) { return row.state === state && row.rid === rid; });
          if (previous && previous.value === value) add('mobileLeaderSameResultRepeats');
          else frame.leaders.push({state:state,rid:rid,value:value});
        }
      }
      return value;
    };
    restore.push(function () { FB.mobile[name] = original; });
  }
  for (const name of ['settlementActorFiscal','treasurySnapshot','playerTaxParts','vassalTaxContribution',
    'playerCivilianBudget','reliableGoldIncome','landGrantFiscalProjection','characterResidence','realmIdForRulerCharacter']) wrap(FB,name,name);
  for (const name of ['nominationQuote','supportQuote','accessionQuote']) wrap(FB.governmentRecognition,name,'recognition.' + name);
  wrap(FB.aristocracy,'constituency','constituency');
  wrap(FB.aristocracy,'readiness','readiness');
  wrap(FB.political,'actor','actor');
  wrap(FB.political,'legitimacy','legitimacy');
  const passDay = FB.game.passDay;
  FB.game.passDay = function () {
    const previous = cadence, s = FB.state;
    cadence = s.date.day === 90 ? s.date.season === 3 ? 'year' : 'season' : 'ordinary';
    phase().days++;
    try { return passDay.apply(this,arguments); } finally { cadence = previous; }
  };
  restore.push(function () { FB.game.passDay = passDay; });
  audit.reset();
  window.__residualReadAudit = audit;
}

module.exports = {paths:paths, instrument:instrument, install:install};
