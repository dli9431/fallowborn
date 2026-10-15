'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
// This is intentionally a catalogue-wide authoring canary.
dependsOnRuntime(__filename, ['index.html', 'data', 'js']);

const cases = [
  ['unknown era', 'era', /unknown era missing_era/],
  ['unknown geography', 'geography', /unknown geography missing_geography/i],
  ['unknown form', 'form', /unknown government missing_form/],
  ['unregistered strategy', 'strategy', /holders strategy missing_strategy/],
  ['unregistered world story', 'story', /missing_story.*(?:registered|unregistered)|unregistered.*missing_story/],
  ['unregistered start', 'start', /unregistered start missing_start/],
  ['unregistered system', 'system', /[Uu]nknown system missing_system/],
  ['era window', 'era_date', /outside era late_antique/],
  ['technology coverage', 'technology_date', /outside the technology catalogue/],
  ['malformed date', 'date', /invalid start date/],
  ['unknown realm tradition', 'tradition', /missing_tradition/],
  ['unknown ruler culture', 'culture', /ruler: unknown culture missing_culture/],
  ['unknown realm faith', 'faith', /missing_faith/],
  ['required faith institution', 'faith_system', /faith nicene: requires unavailable system papacy/],
  ['null faith requirements', 'faith_requirements', /faith nicene: requirements must be an object/],
  ['null faith-head requirements', 'head_requirements', /faith nicene head: requirements must be an object/],
  ['absent starting form', 'start_form', /government form territorial is absent/],
  ['missing province', 'province', /unknown provinces requirement missing_province/],
  ['missing site', 'site', /unknown sites requirement missing_site/],
  ['missing title', 'title', /unknown title kingdom\/missing_title/],
  ['story dependency', 'dependency', /requires unattached story missing_story/],
  ['inapplicable story', 'inapplicable', /cannot apply to this bookmark/],
  ['missing appearance', 'appearance', /no appearance profile resolves/],
  ['missing name pool', 'names', /no male name pool resolves/],
  ['undefined faith office', 'office', /officeId/],
  ['unknown faith-head system', 'head_system', /[Uu]nknown system missing_system/],
  ['unknown garment', 'garment', /unknown garment missing_garment/],
  ['capability without a grant', 'capability', /granted by no technology/],
  ['missing climate', 'climate', /defaultClimateZone must name a climate zone/],
  ['unknown season kind', 'season', /four known season kinds/],
  ['unknown knowledge province', 'knowledge_province', /unknown provinces missing_province/],
  ['unknown knowledge basin', 'knowledge_basin', /unknown basins missing_basin/],
  ['unknown knowledge start', 'knowledge_start', /unknown start missing_start/],
  ['content in an unknown system', 'content_system', /[Uu]nknown system missing_system/],
  ['career without a role', 'career_role', /career farmer: needs a registered role/],
  ['building without a role', 'building_role', /Building .* needs a role/],
  ['unit without a role', 'unit_role', /Unit class .* needs a role/],
  ['undefined legal tradition', 'law', /no legal tradition resolves/],
  ['undefined architecture', 'architecture', /no architecture style resolves/],
  ['undefined currency', 'currency', /no currency resolves/],
  ['unknown balance key', 'balance', /missing_balance/],
  ['invalid institution seat', 'institution_seat', /localInstitutions.*seat must resolve/],
  ['invalid institution office', 'institution_office', /invalid officeId/],
  ['invalid institution faith', 'institution_faith', /unknown or unassignable faith/],
  ['invalid institution profile', 'institution_profile', /invalid representative traits/],
  ['vacancy with an incumbent', 'institution_vacancy', /vacant institution cannot seed/]
];

