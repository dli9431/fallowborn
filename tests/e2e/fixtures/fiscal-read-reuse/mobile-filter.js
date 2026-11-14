'use strict';
// Page-only oracle for the previous full filter, retaining native leader reuse.
const filter = [
  '    var rid = Object.keys(root).filter(function (id) {',
  '      if (!(root[id] && root[id].mobile) || !M.active(s,id)) return false;',
  '      var reader = M.leader, leader = M.leader(s,id);',
  '      return !!leader && (reader === nativeLeader && M.leader === reader ? leader : M.leader(s,id)).id === cid;',
  '    })[0];\n'
].join('\n');
function parent(source) {
  const begin = '    var known = dayMobileRealms(s,root);\n';
  const end = '    // An expedition is an additional office.';
  const first = source.indexOf(begin), last = source.indexOf(end);
  if (first < 0 || first !== source.lastIndexOf(begin) || last < first || last !== source.lastIndexOf(end))
    throw new Error('Mobile ruler scan source marker changed');
  return source.slice(0,first) + filter + source.slice(last);
}
module.exports = {parent:parent};
