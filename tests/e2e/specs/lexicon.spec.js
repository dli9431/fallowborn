'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html',
  'js',
  'data/lexicons.js', 'data/eras.js', 'data/cultures.js', 'data/bookmarks.js',
  'data/bookmark_476.js', 'data/political_institutions.js', 'data/economy.js',
  'data/units.js', 'data/map_data.js', 'data/starts.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { engineSources } = require('../support/source-literals');

/* The words the base lexicon reproduces, so a converted string's English can
   be rebuilt independently of the game: {term:vassal.other} -> vassals. */
const BASE_WORDS = {
  vassal:['vassal', 'vassals'], liege:['liege', 'lieges'], fief:['fief', 'fiefs'],
  knight:['knight', 'knights'], baron:['baron', 'barons'], serf:['serf', 'serfs'],
  manor:['manor', 'manors'], crown_authority:['crown authority', 'crown authority', 'Crown Authority']
};
const TERM = /\{([Tt])erm:([a-z_]+)(?:\.(one|other|title))?\}/g;
function englishOf(text) {
  return text.replace(TERM, function (whole, t, id, form) {
    const words = BASE_WORDS[id];
    if (!words) return whole;
    let word = form === 'other' ? words[1]
      : form === 'title' ? (words[2] || words[0][0].toUpperCase() + words[0].slice(1))
      : words[0];
    if (t === 'T') word = word[0].toUpperCase() + word.slice(1);
    return word;
  });
}

/* Every engine literal holding a term placeholder. */
function termLiterals() {
  const out = new Set();
  for (const source of engineSources()) {
    for (const literal of source.scan.literals) {
      TERM.lastIndex = 0;
      if (TERM.test(literal.value)) out.add(literal.value);
    }
  }
  return Array.from(out).sort();
}

async function start(page, testInfo, bookmark) {
  await openGame(page, testInfo);
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(bookmark === '476'
    ? 'LEXICON-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian'
    : 'LEXICON-' + bookmark + '-serf-london-f-Ada');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  expect(await page.evaluate(function () { return FB.state.start.id; })).toBe(bookmark);
}

async function renderedTerms(page, literals) {
  return page.evaluate(function (list) {
    return list.map(function (text) { return FB.T(text, {}); });
  }, literals);
}

for (const bookmark of ['867', '1066']) {
  test('converted running text renders the same English in ' + bookmark,
    async function ({ page }, testInfo) {
      test.skip(testInfo.project.name !== 'chromium-served',
        'The string snapshot reads sources in Node and needs one browser target.');
      const literals = termLiterals();
      expect(literals.length).toBeGreaterThan(200);
      await start(page, testInfo, bookmark);
      const rendered = await renderedTerms(page, literals);
      const mismatches = [];
      literals.forEach(function (text, i) {
        if (rendered[i] !== englishOf(text)) {
          mismatches.push(text + '\n  -> ' + rendered[i]);
        }
      });
      expect(mismatches).toEqual([]);
    });
}

test('476 keeps its English running text and reads its period labels from data',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'The string snapshot reads sources in Node and needs one browser target.');
    const literals = termLiterals();
    await start(page, testInfo, '476');
    const rendered = await renderedTerms(page, literals);
    const mismatches = literals.filter(function (text, i) {
      return rendered[i] !== englishOf(text);
    });
    expect(mismatches).toEqual([]);
    const result = await page.evaluate(function () {
      const s = FB.state, me = s.player.charId;
      return {
        era:FB.lexicon.context(s).era,
        hooks:typeof FB.stories.text,
        career:FB.dataText(s, me, 'career', 'soldier', FBDATA.careers.soldier, 'name', {}),
        recruit:FB.dataText(s, me, 'career', 'soldier', FBDATA.careers.soldier,
          'ranks.apprentice', {}),
        troops:FB.dataText(s, me, 'unitClass', 'ret', FBDATA.unitClasses.ret, 'name', {}),
        noViewerTroops:FB.dataText(s, null, 'unitClass', 'ret', FBDATA.unitClasses.ret,
          'name', {}),
        holding:FB.dataText(s, me, 'holding', 'good_mail', FBDATA.holdings.good_mail, 'name', {}),
        plainHolding:FB.dataText(s, me, 'holding', 'orchard', FBDATA.holdings.orchard, 'name', {}),
        rank:FB.lexicon.rank(s, 4, { viewer:me }),
        rankF:FB.lexicon.rank(s, 4, { viewer:me, sex:'f' }).word,
        berber:FB.lexicon.rank(s, 4, { faith:'berber_traditional', viewer:null }).word,
        germanic:FB.lexicon.rank(s, 4, { faith:'germanic_pagan', viewer:null }).word,
        snapshot:FB.rankTitleSnapshot(s, 1)
      };
    });
    expect(result.era).toBe('late_antique');
    expect(result.hooks).toBe('undefined');
    expect(result.career).toBe('Federate service');
    expect(result.recruit).toBe('New recruit');
    expect(result.troops).toBe('Household soldiers');
    expect(result.noViewerTroops).toBe('Household soldiers');
    expect(result.holding).toBe('Mail shirt');
    expect(result.plainHolding).toBe('Orchard');
    expect(result.rank).toMatchObject({ source:'eras.late_antique', word:'Comes', tier:4 });
    expect(result.rankF).toBe('Comitissa');
    expect(result.berber).toBe('Jarl');
    expect(result.germanic).toBe('Comes');
    expect(result.snapshot).toMatchObject({ titleLexicon:'eras.late_antique',
      titleReligion:null, word:'Free Citizen' });
  });

