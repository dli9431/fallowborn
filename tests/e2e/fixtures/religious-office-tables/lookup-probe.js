'use strict';

// Source hooks exist only in routed diagnostic pages, never in shipped scripts.
function instrument(source) {
  function replace(before, after) {
    if (source.indexOf(before) < 0 || source.indexOf(before) !== source.lastIndexOf(before)) {
      throw new Error('Office lookup probe source marker changed: ' + before);
    }
    source = source.replace(before, after);
  }
  replace('  function localOfficeInputs(state, graph) {',
    '  function localOfficeInputs(state, graph) {\n' +
    '    const probe = window.__officeLookupProbe, ticket = probe && probe.beginInput();');
  if (source.indexOf('  function sameOfficeInputs(') >= 0) {
    replace('      key = JSON.stringify([state && state.turn,',
      '      if (window.__officeLookupProbe) window.__officeLookupProbe.serializeKey();\n' +
      '      key = JSON.stringify([state && state.turn,');
  } else {
    replace('    const key = JSON.stringify([state && state.turn,',
      '    if (window.__officeLookupProbe) window.__officeLookupProbe.serializeKey();\n' +
      '    const key = JSON.stringify([state && state.turn,');
  }
  const captured = source.indexOf('    const data = FBDATA, systemEnabled = FB.systemEnabled;') >= 0;
  const inputReturn = '    return { state:state, data:' + (captured ? 'data' : 'FBDATA') + ', graph:graph, bookmark:bookmark, local:local,';
  const reusedReturn = '    if (unchanged && localOfficeCache === old && old.data === data && old.systemEnabled === systemEnabled) return old;';
  const inputEnd = source.indexOf(reusedReturn) >= 0 ? reusedReturn : inputReturn;
  replace(inputEnd,
    '    if (probe) probe.endInput(ticket, {state:state, data:' + (captured ? 'data' : 'FBDATA') + ', graph:graph, bookmark:bookmark, local:local, systemEnabled:' + (captured ? 'systemEnabled' : 'FB.systemEnabled') + ', key:key}, Object.keys(local).length, bookmark ? (bookmark.realms || []).length + (bookmark.provinces || []).length : 0);\n' +
    inputEnd);
  replace(inputReturn, '    if (probe) probe.inputRecord();\n' + inputReturn);
  replace('    if (old && old.state === inputs.state && old.data === inputs.data &&',
    '    if (window.__officeLookupProbe) window.__officeLookupProbe.tableComparison();\n' +
    '    if (old && old.state === inputs.state && old.data === inputs.data &&');
  if (inputEnd === reusedReturn) replace(reusedReturn,
    reusedReturn.replace('return old;', '{ if (probe) probe.reusedInputRecord(); return old; }'));
  if (source.indexOf('    if (inputs === old) return old.table;') >= 0) replace('    if (inputs === old) return old.table;',
    '    if (inputs === old) { if (window.__officeLookupProbe) window.__officeLookupProbe.table(true); return old.table; }');
  replace('old.key === inputs.key) return old.table;',
    'old.key === inputs.key) { if (window.__officeLookupProbe) window.__officeLookupProbe.table(true); return old.table; }');
  replace('    inputs.table = withLocalReligiousOffices(state, definitions, inputs.local);',
    '    if (window.__officeLookupProbe) window.__officeLookupProbe.table(false);\n' +
    '    inputs.table = withLocalReligiousOffices(state, definitions, inputs.local);');
  return source;
}

