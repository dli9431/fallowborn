'use strict';
// Page-only oracle and counters for the guard eligibility reader.
const prior = '  FB.characterGuarded=function (s,cid) {\n'+
  "    return entries(s).some(function (v) {return v.guard.status!=='released' && v.guard.characterIds.indexOf(cid)>=0;});\n"+
  '  };';

function instrument(text,reference) {
  const begin = '  FB.characterGuarded=function (s,cid) {', end = '\n  FB.guardedPartyResidence=';
  const first = text.indexOf(begin), last = text.indexOf(end);
  if (first < 0 || first !== text.lastIndexOf(begin) || last < first || last !== text.lastIndexOf(end))
    throw new Error('Guard reader marker changed');
  let body = reference ? prior : text.slice(first,last);
  function replace(before,after) {
    if (body.indexOf(before) < 0 || body.indexOf(before) !== body.lastIndexOf(before))
      throw new Error('Guard reader hook changed: '+before);
    body = body.replace(before,after);
  }
  replace(begin,begin+'\n    if (window.__guardReadCounts) window.__guardReadCounts.calls++;');
  const predicate = "function (v) {return v.guard.status!=='released' && v.guard.characterIds.indexOf(cid)>=0;}";
  replace(predicate,"function (v) {if (window.__guardReadCounts) window.__guardReadCounts.rows++; return v.guard.status!=='released' && v.guard.characterIds.indexOf(cid)>=0;}");
  if (body.indexOf('    return entries(s).some(') >= 0) {
    replace('    return entries(s).some(',
      '    if (window.__guardReadCounts) window.__guardReadCounts.predicates++;\n    return entries(s).some(');
  } else {
    const fallback = '      return Function.prototype.call.call(some,rows,';
    replace(fallback,'      if (window.__guardReadCounts) window.__guardReadCounts.predicates++;\n'+fallback);
    replace('      var v = rows[i];','      if (window.__guardReadCounts) window.__guardReadCounts.rows++;\n      var v = rows[i];');
  }
  // Expose only the existing private identity list, never a saved field.
  return text.slice(0,first)+body+'\n  window.__guardEntries=entries;'+text.slice(last);
}

function facts() {
  const s = FB.state, a = s.authority || {}, governments = a.governments || {};
  const owners = {state:s,characters:s.chars,realms:s.realms,governments:governments,
    appointments:a.appointments || [],rights:a.rights || [],migrations:a.migrations || [],
    institutions:s.localInstitutions || {},armies:s.armies || [],captives:s.intrigue && s.intrigue.captives || []};
  const bytes = {}, counts = {};
  for (const name of Object.keys(owners)) {
    bytes[name] = new TextEncoder().encode(JSON.stringify(owners[name])).length;
    counts[name] = Object.keys(owners[name]).length;
  }
  return {turn:s.turn,date:JSON.parse(JSON.stringify(s.date)),rng:FB.getRngState(),uid:FB.getUidCounter(),
    counts:counts,bytes:bytes,livingCharacters:Object.keys(s.chars).filter(function (id) { return !s.chars[id].dead; }).length,
    mobile:JSON.parse(JSON.stringify(Object.keys(governments).filter(function (id) { return governments[id].mobile; }).map(function (id) {
      const row = governments[id].mobile;
      return {realm:id,form:governments[id].formId,leader:row.leaderId,status:row.status,
        members:row.members.length,command:row.command || null,guard:row.guardedParty || null};
    })))};
}

function observe() {
  const p = window.__residualReadAudit, guard = FB.characterGuarded, enter = p.enterMobile, leave = p.leaveMobile;
  let depth = 0;
  p.enterMobile = function () { const frame = enter.apply(this,arguments); depth++; return frame; };
  p.leaveMobile = function () { try { return leave.apply(this,arguments); } finally { depth--; } };
  FB.characterGuarded = function () {
    const counts = window.__guardReadCounts;
    if (counts && depth) counts.inMobileRead++;
    const result = guard.apply(this,arguments);
    if (counts && result) counts.guarded++;
    return result;
  };
  window.__stopGuardRead = function () {
    FB.characterGuarded = guard; p.enterMobile = enter; p.leaveMobile = leave;
    delete window.__guardReadCounts; delete window.__stopGuardRead;
    if (depth) throw new Error('Guard frame leaked');
  };
}

module.exports = {instrument:instrument,facts:facts,observe:observe};