for (const [label, change, expected] of cases) {
  test('requirement gate names ' + label, async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const errors = await page.evaluate(function (change) {
      const bm = JSON.parse(JSON.stringify(FB.bookmark('493')));
      const realm = bm.realms[0];
      const scenario = FBDATA.startScenarios.filter(function (s) { return s.id === 'farmer_493'; })[0];
      const geography = FBDATA.geographies[bm.geography];
      const faith = FBDATA.religions.nicene.properties;
      const culture = FBDATA.cultures.roman;
      switch (change) {
        case 'era': bm.era = 'missing_era'; break;
        case 'geography': bm.geography = 'missing_geography'; break;
        case 'form': realm.government = 'missing_form'; break;
        case 'strategy': FBDATA.governmentForms[realm.government].holders = 'missing_strategy'; break;
        case 'story': bm.stories = ['missing_story']; break;
        case 'start': bm.starts = ['missing_start']; break;
        case 'system': bm.systems = { enable:['missing_system'] }; break;
        case 'era_date': bm.date.year = 700; break;
        case 'technology_date': bm.date.year = 1400; break;
        case 'date': bm.date.season = undefined; break;
        case 'tradition': realm.techTraditions = ['missing_tradition']; break;
        case 'culture': realm.ruler.culture = 'missing_culture'; break;
        case 'faith': realm.religion = 'missing_faith'; break;
        case 'faith_system': faith.requirements = { systems:['papacy'] }; break;
        case 'faith_requirements': faith.requirements = null; break;
        case 'head_requirements': faith.head.requirements = null; break;
        case 'start_form': scenario.governmentForm = 'territorial'; break;
        case 'province': bm.requirements = { provinces:['missing_province'] }; break;
        case 'site': bm.requirements = { sites:['missing_site'] }; break;
        case 'title': bm.requirements = { titles:[{ kind:'kingdom', id:'missing_title' }] }; break;
        case 'dependency': FB.stories.get(bm.stories[0]).requires = ['missing_story']; break;
        case 'inapplicable': FB.stories.get(bm.stories[0]).appliesToBookmark = function () { return false; }; break;
        case 'appearance': delete culture.appearance; delete culture.appearanceEras; delete culture.parent; break;
        case 'names': culture.male = []; delete culture.nameEras; delete culture.parent; break;
        case 'office': faith.head = { officeId:null, holderKind:'character', succession:'hereditary' }; break;
        case 'head_system': faith.head.system = 'missing_system'; break;
        case 'garment': FBDATA.wardrobes.late_antique.garments[0].garment = 'missing_garment'; break;
        case 'capability': FBDATA.capabilities.proof_ungranted = {}; bm.requirements = { capabilities:['proof_ungranted'] }; break;
        case 'climate': delete bm.climate; delete geography.climate; delete FBDATA.defaultClimateZone; break;
        case 'season': FBDATA.climateZones.northern_temperate.seasons[0] = 'missing_season'; break;
        case 'knowledge_province': geography.knowledge = { starts:{ farmer_493:{ provinces:['missing_province'] } } }; break;
        case 'knowledge_basin': geography.knowledge = { starts:{ farmer_493:{ basins:['missing_basin'] } } }; break;
        case 'knowledge_start': geography.knowledge = { starts:{ missing_start:{} } }; break;
        case 'content_system': FBDATA.careers.farmer.system = 'missing_system'; break;
        case 'career_role': delete FBDATA.careers.farmer.role; break;
        case 'building_role': delete FBDATA.buildings[Object.keys(FBDATA.buildings)[0]].role; break;
        case 'unit_role': delete FBDATA.unitClasses[Object.keys(FBDATA.unitClasses)[0]].role; break;
        case 'law': faith.legalTradition = 'missing_law'; break;
        case 'architecture': Object.keys(FBDATA.cultures).forEach(function (id) { delete FBDATA.cultures[id].architecture; }); delete FBDATA.eras.late_antique.architecture; delete FBDATA.architectureStyles.manuscript; break;
        case 'currency': delete geography.currency; delete FBDATA.eras.late_antique.currency; delete FBDATA.currency; break;
        case 'balance': bm.balance = { missing_balance:1 }; break;
        case 'institution_seat': bm.localInstitutions.rome_see.site = 'missing_site'; break;
        case 'institution_office': delete bm.localInstitutions.rome_see.officeId; break;
        case 'institution_faith': bm.localInstitutions.rome_see.religion = 'missing_faith'; break;
        case 'institution_profile': bm.localInstitutions.rome_see.representative = { traits:['missing_trait'] }; break;
        case 'institution_vacancy': bm.localInstitutions.rome_see.vacant = true; break;
      }
      FB.invalidateCultureData(); FB.invalidateReligionData();
      return FB.validateBookmark(bm);
    }, change);
    expect(errors.join('\n')).toMatch(expected);
  });
}