test('867 rank titles keep their faith ladders through the lexicon',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '867');
    const result = await page.evaluate(function () {
      const s = FB.state;
      function word(faith, sex, tier) {
        return FB.lexicon.rank(s, tier, { faith:faith, sex:sex, viewer:null }).word;
      }
      const snapshot = FB.titleSnapshot(s);
      const legacy = Object.assign({}, snapshot, { titleLexicon:undefined,
        titleReligion:'muslim', titleSex:'f', tier:4, word:'Emira' });
      return {
        catholic:[word('catholic', 'm', 4), word('catholic', 'f', 7)],
        sunni:[word('sunni', 'm', 4), word('sunni', 'f', 6)],
        norse:word('norse_pagan', 'm', 4),
        jewish:word('jewish', 'm', 6),
        zoroastrian:word('zoroastrian', 'f', 7),
        source:FB.lexicon.rank(s, 4, { faith:'sunni', viewer:null }).source,
        base:FB.lexicon.rank(s, 4, { faith:'catholic', viewer:null }).source,
        snapshot:{ lexicon:snapshot.titleLexicon, word:snapshot.word },
        legacy:FB.renderTitleSnapshot(legacy),
        player:FB.titleWordFor(s, 3)
      };
    });
    expect(result.catholic).toEqual(['Count', 'Empress']);
    expect(result.sunni).toEqual(['Emir', 'Sultana']);
    expect(result.norse).toBe('Jarl');
    expect(result.jewish).toBe('Khagan');
    expect(result.zoroastrian).toBe('Banbishnan Banbishn');
    expect(result.source).toBe('faiths.muslim');
    expect(result.base).toBe('base');
    expect(result.snapshot).toEqual({ lexicon:'base', word:'Serf' });
    expect(result.legacy).toBe('Emira');
    expect(result.player).toBe('Baroness');
  });

test('the resolver prefers culture, then faith, then government, then era, then base',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '867');
    const result = await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId];
      const ctx = FB.lexicon.context(s);
      const saved = FBDATA.lexicons;
      const out = { ctx:ctx, steps:[] };
      try {
        FBDATA.lexicons = JSON.parse(JSON.stringify(saved));
        const lex = FBDATA.lexicons;
        function word(label) { return { one:label, other:label + 's' }; }
        lex.eras[ctx.era] = { terms:{ vassal:word('era vassal') } };
        lex.governments[ctx.government] = { terms:{ vassal:word('government vassal') } };
        lex.faiths.christian = { terms:{ vassal:word('ancestor vassal') } };
        lex.faiths[me.religion] = { terms:{ vassal:word('faith vassal') } };
        lex.cultures[me.culture] = { terms:{ vassal:word('culture vassal') } };
        FB.lexicon.reset();
        out.errors = FB.lexicon.validate();
        const order = [
          ['cultures', me.culture], ['faiths', me.religion], ['faiths', 'christian'],
          ['governments', ctx.government], ['eras', ctx.era]
        ];
        for (const step of order) {
          out.steps.push({ word:FB.term(s, 'vassal'),
            source:FB.lexicon.find(s, 'vassal').source });
          delete lex[step[0]][step[1]];
          FB.lexicon.reset();
        }
        out.steps.push({ word:FB.term(s, 'vassal'), source:FB.lexicon.find(s, 'vassal').source });
        lex.eras[ctx.era] = { terms:{ vassal:{ one:'client', other:'clients', title:'Client Lord' } } };
        FB.lexicon.reset();
        out.placeholders = FB.T('Your {term:vassal.other}; {Term:vassal}; {term:vassal.title}; ' +
          '{Term:liege}; {term:crown_authority.title}; {term:nowhere}');
        out.message = FB.renderMessage(FB.msg('news.test.lexicon_term',
          'A {term:vassal} kneels.', {}), { state:s, viewer:s.player.charId });
      } finally {
        FBDATA.lexicons = saved;
        FB.lexicon.reset();
      }
      out.after = FB.T('{Term:vassal.other}');
      return out;
    });
    expect(result.ctx.era).toBe('early_medieval');
    expect(result.ctx.government).toBe('territorial');
    expect(result.ctx.faith[0]).toBeTruthy();
    expect(result.ctx.faith).toContain('christian');
    expect(result.errors).toEqual([]);
    expect(result.steps.map(function (row) { return row.word; })).toEqual([
      'culture vassal', 'faith vassal', 'ancestor vassal', 'government vassal',
      'era vassal', 'vassal'
    ]);
    expect(result.steps[5].source).toBe('base');
    expect(result.placeholders).toBe('Your clients; Client; Client Lord; Liege; Crown Authority; nowhere');
    expect(result.message).toBe('A client kneels.');
    expect(result.after).toBe('Vassals');
  });

