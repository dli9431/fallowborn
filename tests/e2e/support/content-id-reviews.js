'use strict';

/* Pure source audit. Protocol spelling collisions require explicit review in
   every reusable file, and every reviewed count must match the source exactly. */
function quotedCounts(sources) {
  const counts = new Map();
  for (const source of sources) {
    for (const row of source.scan.literals) {
      const key = source.file + '\n' + row.value;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return counts;
}

function reviewProblems(sources, reusableFiles, owners, entries) {
  const problems = [], hooks = new Map(entries.map(function (entry) { return [entry.id, entry]; }));
  const counts = quotedCounts(sources);
  for (const source of sources) {
    const masked = source.scan.maskedLines.join('\n');
    if (/\bFB\s*\.\s*stories\s*\.\s*tokens\b/.test(masked))
      problems.push('Story token indirection is forbidden: ' + source.file);
    if (!reusableFiles.has(source.file)) continue;
    if (/\bV\s*\.\s*[A-Za-z_$][\w$]*/.test(masked))
      problems.push('Unreviewed story token alias: ' + source.file);
    for (const row of source.scan.literals) {
      if (!owners.has(row.value)) continue;
      const hook = hooks.get(row.value);
      if (!hook || !Array.isArray(hook.protocolFiles) || !hook.protocolFiles.includes(source.file))
        problems.push('Reusable type quotes an unreviewed content spelling: ' + source.file + ':' + row.line + ' ' + row.value);
    }
  }
  for (const entry of entries) {
    if (/authored story-module reference/i.test(entry.reason || ''))
      problems.push('Stale authored story reason: ' + entry.id);
    const protocol = Array.isArray(entry.protocolFiles) ? entry.protocolFiles : [];
    if (entry.protocolFiles !== undefined && !Array.isArray(entry.protocolFiles) || new Set(protocol).size !== protocol.length)
      problems.push('Invalid protocol file review: ' + entry.id);
    else for (const file of protocol) {
      if (!reusableFiles.has(file) || !entry.uses || !entry.uses[file])
        problems.push('Stale protocol file review: ' + entry.id + ' in ' + file);
    }
    for (const [file, expected] of Object.entries(entry.uses || {})) {
      const count = counts.get(file + '\n' + entry.id) || 0;
      if (count !== expected)
        problems.push('Reviewed count differs for ' + entry.id + ' in ' + file + ': ' + count + ' (reviewed ' + expected + ')');
      if (reusableFiles.has(file) && !protocol.includes(file))
        problems.push('Reusable file needs a protocol review: ' + entry.id + ' in ' + file);
    }
  }
  counts.forEach(function (count, key) {
    const [file, id] = key.split('\n'), entry = hooks.get(id);
    if (entry && !Object.prototype.hasOwnProperty.call(entry.uses || {}, file))
      problems.push('Unreviewed use of ' + id + ' in ' + file + ': ' + count);
  });
  return problems;
}

module.exports = { quotedCounts, reviewProblems };