test('headless 711 faiths pass bookmark and mod requirements without mutation', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const result = await page.evaluate(function () {
    const bm = FB.bookmark('711');
    const before = JSON.stringify(FBDATA), state = FB.state;
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const faults = FB.validateBookmark(bm);
    const errors = FB.mods.validate({ bookmarks:[JSON.parse(JSON.stringify(bm))] });
    return { faults:faults, errors:errors,
      heads:['buddhist_711','hindu_711'].map(function (id) { return FB.religionOf(id, null).head; }),
      unchanged:before === JSON.stringify(FBDATA) && state === FB.state &&
        rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result).toEqual({ faults:[], errors:[], heads:[null,null], unchanged:true });
});

test('missing bookmark validation reports a diagnostic without entering opening hooks', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const result = await page.evaluate(function () {
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    return { faults:[FB.validateBookmark(null), FB.validateBookmark(undefined)],
      unchanged:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result).toEqual({ faults:[['Bookmark definition is missing.'], ['Bookmark definition is missing.']], unchanged:true });
});

test('bookmark validation leaves legacy technology defaults untouched until accepted activation', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const result = await page.evaluate(async function () {
    const id = Object.keys(FBDATA.tech).filter(function (id) {
      return !(FBDATA.tech[id].reqAny || []).length;
    })[0];
    delete FBDATA.tech[id].reqAny;
    const invalid = JSON.parse(JSON.stringify(FB.bookmark('867', 'baseline')));
    invalid.id = 'invalid_technology_review'; invalid.requirements = { provinces:['missing_province'] };
    FBDATA.bookmarks[invalid.id] = invalid;
    const before = JSON.stringify(FBDATA), state = FB.state, world = FB.world;
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const faults = FB.validateBookmark(FB.bookmark('867'));
    const rejected = await new Promise(function (resolve) {
      FB.activateBookmark(invalid.id, null, function (error) { resolve(error && error.message); });
    });
    const unchanged = before === JSON.stringify(FBDATA) && state === FB.state && world === FB.world &&
      rng === FB.getRngState() && uid === FB.getUidCounter();
    await new Promise(function (resolve, reject) {
      FB.activateBookmark('867', null, function (error) { if (error) reject(error); else resolve(); });
    });
    return { faults:faults, rejected:rejected, unchanged:unchanged, normalized:FBDATA.tech[id].reqAny };
  });
  expect(result.faults).toEqual([]);
  expect(result.rejected).toContain('unknown provinces requirement missing_province');
  expect(result.unchanged).toBe(true);
  expect(result.normalized).toEqual([]);
});

test('late antique faith heads share their campaign sees without blocking activation or mods', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const result = await page.evaluate(async function () {
    const faults = ['476', '493'].map(function (id) { return FB.validateBookmark(FB.bookmark(id)); });
    await new Promise(function (resolve, reject) {
      FB.activateBookmark('476', null, function (error) { if (error) reject(error); else resolve(); });
    });
    const bm = JSON.parse(JSON.stringify(FBDATA.bookmarks['476']));
    [bm].concat(Object.values(bm.revisions || {})).forEach(function (layer) {
      if (layer.localInstitutions && layer.localInstitutions.rome_see)
        layer.localInstitutions.rome_see.religion = 'proof_nicene';
    });
    const mod = { bookmarks:[bm], religions:{ proof_nicene:{ name:'Proof communion',
      group:'nicene', relationToParent:'in_fold', properties:{} } } };
    const before = JSON.stringify(FBDATA), errors = FB.mods.validate(mod);
    const pure = before === JSON.stringify(FBDATA);
    if (!errors.length) FB.mods.apply(mod);
    return { faults:faults, active:FB.activeBookmark.id, errors:errors, pure:pure,
      office:FB.faithOfficeId('proof_nicene', null),
      installed:FB.bookmark('476').localInstitutions.rome_see.religion };
  });
  expect(result).toEqual({ faults:[[], []], active:'476', errors:[], pure:true,
    office:'rome_bishop', installed:'proof_nicene' });
});

test('local sees reject incompatible central offices and duplicate office seeds', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const results = await page.evaluate(function () {
    return ['realm_office', 'other_communion', 'duplicate'].map(function (change) {
      const bm = JSON.parse(JSON.stringify(FB.bookmark('476')));
      if (change === 'realm_office') bm.localInstitutions.rome_see.officeId = 'catholic';
      if (change === 'other_communion') bm.localInstitutions.rome_see.religion = 'homoian';
      if (change === 'duplicate') bm.localInstitutions.milan_see.officeId = 'rome_bishop';
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const faults = FB.validateBookmark(bm), mod = { bookmarks:[bm] };
      const modErrors = FB.mods.validate(mod);
      let rejected = false;
      try { FB.mods.apply(mod); } catch (error) { rejected = true; }
      return { faults:faults, modErrors:modErrors, rejected:rejected,
        unchanged:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter() };
    });
  });
  for (let i = 0; i < results.length; i++) {
    const diagnostic = i === 2 ? /duplicate officeId rome_bishop/ : /incompatible central faith office/;
    expect(results[i].faults.join('\n')).toMatch(diagnostic);
    expect(results[i].modErrors.join('\n')).toMatch(diagnostic);
    expect(results[i].rejected && results[i].unchanged).toBe(true);
  }
});