function install() {
  if (window.__officeLookupProbe) throw new Error('Office lookup probe already installed');
  const E = FB.ecclesiasticalGovernment, Q = FB.political;
  const original = {realm:FB.realmIdForRulerCharacter, incumbent:E.incumbent, legitimacy:Q.legitimacy};
  const frames = [], incumbents = [];
  let report;
  function blank() {
    return {keyBuilds:0, keySerializations:0, hits:0, misses:0, localRows:0, faithRows:0, keyChars:0,
      inputRecords:0, reusedInputRecords:0, tableComparisons:0,
      inputMs:0, incumbentCalls:0, guardedVisits:0, maxIncumbentDepth:0, maxQueryDepth:0,
      unscopedBuilds:0, byKind:{}};
  }
  function group(kind) {
    return report.byKind[kind] || (report.byKind[kind] = {queries:0, inputs:0, directBuilds:0,
      repeatedEquivalentDirectBuilds:0, queriesWithEquivalentRepeats:0,
      queriesWithChangedInputs:0, queriesWithChangedDirectInputs:0, maxDirectBuilds:0,
      visits:0, maxVisits:0, errors:0, directBuildHistogram:{}, examples:[]});
  }
  function same(a, b) {
    return a.state === b.state && a.data === b.data && a.graph === b.graph &&
      a.bookmark === b.bookmark && a.local === b.local &&
      a.systemEnabled === b.systemEnabled && a.key === b.key;
  }
  function query(kind, fn) {
    const frame = {kind:kind, depth:incumbents.length, direct:0, repeats:0,
      changed:false, changedDirect:false, first:null, previous:null, visits:[]};
    const row = group(kind);
    row.queries++;
    frames.push(frame);
    report.maxQueryDepth = Math.max(report.maxQueryDepth, frames.length);
    try { return fn(); }
    catch (error) { row.errors++; throw error; }
    finally {
      frames.pop();
      row.maxDirectBuilds = Math.max(row.maxDirectBuilds, frame.direct);
      row.directBuildHistogram[frame.direct] = (row.directBuildHistogram[frame.direct] || 0) + 1;
      row.visits += frame.visits.length;
      row.maxVisits = Math.max(row.maxVisits, frame.visits.length);
      if (frame.repeats) row.queriesWithEquivalentRepeats++;
      if (frame.changed) row.queriesWithChangedInputs++;
      if (frame.changedDirect) row.queriesWithChangedDirectInputs++;
      if ((frame.repeats || frame.changed) && row.examples.length < 8) {
        row.examples.push({directBuilds:frame.direct, equivalentRepeats:frame.repeats,
          changedInputs:frame.changed, changedDirectInputs:frame.changedDirect, visitedRealms:frame.visits});
      }
    }
  }
  const probe = {
    beginInput:function () {
      return {frame:frames[frames.length - 1], depth:incumbents.length, started:performance.now()};
    },
    endInput:function (ticket, inputs, localRows, faithRows) {
      report.keyBuilds++; report.localRows += localRows; report.faithRows += faithRows;
      report.keyChars += inputs.key.length;
      report.inputMs += performance.now() - ticket.started;
      const frame = ticket.frame;
      if (!frame) { report.unscopedBuilds++; return; }
      const row = group(frame.kind);
      row.inputs++;
      if (frame.previous && !same(frame.previous, inputs)) frame.changed = true;
      frame.previous = inputs;
      const expectedDepth = frame.depth + (frame.kind === 'ruler-realm' ? 1 : 0);
      if (ticket.depth !== expectedDepth) return;
      row.directBuilds++; frame.direct++;
      if (frame.first) {
        if (same(frame.first, inputs)) { row.repeatedEquivalentDirectBuilds++; frame.repeats++; }
        else frame.changedDirect = true;
      } else frame.first = inputs;
    },
    table:function (hit) { report[hit ? 'hits' : 'misses']++; },
    inputRecord:function () { report.inputRecords++; },
    reusedInputRecord:function () { report.reusedInputRecords++; },
    tableComparison:function () { report.tableComparisons++; },
    serializeKey:function () { report.keySerializations++; },
    measure:function (label, fn) { return query(label, fn); },
    reset:function () {
      if (frames.length || incumbents.length) throw new Error('Cannot reset an active office probe');
      report = blank();
    },
    snapshot:function () { return JSON.parse(JSON.stringify(report)); },
    stop:function () {
      if (frames.length || incumbents.length) throw new Error('Office probe scope leaked');
      FB.realmIdForRulerCharacter = original.realm;
      E.incumbent = original.incumbent;
      Q.legitimacy = original.legitimacy;
      delete window.__officeLookupProbe;
      return probe.snapshot();
    }
  };
  FB.realmIdForRulerCharacter = function () {
    const receiver = this, args = arguments;
    return query('ruler-realm', function () { return original.realm.apply(receiver, args); });
  };
  Q.legitimacy = function () {
    const receiver = this, args = arguments;
    return query('legitimacy', function () { return original.legitimacy.apply(receiver, args); });
  };
  E.incumbent = function (state, rid) {
    report.incumbentCalls++;
    if (incumbents.indexOf(rid) >= 0) report.guardedVisits++;
    const frame = frames[frames.length - 1];
    if (frame && frame.kind === 'ruler-realm' && incumbents.length === frame.depth) frame.visits.push(rid);
    incumbents.push(rid);
    report.maxIncumbentDepth = Math.max(report.maxIncumbentDepth, incumbents.length);
    try { return original.incumbent.apply(this, arguments); }
    finally { incumbents.pop(); }
  };
  probe.reset();
  window.__officeLookupProbe = probe;
}

module.exports = {instrument:instrument, install:install};
