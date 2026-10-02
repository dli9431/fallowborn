'use strict';
const fs = require('fs');
const path = require('path');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html',
  'js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { engineSources } = require('../support/source-literals');

const allowlistPath = path.resolve(__dirname, '..', 'fixtures', 'engine-ids',
  'station-allowlist.json');
const kinds = ['save', 'validation'];
const operator = '(?:===?|!==?|<=?|>=?)';
const number = '-?\\d+(?:\\.\\d+)?';
const member = '\\.\\s*(?:tier|rank)\\b';
/* x.tier >= 3, (x.rank || 0) < 1, and the reversed 3 <= x.tier. Comments
   and strings are already masked out of the scanned lines. */
const comparisons = [
  new RegExp(member + '\\s*(?:\\|\\|\\s*' + number + '\\s*\\)\\s*)?' + operator + '\\s*' + number),
  new RegExp('(?:^|[^\\w$.])' + number + '\\s*' + operator +
    '\\s*\\(?\\s*[\\w$.\\[\\]()]*' + member)
];

/* Every engine line outside js/station.js that compares a .tier or .rank
   member with a number. */
function findings() {
  const out = new Map();
  for (const source of engineSources()) {
    if (source.file === 'js/station.js') continue;
    source.scan.maskedLines.forEach(function (masked, index) {
      if (!comparisons.some(function (pattern) { return pattern.test(masked); })) return;
      const text = source.lines[index].trim();
      const key = source.file + '\n' + text;
      const row = out.get(key) || { file:source.file, source:text, lines:[] };
      row.lines.push(index + 1);
      out.set(key, row);
    });
  }
  return out;
}

test('engine code compares tiers and ranks only through station queries',
  async function ({}, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'The source lint reads files in Node and needs one browser target.');

    const allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
    const problems = [];
    const allowed = new Map();
    for (const entry of allowlist.entries) {
      const key = entry.file + '\n' + entry.source;
      if (kinds.indexOf(entry.kind) < 0 || !entry.reason) {
        problems.push('allowlist entry needs a known kind and a reason: ' +
          entry.file + ': ' + entry.source);
      }
      if (allowed.has(key)) problems.push('duplicate allowlist entry: ' + entry.file + ': ' + entry.source);
      allowed.set(key, entry);
    }

    const found = findings();
    found.forEach(function (row, key) {
      const entry = allowed.get(key);
      const where = row.file + ':' + row.lines.join(',') + ': ' + row.source;
      if (!entry) {
        problems.push('numeric tier or rank comparison; ask FB.station or FB.realmRank: ' + where);
      } else if (row.lines.length > (entry.count || 1)) {
        problems.push('more occurrences than allowed (' + (entry.count || 1) + '): ' + where);
      }
    });
    allowed.forEach(function (entry, key) {
      const row = found.get(key);
      const seen = row ? row.lines.length : 0;
      if (seen < (entry.count || 1)) {
        problems.push('stale allowlist entry, remove or lower it (' + seen + ' found): ' +
          entry.file + ': ' + entry.source);
      }
    });
    expect(problems, problems.join('\n')).toEqual([]);
  });

test('the lint pattern catches each comparison shape it is meant to reject',
  async function ({}, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'The source lint pattern needs one browser target.');
    const rejected = [
      'if (p.tier >= 3) x();',
      'return state.player.tier === 0;',
      'if (state.realms[rid].rank < 3) return;',
      'const ok = (realm.rank || 0) < 1;',
      'if (4 <= p.tier) x();',
      'a = s.player.tier!==2;'
    ];
    const accepted = [
      'if (FB.station.isLanded(p)) x();',
      'p.tier = 3;',
      'const index = p.tier + 1;',
      'if (mine.rank < inherited.rank) x();',
      'const scale = [0, 0, 0.05][p.tier] || 0;'
    ];
    rejected.forEach(function (line) {
      expect(comparisons.some(function (pattern) { return pattern.test(line); }), line).toBe(true);
    });
    accepted.forEach(function (line) {
      expect(comparisons.some(function (pattern) { return pattern.test(line); }), line).toBe(false);
    });
  });

test('station and realm rank queries give the feudal ladder answers',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const problems = await page.evaluate(function () {
      const S = FB.station, R = FB.realmRank, out = [];
      const tierRules = {
        isSerf:function (t) { return t === 0; },
        isFreeholder:function (t) { return t === 1; },
        isGentry:function (t) { return t === 2; },
        isBaron:function (t) { return t === 3; },
        isCount:function (t) { return t === 4; },
        isDuke:function (t) { return t === 5; },
        isKing:function (t) { return t === 6; },
        isEmperor:function (t) { return t === 7; },
        isFree:function (t) { return t >= 1; },
        isGentle:function (t) { return t >= 2; },
        isLanded:function (t) { return t >= 3; },
        isFreeUnlanded:function (t) { return t >= 1 && t <= 2; },
        rulesRealm:function (t) { return t >= 4; },
        holdsCounty:function (t) { return t >= 4; },
        sitsInEstates:function (t) { return t >= 3 && t <= 5; },
        isDucal:function (t) { return t >= 5; },
        isRoyal:function (t) { return t >= 6; },
        mayHoldCouncil:function (t) { return t >= 6; },
        isImperial:function (t) { return t >= 7; }
      };
      const rankRules = {
        isCounty:function (r) { return r === 1; },
        isDuchy:function (r) { return r === 2; },
        isKingdom:function (r) { return r === 3; },
        isEmpire:function (r) { return r === 4; },
        isTerritorial:function (r) { return r >= 1; },
        isDucal:function (r) { return r >= 2; },
        isRoyal:function (r) { return r >= 3; },
        isImperial:function (r) { return r >= 4; }
      };
      const roles = ['serf', 'commoner', 'gentry', 'lord', 'lord', 'lord', 'crowned', 'crowned'];
      const tierHelpers = ['reaches', 'exceeds', 'societalRole'];

      Object.keys(S).forEach(function (name) {
        if (!tierRules[name] && tierHelpers.indexOf(name) < 0) out.push('untested station query ' + name);
      });
      Object.keys(R).forEach(function (name) {
        if (!rankRules[name]) out.push('untested realm rank query ' + name);
      });

      for (let t = 0; t <= 7; t++) {
        Object.keys(tierRules).forEach(function (name) {
          const want = tierRules[name](t);
          if (S[name]({ tier:t }) !== want) out.push(name + ' subject tier ' + t);
          if (S[name](t) !== want) out.push(name + ' bare tier ' + t);
        });
        if (S.societalRole(t) !== roles[t]) out.push('societalRole ' + t);
        if (FB.societalRole(t) !== roles[t]) out.push('FB.societalRole ' + t);
        for (let limit = -1; limit <= 8; limit++) {
          if (S.reaches({ tier:t }, limit) !== (t >= limit)) out.push('reaches ' + t + ' ' + limit);
          if (S.exceeds({ tier:t }, limit) !== (t > limit)) out.push('exceeds ' + t + ' ' + limit);
        }
        if (!S.reaches({ tier:t }, undefined)) out.push('an absent minimum blocks tier ' + t);
        if (S.exceeds({ tier:t }, undefined)) out.push('an absent maximum blocks tier ' + t);
      }
      for (let r = 0; r <= 4; r++) {
        Object.keys(rankRules).forEach(function (name) {
          const want = rankRules[name](r);
          if (R[name]({ rank:r }) !== want) out.push(name + ' realm rank ' + r);
          if (R[name](r) !== want) out.push(name + ' bare rank ' + r);
        });
      }
      return out;
    });
    expect(problems, problems.join('\n')).toEqual([]);
  });