test('bookmark replacements recheck existing ruler and fixed-community starts', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const results = await page.evaluate(function () {
    // The bundled federate role now has several camps. Give this fixture a
    // fixed birthplace so it continues to exercise the fixed-community gate.
    FBDATA.startScenarios.find(function (s) { return s.id === 'federate_476'; }).fixedProvinceId = 'ravenna';
    return ['ruler', 'community'].map(function (change) {
      const bm = JSON.parse(JSON.stringify(FB.bookmark('476')));
      if (change === 'ruler') bm.realms.filter(function (r) { return r.id === 'croatia'; })[0].ruler.name = 'Another ruler';
      else {
        const county = bm.provinces.filter(function (p) { return p.id === 'ravenna'; })[0];
        county.communities = [{ culture:county.culture, religion:county.religion, populationShare0:10000 }];
      }
      const before = JSON.stringify(FBDATA);
      const faults = FB.validateBookmark(bm), errors = FB.mods.validate({ bookmarks:[bm] });
      return { faults:faults.join('\n'), errors:errors.join('\n'), unchanged:before === JSON.stringify(FBDATA) };
    });
  });
  const diagnostics = [/start nepos_476: existing ruler identity/, /start federate_476: fixed culture and faith are absent/];
  results.forEach(function (result, i) {
    expect(result.faults).toMatch(diagnostics[i]);
    expect(result.errors).toMatch(diagnostics[i]);
    expect(result.unchanged).toBe(true);
  });
});

test('mod start validation keeps an existing ruler identity distinct from county residents', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const result = await page.evaluate(function () {
    const scenario = FBDATA.startScenarios.filter(function (s) { return s.id === 'syagrius_476'; })[0];
    const county = FB.bookmark('476').provinces.filter(function (p) { return p.id === scenario.fixedProvinceId; })[0];
    const resident = FB.provinceCommunities(county).some(function (c) { return c.culture === scenario.startCulture; });
    return { resident:resident, errors:FB.mods.validate({ startScenarios:[JSON.parse(JSON.stringify(scenario))] }) };
  });
  expect(result).toEqual({ resident:false, errors:[] });
});

test('unused mod faiths cannot introduce an unregistered head system', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const result = await page.evaluate(function () {
    const before = JSON.stringify(FBDATA);
    const mod = { religions:{ proof_unused_head:{ name:'Proof head system', group:'catholic',
      relationToParent:'in_fold', properties:{ head:{ system:'missing_system' } } } } };
    const errors = FB.mods.validate(mod);
    let rejected = false;
    try { FB.mods.apply(mod); } catch (error) { rejected = true; }
    return { errors:errors.join('\n'), rejected:rejected, unchanged:before === JSON.stringify(FBDATA) };
  });
  expect(result.errors).toMatch(/[Uu]nknown system missing_system/);
  expect(result.rejected && result.unchanged).toBe(true);
});

test('malformed bookmark arrays cannot be silently ignored or overwrite an earlier entry', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const results = await page.evaluate(function () {
    const bm = JSON.parse(JSON.stringify(FB.bookmark('867')));
    return [[{}], [null], [bm, bm]].map(function (bookmarks) {
      const before = JSON.stringify(FBDATA);
      const errors = FB.mods.validate({ bookmarks:bookmarks });
      let rejected = false;
      try { FB.mods.apply({ bookmarks:bookmarks }); } catch (error) { rejected = true; }
      return { errors:errors.join('\n'), rejected:rejected, unchanged:before === JSON.stringify(FBDATA) };
    });
  });
  results.forEach(function (result, i) {
    expect(result.errors).toMatch(i === 2 ? /must not repeat 867/ : /must be a bookmark id/);
    expect(result.rejected && result.unchanged).toBe(true);
  });
});

