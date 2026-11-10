'use strict';

const reviewCategories = {
  schema_token_collision:'Definition, saved-field or primitive-type spelling shared with a content id.',
  protocol_enum:'Closed role, operation, status or result vocabulary shared with a content id.',
  saved_identity:'Stable actor alias, flag, aim or retained record identity.',
  builtin_handler:'Registered deed, effect, transaction, validator or chance-policy implementation.',
  builtin_event:'Imperative entry into an authored event.',
  builtin_strategy:'Registered strategy selected by data.',
  builtin_content_binding:'Fixed built-in reward, commodity, policy or other content consumer.',
  trait_mechanic:'Trait grant, removal or mechanical query.',
  effect_ledger:'Named modifier or effect-ledger source.',
  system_capability:'Optional system availability or enablement gate.',
  technology_capability:'Technology capability or bonus query.',
  legacy_default:'Released-world or legacy-content fallback.',
  presentation_token:'DOM, art, localization or display vocabulary collision.'
};

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
    if (!Object.prototype.hasOwnProperty.call(reviewCategories, entry.category))
      problems.push('Hook needs a recognized category: ' + entry.id);
    if (typeof entry.reason !== 'string' || !entry.reason.trim() ||
        /schema\/strategy\/role token|saved enum or schema-token collision|registered built-in behavior or transaction hook|reviewed legacy identity, presentation seed or schema-token collision/i.test(entry.reason))
      problems.push('Hook needs a specific reason: ' + entry.id);
    if (!owners.has(entry.id)) problems.push('Stale hook has no content declaration: ' + entry.id);
    if (!entry.uses || !Object.keys(entry.uses).length)
      problems.push('Hook needs nonzero file reviews: ' + entry.id);
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
      if (!/^js\/[^/]+\.js$/.test(file) || !Number.isInteger(expected) || expected < 1)
        problems.push('Invalid reviewed count for ' + entry.id + ' in ' + file);
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

/* Count actual source occurrences, including any growth above a file review.
   Unreviewed content is included in the total and separately fails the closed
   residual check; it cannot disappear from the metric by dropping its hook. */
function contentIdMetric(sources, owners, entries) {
  const hooks = new Map(entries.map(function (entry) { return [entry.id, entry]; }));
  const categories = {};
  Object.keys(reviewCategories).sort().forEach(function (category) { categories[category] = 0; });
  let total = 0;
  quotedCounts(sources).forEach(function (count, key) {
    const id = key.split('\n')[1];
    if (!owners.has(id)) return;
    total += count;
    const entry = hooks.get(id);
    if (entry && Object.prototype.hasOwnProperty.call(categories, entry.category))
      categories[entry.category] += count;
  });
  return { total:total, categories:categories };
}

function metricProblems(actual, recorded) {
  const problems = [];
  if (!recorded || !Number.isInteger(recorded.total) || recorded.total < 0 ||
      !recorded.categories || Object.keys(recorded.categories).length !== Object.keys(reviewCategories).length)
    return ['Invalid quoted content-id metric'];
  let sum = 0;
  for (const category of Object.keys(reviewCategories).sort()) {
    const before = recorded.categories[category], now = actual.categories[category];
    if (!Number.isInteger(before) || before < 0) problems.push('Invalid metric category: ' + category);
    else sum += before;
    if (now !== before) problems.push('Quoted content-id category ' + category + ': ' + before + ' -> ' + now);
  }
  if (sum !== recorded.total) problems.push('Metric categories must sum to the recorded total');
  if (actual.total > recorded.total)
    problems.push('Quoted content-id total rose: ' + recorded.total + ' -> ' + actual.total);
  else if (actual.total < recorded.total)
    problems.push('Quoted content-id total decreased; lower the tracked metric: ' + recorded.total + ' -> ' + actual.total);
  return problems;
}

module.exports = { quotedCounts, reviewProblems, reviewCategories, contentIdMetric, metricProblems };
