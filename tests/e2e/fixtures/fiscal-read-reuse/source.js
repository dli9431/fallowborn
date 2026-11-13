'use strict';
// Page-only source oracle for the pre-reuse evaluation order.
const fs = require('fs');
const path = require('path');
const mobileFilter = require('./mobile-filter');
const files = ['js/government_aristocracy.js','js/model.js','js/mobile_confederations.js','js/world.js'];
const sources = files.map(function (file) { return fs.readFileSync(path.resolve(__dirname,'../../../..',file),'utf8').replace(/\r\n/g,'\n'); });
function source(file, text, reference) {
  function replace(before,after) {
    if (text.indexOf(before) < 0 || text.indexOf(before) !== text.lastIndexOf(before)) throw new Error('Fiscal reuse marker changed: '+file+': '+before);
    text = text.replace(before,after);
  }
  if (file === files[0]) {
    replace('  A.withFiscalRead = function (s,context,read,projection) {',
      '  A.withFiscalRead = function (s,context,read,projection) {\n    if (window.fiscalReadCounts && window.fiscalReadCounts.fiscalReads !== undefined) window.fiscalReadCounts.fiscalReads++;');
    if (reference === true) replace('  A.withFiscalRead = function (s,context,read,projection) {',
      '  A.withFiscalRead = function (s,context,read,projection) {\n    return read();');
    replace('  function constituencyLookups(s,interests,track) {','  function constituencyLookups(s,interests,track) {\n    if (window.fiscalReadCounts) window.fiscalReadCounts.builds++;');
    replace('  function fiscalConstituencyLookups(s,rid,interests) {','  function fiscalConstituencyLookups(s,rid,interests) {\n    if (window.fiscalReadCounts) window.fiscalReadCounts.requests++;');
  } else if (file === files[1]) {
    if (reference === true) replace('    const world = FB.localInstitutionOfficeInputs(state), local = world.local, bookmark = world.bookmark;',
      '    const local = FB.localInstitutionDefinitions(state);\n    const bookmark = state ? FB.campaignBookmark(state) : FB.activeBookmark;');
    replace('  function localOfficeInputs(state, graph) {','  function localOfficeInputs(state, graph) {\n    if (window.fiscalReadCounts) window.fiscalReadCounts.officeEntries++;');
  } else if (file === files[2]) {
    if (reference) text = mobileFilter.parent(text);
    if (reference === true) replace('    var rid = Object.keys(root).filter(function (id) {\n'+
      '      if (!(root[id] && root[id].mobile) || !M.active(s,id)) return false;\n'+
      '      var reader = M.leader, leader = M.leader(s,id);\n'+
      '      return !!leader && (reader === nativeLeader && M.leader === reader ? leader : M.leader(s,id)).id === cid;\n'+
      '    })[0];',
      '    var rid = Object.keys(root).filter(function (id) { return !!(root[id] && root[id].mobile) && M.active(s,id) && M.leader(s,id) && M.leader(s,id).id === cid; })[0];');
    replace('  M.leader = function (s, rid) {','  M.leader = function (s, rid) {\n    if (window.fiscalReadCounts) window.fiscalReadCounts.leaders++;');
    if (reference) replace('    var rid = Object.keys(root).filter(function (id) {',
      '    var rid = Object.keys(root).filter(function (id) { if (window.fiscalReadCounts) window.fiscalReadCounts.slots++;');
    else {
      replace('      rid = ids.filter(function (id) {',
        '      rid = ids.filter(function (id) { if (window.fiscalReadCounts) window.fiscalReadCounts.slots++;');
      replace('        var id = ids[i];',
        '        var id = ids[i]; if (window.fiscalReadCounts) window.fiscalReadCounts.slots++;');
    }
  } else {
    replace('  FB.campaignBookmark = function (state) {',
      '  FB.campaignBookmark = function (state) {\n    if (window.fiscalReadCounts) window.fiscalReadCounts.worlds = (window.fiscalReadCounts.worlds || 0)+1;');
  }
  return text;
}
async function route(page,reference) {
  for (let i=0;i<files.length;i++) {
    await page.unroute('**/'+files[i]);
    await page.route('**/'+files[i],function (request) {
      return request.fulfill({contentType:'application/javascript',body:source(files[i],sources[i],reference)});
    });
  }
}
module.exports = {route:route};