test('malformed dates and community lists return diagnostics through the opening validator', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const results = await page.evaluate(function () {
    const malformedDates = [undefined, null, {}, { year:'493', season:0, day:1 },
      { year:493.5, season:0, day:1 }].map(function (date) {
      const bm = JSON.parse(JSON.stringify(FB.bookmark('493')));
      if (date === undefined) delete bm.date;
      else bm.date = date;
      return bm;
    });
    const invalidCommunities = JSON.parse(JSON.stringify(FB.bookmark('493')));
    const layout = FBDATA.settlementLayouts[invalidCommunities.settlementLayout];
    const county = invalidCommunities.provinces.filter(function (p) { return !p.wasteland && layout[p.id]; })[0];
    const entry = layout[county.id][0];
    county.communities = {};
    county.settlements = [Object.assign({}, entry, { communities:[{ culture:county.culture,
      religion:county.religion, populationShare0:10000 }] })];
    const malformedScope = JSON.parse(JSON.stringify(FB.bookmark('493')));
    const institution = Object.values(malformedScope.localInstitutions).find(function (d) { return !!d.profileId; });
    if (!institution) throw new Error('Expected a profile institution');
    institution.jurisdictionIds = null;
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const faults = { dates:malformedDates.map(function (bm) { return FB.validateBookmark(bm).join('\n'); }),
      communities:FB.validateBookmark(invalidCommunities).join('\n'),
      scope:FB.validateBookmark(malformedScope).join('\n') };
    if (before !== JSON.stringify(FBDATA) || rng !== FB.getRngState() || uid !== FB.getUidCounter())
      throw new Error('Malformed definition validation changed the catalogue or identity');
    return faults;
  });
  results.dates.forEach(function (faults) { expect(faults).toContain('invalid start date'); });
  expect(results.communities).toContain('Invalid settlement community partition');
  expect(results.scope).toContain('invalid local jurisdiction');
});

test('invalid activation preserves the active world, RNG and state', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const result = await page.evaluate(function () {
    const world = FB.world, bookmark = FB.activeBookmark, state = FB.state;
    const rng = FB.getRngState(), uid = FB.getUidCounter(), provinces = FBDATA.provinces;
    FBDATA.bookmarks.invalid_activation = Object.assign({}, FB.bookmark('867', 'baseline'),
      { id:'invalid_activation', requirements:{ provinces:['missing_province'] } });
    return new Promise(function (resolve) {
      FB.activateBookmark('invalid_activation', null, function (error) {
        resolve({ error:error && error.message, unchanged:world === FB.world && bookmark === FB.activeBookmark &&
          state === FB.state && rng === FB.getRngState() && uid === FB.getUidCounter() && provinces === FBDATA.provinces });
      });
    });
  });
  expect(result.error).toContain('Bookmark invalid_activation');
  expect(result.unchanged).toBe(true);
});

test('runtime mod rejection is atomic for bookmarks, eras and content', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const result = await page.evaluate(function () {
    const before = JSON.stringify(FBDATA), root = FBDATA, rng = FB.getRngState(), uid = FB.getUidCounter();
    const invalid = JSON.parse(JSON.stringify(FB.bookmark('867'))); invalid.id = 'invalid_mod'; invalid.era = 'missing_era';
    const errors = [];
    [{ bookmarks:[invalid], traits:{ proof_trait:{ name:'Proof', health:1 } } },
      { eras:{ early_medieval:Object.assign({}, FBDATA.eras.early_medieval, { defaultGovernment:'missing_form' }) } },
      { careers:{ farmer:Object.assign({}, FBDATA.careers.farmer, { system:'missing_system' }) } },
      { modifiers:{ proof_modifier:{ name:'Proof modifier', systems:['missing_system'] } } },
      { balance:{ missing_balance:1 } }
    ].forEach(function (mod) { try { FB.mods.apply(mod); } catch (e) { errors.push(e.message); } });
    return { errors:errors, unchanged:root === FBDATA && before === JSON.stringify(FBDATA) &&
      rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result.errors).toHaveLength(5);
  expect(result.unchanged).toBe(true);
});

test('capability coverage accepts inherited grants and rejects late prerequisite chains', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const result = await page.evaluate(function () {
    const sample = Object.keys(FBDATA.tech).filter(function (id) { return (FBDATA.tech[id].capabilities || []).length; })[0];
    const grant = JSON.parse(JSON.stringify(FBDATA.tech[sample]));
    grant.history.attested = [400, 450]; grant.req = []; grant.reqAny = []; grant.capabilities = ['proof_capability'];
    FBDATA.capabilities.proof_capability = {};
    FBDATA.tech.proof_grant = grant;
    const inherited = FB.capabilityInEraWindow('proof_capability', 'late_antique');
    const late = JSON.parse(JSON.stringify(grant)); late.history.attested = [1000, 1050]; late.capabilities = [];
    FBDATA.tech.proof_late = late; grant.req = ['proof_late'];
    const blocked = FB.capabilityInEraWindow('proof_capability', 'late_antique');
    grant.req = []; grant.reqAny = ['proof_late', sample];
    const alternative = FB.capabilityInEraWindow('proof_capability', 'high_medieval');
    return { inherited:inherited, blocked:blocked, alternative:alternative };
  });
  expect(result).toEqual({ inherited:true, blocked:false, alternative:true });
});