test('lexicon mods merge by layer and invalid entries are refused',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const out = {};
      function attempt(mod) {
        try { FB.mods.apply(mod); return 'ok'; } catch (error) { return error.message; }
      }
      out.unknownTerm = attempt({ lexicons:{ eras:{ early_medieval:{
        terms:{ thane:{ one:'thane', other:'thanes' } } } } } });
      out.badRank = attempt({ lexicons:{ faiths:{ muslim:{ rank:{ m:['A'], f:['B'] } } } } });
      out.badLayer = attempt({ lexicons:{ dynasty:{} } });
      out.unknownEra = attempt({ lexicons:{ eras:{ bronze_age:{ terms:{} } } } });
      out.applied = attempt({ lexicons:{
        base:{ terms:{ manor:{ one:'estate', other:'estates' } } },
        eras:{ late_antique:{ labels:{ holding:{ warhorse:{ name:'Cavalry mount' } } } } }
      } });
      out.manor = FB.T('Declare the {term:manor}');
      out.keptLabel = FBDATA.lexicons.eras.late_antique.labels.holding.good_mail.name;
      out.newLabel = FBDATA.lexicons.eras.late_antique.labels.holding.warhorse.name;
      out.keptRank = FBDATA.lexicons.eras.late_antique.rank.m[4];
      out.errors = FB.lexicon.validate();
      return out;
    });
    expect(result.unknownTerm).toContain('thane is not a base term');
    expect(result.badRank).toContain('rank needs m and f arrays with eight tiers');
    expect(result.badLayer).toContain('is not a lexicon layer');
    expect(result.unknownEra).toContain('names an unknown eras id');
    expect(result.applied).toBe('ok');
    expect(result.manor).toBe('Declare the estate');
    expect(result.keptLabel).toBe('Mail shirt');
    expect(result.newLabel).toBe('Cavalry mount');
    expect(result.keptRank).toBe('Comes');
    expect(result.errors).toEqual([]);
  });

/* Developer-only or non-display literals that may keep a political word. */
const ALLOWED = new Map([
  ['vassal hierarchy', 'save repair diagnostic label'],
  ['liege edges', 'treasury integrity diagnostic label'],
  [' has missing liege ', 'bookmark validation fault for authors'],
  [' has a liege cycle.', 'bookmark validation fault for authors'],
  ['World annual phase: vassal breakaways', 'profiler phase name'],
  ['governance realm council parliament estates crown authority vassal king emperor',
    'Guide search keywords, never displayed']
]);
const WORD = /\b(?:vassals?|lieges?|fiefs?|crown authority|knights?|barons?|serfs?|manors?)\b/i;

test('engine display text names political terms only through the lexicon',
  async function ({}, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'The source lint reads files in Node and needs one browser target.');
    const problems = [];
    for (const source of engineSources()) {
      if (source.file === 'js/lexicon.js') continue;
      let changelogEnd = 0;
      if (source.file === 'js/main.js') {
        const startLine = source.lines.findIndex(function (line) {
          return /^FB\.CHANGELOG = \[/.test(line);
        });
        changelogEnd = startLine + source.lines.slice(startLine).findIndex(function (line) {
          return /^\s*\];/.test(line);
        }) + 1;
      }
      for (const literal of source.scan.literals) {
        const value = literal.value;
        if (literal.line <= changelogEnd) continue;
        if (!WORD.test(value.replace(/\{[^{}]*\}/g, ''))) continue;
        /* ids, keys, selectors and markup fragments are not display text */
        if (/^[a-z0-9_.:-]+$/i.test(value) && !/^[A-Z][a-z]+$/.test(value)) continue;
        if (/[<>]|data-|aria-|class=|\bid="|^[.#]|^\s*"/.test(value)) continue;
        if (ALLOWED.has(value)) continue;
        problems.push(source.file + ':' + literal.line + ': ' + value);
      }
    }
    expect(problems).toEqual([]);
  });