test('same-mod era, form, culture, wardrobe, layout and lexicon satisfy the composed gate', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const result = await page.evaluate(function () {
    const copy = function (v) { return JSON.parse(JSON.stringify(v)); };
    const early = copy(FBDATA.eras.early_medieval); early.to = 998; early.technology.to = 998;
    const era = copy(early); era.from = 999; era.to = 999; era.technology.from = 999; era.technology.to = 999;
    era.defaultGovernment = 'proof_form'; era.defaultCulture = 'proof_culture'; era.costume = 'proof_wardrobe';
    const bm = copy(FB.bookmark('867', 'baseline')); bm.id = 'proof_era_date'; bm.era = 'proof_era'; bm.date.year = 999;
    bm.settlementLayout = 'proof_layout'; bm.starts = ['proof_era_start']; bm.stories = [];
    bm.realms[0].government = 'proof_form';
    const scenario = copy(FBDATA.startScenarios.filter(function (s) { return s.id === 'farmer'; })[0]);
    scenario.id = 'proof_era_start'; scenario.bookmarkIds = [bm.id]; scenario.eras = ['proof_era']; scenario.tracks = [];
    const units = copy(FBDATA.unitClasses);
    Object.keys(units).forEach(function (id) { if (units[id].eras) units[id].eras.push('proof_era'); });
    const mod = { eras:{ early_medieval:early, proof_era:era }, bookmarks:[bm],
      cultures:{ proof_culture:{ name:'Proof culture', parent:'frankish' } },
      governmentForms:{ proof_form:copy(FBDATA.governmentForms.territorial) },
      wardrobes:{ proof_wardrobe:copy(FBDATA.wardrobes.medieval) }, settlementLayouts:{ proof_layout:{} },
      lexicons:{ eras:{ proof_era:{ terms:{ county:{ one:'district', other:'districts' } } } } }, unitClasses:units, startScenarios:[scenario] };
    const before = JSON.stringify(FBDATA), errors = FB.mods.validate(mod);
    const pure = before === JSON.stringify(FBDATA);
    if (!errors.length) FB.mods.apply(mod);
    return { errors:errors, pure:pure, installed:!!FB.bookmark(bm.id),
      faults:errors.length ? [] : FB.validateBookmark(FB.bookmark(bm.id)) };
  });
  expect(result).toEqual({ errors:[], pure:true, installed:true, faults:[] });
});

test('invalid stored mods are rejected before browser storage changes', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const result = await page.evaluate(function () {
    const before = localStorage.getItem('fb_mods');
    const accepted = FB.mods.store(JSON.stringify({ eras:{ missing_era:{ from:1, to:0 } } }));
    return { accepted:accepted, unchanged:before === localStorage.getItem('fb_mods') };
  });
  expect(result).toEqual({ accepted:false, unchanged:true });
});

test('dependent partitions may name only the future realm their attached prerequisite declares', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const result = await page.evaluate(function () {
    const bm = JSON.parse(JSON.stringify(FB.bookmark('1204')));
    const valid = FB.validateBookmark(bm);
    const child = FB.stories.get('athens_partition_1204').declaration;
    const original = child.grant.liege;
    child.grant.liege = 'missing_future_realm';
    const missing = FB.validateBookmark(bm);
    child.grant.liege = original;
    bm.stories = bm.stories.filter(function (id) { return id !== 'thessalonica_partition_1204'; });
    return { valid:valid, missing:missing, unattached:FB.validateBookmark(bm) };
  });
  expect(result.valid).toEqual([]);
  expect(result.missing.join('\n')).toMatch(/grant.liege references unknown id missing_future_realm/);
  expect(result.unattached.join('\n')).toContain('requires unattached story thessalonica_partition_1204');
});

test('an applicability hook failure returns a named diagnostic', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const errors = await page.evaluate(function () {
    const bm = FB.bookmark('493');
    FB.stories.get(bm.stories[0]).appliesToBookmark = function () { throw new Error('proof hook failed'); };
    return FB.validateBookmark(bm);
  });
  expect(errors.join('\n')).toContain('applicability failed: proof hook failed');
});
