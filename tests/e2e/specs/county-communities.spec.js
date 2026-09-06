'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/bookmarks.js',
  'data/starts.js',
  'data/counties.js',
  'data/cultures.js',
  'data/technology.js',
  'data/units.js',
  'js/actions.js',
  'js/events.js',
  'js/main.js',
  'js/model.js',
  'js/save.js',
  'js/population.js',
  'js/world.js',
  'js/ui_panels.js',
  'js/ui_modals.js'
]);

/* Authored and live county communities: bookmark manifests, opening shares,
   schema validation, character creation, runtime routing, and start-code compatibility.
   Authored per docs/designs/provinces.md; NOT run by the authoring agent
   (owner runs the harness). */

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame, unlockStartTier } = require('../support/game/start');

const EXPECTED = {
  '867':{
    halogaland:'norse.norse_pagan>sami.norse_pagan',
    norrland:'sami.norse_pagan>norse.norse_pagan',
    iona:'gaelic.catholic>norse.norse_pagan',
    man:'norse.norse_pagan>gaelic.catholic',
    lewis:'norse.norse_pagan>gaelic.catholic',
    dublin:'norse.norse_pagan>gaelic.catholic',
    york:'english.catholic>norse.norse_pagan',
    scarborough:'english.catholic>norse.norse_pagan',
    cordoba:'andalusi.sunni>iberian.catholic',
    sevilla:'andalusi.sunni>iberian.catholic',
    ecija:'andalusi.sunni>iberian.catholic',
    niebla:'andalusi.sunni>iberian.catholic',
    toledo:'andalusi.sunni>iberian.catholic',
    granada:'andalusi.sunni>iberian.catholic',
    malaga:'andalusi.sunni>iberian.catholic',
    almeria:'andalusi.sunni>iberian.catholic',
    badajoz:'andalusi.sunni>iberian.catholic',
    merida:'andalusi.sunni>iberian.catholic',
    evora:'andalusi.sunni>iberian.catholic',
    lisboa:'andalusi.sunni>iberian.catholic',
    santarem:'andalusi.sunni>iberian.catholic',
    coimbra:'andalusi.sunni>iberian.catholic',
    silves:'andalusi.sunni>iberian.catholic',
    beja:'andalusi.sunni>iberian.catholic',
    valencia:'andalusi.sunni>iberian.catholic',
    murcia:'andalusi.sunni>iberian.catholic',
    denia:'andalusi.sunni>iberian.catholic',
    tortosa:'andalusi.sunni>iberian.catholic',
    tarragona:'andalusi.sunni>iberian.catholic',
    lerida:'andalusi.sunni>iberian.catholic',
    zaragoza:'andalusi.sunni>iberian.catholic',
    huesca:'andalusi.sunni>iberian.catholic',
    tudela:'andalusi.sunni>iberian.catholic',
    pamplona:'basque.catholic>iberian.catholic',
    alava:'iberian.catholic>basque.catholic',
    logrono:'iberian.catholic>basque.catholic',
    aragon:'iberian.catholic>basque.catholic',
    bayonne:'frankish.catholic>basque.catholic',
    palermo:'arabic.sunni>greek.orthodox',
    messina:'greek.orthodox>arabic.sunni',
    novgorod:'slavic.slavic_pagan>norse.norse_pagan>rus.slavic_pagan>finnic.baltic_pagan',
    ladoga:'slavic.slavic_pagan>norse.norse_pagan>rus.slavic_pagan>finnic.baltic_pagan',
    beloozero:'slavic.slavic_pagan>finnic.baltic_pagan',
    kiev:'slavic.slavic_pagan>norse.norse_pagan>rus.slavic_pagan',
    atil:'khazar.jewish>khazar.tengri>turkic.tengri',
    tunis:'berber.sunni>arabic.sunni',
    kairouan:'berber.sunni>arabic.sunni',
    split:'italian.catholic>slavic.catholic',
    zadar:'italian.catholic>slavic.catholic',
    kotor:'italian.catholic>slavic.orthodox',
    tbilisi:'georgian.orthodox>arabic.sunni',
    edinburgh:'english.catholic>gaelic.catholic',
    glasgow:'brezhon.catholic>gaelic.catholic',
    dumbarton:'brezhon.catholic>gaelic.catholic',
    rennes:'brezhon.catholic>frankish.catholic',
    nantes:'brezhon.catholic>frankish.catholic',
    thessaloniki:'greek.orthodox>slavic.orthodox',
    serres:'greek.orthodox>slavic.orthodox',
    serdica:'slavic.orthodox>greek.orthodox',
    philippopolis:'slavic.orthodox>greek.orthodox',
    caesarea:'greek.orthodox>armenian.eastern',
    sebasteia:'greek.orthodox>armenian.eastern',
    alexandria:'arabic.sunni>coptic.eastern',
    rosetta:'arabic.sunni>coptic.eastern',
    fustat:'arabic.sunni>coptic.eastern',
    fayyum:'arabic.sunni>coptic.eastern',
    asyut:'arabic.sunni>coptic.eastern',
    luxor:'arabic.sunni>coptic.eastern',
    aswan:'arabic.sunni>coptic.eastern',
    mosul:'arabic.sunni>syriac.eastern',
    amida:'arabic.sunni>syriac.eastern',
    edessa:'arabic.sunni>syriac.eastern'
  },
  '1066':{
    halogaland:'norse.catholic>sami.norse_pagan',
    norrland:'norse.catholic>sami.norse_pagan',
    metz:'frankish.catholic>ashkenazi.jewish',
    trier:'frankish.catholic>ashkenazi.jewish',
    troyes:'frankish.catholic>ashkenazi.jewish',
    cologne:'german.catholic>ashkenazi.jewish',
    mainz:'german.catholic>ashkenazi.jewish',
    worms:'german.catholic>ashkenazi.jewish',
    regensburg:'german.catholic>ashkenazi.jewish',
    iona:'gaelic.catholic>norse.catholic',
    man:'norse.catholic>gaelic.catholic',
    lewis:'norse.catholic>gaelic.catholic',
    dublin:'gaelic.catholic>norse.catholic',
    wexford:'gaelic.catholic>norse.catholic',
    cork:'gaelic.catholic>norse.catholic',
    limerick:'gaelic.catholic>norse.catholic',
    york:'english.catholic>norse.catholic',
    scarborough:'english.catholic>norse.catholic',
    lincoln:'english.catholic>norse.catholic',
    stamford:'english.catholic>norse.catholic',
    norwich:'english.catholic>norse.catholic',
    ipswich:'english.catholic>norse.catholic',
    cordoba:'andalusi.sunni>iberian.catholic',
    sevilla:'andalusi.sunni>iberian.catholic',
    ecija:'andalusi.sunni>iberian.catholic',
    niebla:'andalusi.sunni>iberian.catholic',
    toledo:'andalusi.sunni>iberian.catholic',
    granada:'andalusi.sunni>berber.sunni>iberian.catholic',
    malaga:'andalusi.sunni>iberian.catholic',
    almeria:'andalusi.sunni>iberian.catholic',
    badajoz:'andalusi.sunni>berber.sunni>iberian.catholic',
    merida:'andalusi.sunni>iberian.catholic',
    evora:'andalusi.sunni>iberian.catholic',
    lisboa:'andalusi.sunni>iberian.catholic',
    santarem:'andalusi.sunni>iberian.catholic',
    coimbra:'andalusi.sunni>iberian.catholic',
    silves:'andalusi.sunni>iberian.catholic',
    beja:'andalusi.sunni>iberian.catholic',
    valencia:'andalusi.sunni>iberian.catholic',
    murcia:'andalusi.sunni>iberian.catholic',
    denia:'andalusi.sunni>iberian.catholic',
    tortosa:'andalusi.sunni>iberian.catholic',
    tarragona:'andalusi.sunni>iberian.catholic',
    lerida:'andalusi.sunni>iberian.catholic',
    zaragoza:'andalusi.sunni>iberian.catholic',
    huesca:'andalusi.sunni>iberian.catholic',
    tudela:'andalusi.sunni>iberian.catholic',
    pamplona:'basque.catholic>iberian.catholic',
    alava:'iberian.catholic>basque.catholic',
    logrono:'iberian.catholic>basque.catholic',
    aragon:'iberian.catholic>basque.catholic',
    bayonne:'frankish.catholic>basque.catholic',
    palermo:'arabic.sunni>greek.orthodox',
    siracusa:'arabic.sunni>greek.orthodox',
    messina:'greek.orthodox>arabic.sunni>italian.catholic',
    bari:'italian.catholic>greek.orthodox',
    taranto:'greek.orthodox>italian.catholic',
    brindisi:'greek.orthodox>italian.catholic',
    reggio:'greek.orthodox>italian.catholic',
    cosenza:'greek.orthodox>italian.catholic',
    foggia:'italian.catholic>norman.catholic',
    tunis:'berber.sunni>arabic.sunni',
    kairouan:'berber.sunni>arabic.sunni',
    split:'slavic.catholic>italian.catholic',
    zadar:'slavic.catholic>italian.catholic',
    kotor:'slavic.orthodox>italian.catholic',
    szekesfehervar:'magyar.catholic>slavic.catholic',
    moson:'magyar.catholic>slavic.catholic',
    sirmium:'slavic.catholic>magyar.catholic',
    osijek:'slavic.catholic>magyar.catholic',
    tbilisi:'georgian.orthodox>arabic.sunni',
    van:'armenian.eastern>turkic.sunni',
    ani:'armenian.eastern>turkic.sunni',
    kars:'armenian.eastern>turkic.sunni',
    dvin:'armenian.eastern>turkic.sunni',
    rayy:'persian.sunni>turkic.sunni',
    hamadan:'persian.sunni>turkic.sunni',
    isfahan:'persian.sunni>turkic.sunni',
    merv:'persian.sunni>turkic.sunni',
    nishapur:'persian.sunni>turkic.sunni',
    herat:'persian.sunni>turkic.sunni',
    bukhara:'persian.sunni>turkic.sunni',
    samarkand:'persian.sunni>turkic.sunni',
    edinburgh:'english.catholic>gaelic.catholic',
    glasgow:'brezhon.catholic>gaelic.catholic',
    dumbarton:'brezhon.catholic>gaelic.catholic',
    rennes:'frankish.catholic>brezhon.catholic',
    nantes:'frankish.catholic>brezhon.catholic',
    thessaloniki:'greek.orthodox>slavic.orthodox',
    serres:'greek.orthodox>slavic.orthodox',
    serdica:'slavic.orthodox>greek.orthodox',
    philippopolis:'slavic.orthodox>greek.orthodox',
    caesarea:'greek.orthodox>armenian.eastern',
    sebasteia:'armenian.eastern>greek.orthodox',
    tarsos:'greek.orthodox>armenian.eastern>arabic.sunni',
    adana:'greek.orthodox>armenian.eastern>arabic.sunni',
    novgorod:'rus.orthodox>finnic.baltic_pagan',
    ladoga:'rus.orthodox>finnic.baltic_pagan',
    beloozero:'rus.orthodox>finnic.baltic_pagan',
    atil:'turkic.tengri>khazar.tengri>khazar.jewish',
    alexandria:'arabic.shia>coptic.eastern',
    rosetta:'arabic.shia>coptic.eastern',
    fustat:'arabic.shia>coptic.eastern',
    fayyum:'arabic.shia>coptic.eastern',
    asyut:'arabic.shia>coptic.eastern',
    luxor:'arabic.shia>coptic.eastern',
    aswan:'arabic.shia>coptic.eastern',
    mosul:'arabic.sunni>syriac.eastern',
    amida:'arabic.sunni>syriac.eastern',
    edessa:'arabic.sunni>syriac.eastern'
  }
};

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await unlockStartTier(page, 1);
});

async function useStartCode(page, code) {
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
}

async function reachIonaCommunityPicker(page) {
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#bookmarklist .scencard').nth(1).click();
  await page.getByRole('button', { name:/Free Farmer/ }).click();
  await page.evaluate(function () {
    FB.game.pickProvince(FB.world.byId.iona);
    FB.game.pickSettlement({ pid:'iona', index:0 });
  });
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
}

test('both bookmark manifests validate and expose every curated record in order',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const out = {
        errors:{}, diagnostics:{}, manifests:{}, counts:{}, weightedCounts:{}
      };
      ['867', '1066'].forEach(function (bookmarkId) {
        const bookmark = FB.bookmark(bookmarkId);
        out.errors[bookmarkId] = FB.validateBookmark(bookmark);
        out.diagnostics[bookmarkId] = FB.communityShareDiagnostics(bookmark);
        out.manifests[bookmarkId] = {};
        out.weightedCounts[bookmarkId] = 0;
        bookmark.provinces.forEach(function (province) {
          if (!province.communities) return;
          const shares = province.communities.map(function (community) {
            return community.populationShare0;
          });
          if (shares.every(function (share) { return Number.isInteger(share); }) &&
              shares.reduce(function (sum, share) { return sum + share; }, 0) === 10000 &&
              shares.slice(1).every(function (share) { return share <= shares[0]; })) {
            out.weightedCounts[bookmarkId]++;
          }
          out.manifests[bookmarkId][province.id] = province.communities.map(
            function (community) {
              return community.culture + '.' + community.religion;
            }).join('>');
        });
        out.counts[bookmarkId] = Object.keys(out.manifests[bookmarkId]).length;
      });
      const iona867 = FB.bookmark('867').provinces.filter(function (province) {
        return province.id === 'iona';
      })[0];
      const iona1066 = FB.bookmark('1066').provinces.filter(function (province) {
        return province.id === 'iona';
      })[0];
      out.ionaArraysAliased = iona867.communities === iona1066.communities;
      return out;
    });

    expect(result.errors['867']).toEqual([]);
    expect(result.errors['1066']).toEqual([]);
    expect(result.diagnostics).toEqual({ '867':[], '1066':[] });
    expect(result.manifests).toEqual(EXPECTED);
    expect(result.counts).toEqual({ '867':72, '1066':110 });
    expect(result.weightedCounts).toEqual({ '867':72, '1066':110 });
    expect(result.counts['867'] + result.counts['1066']).toBe(182);
    expect(result.ionaArraysAliased).toBe(false);
  });

test('regional cultures seed their historical bookmark cores and supporting systems',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      function province(bookmarkId, id) {
        return FB.bookmark(bookmarkId).provinces.filter(function (candidate) {
          return candidate.id === id;
        })[0];
      }
      function principal(bookmarkId, ids) {
        const out = {};
        ids.forEach(function (id) { out[id] = province(bookmarkId, id).culture; });
        return out;
      }
      function rulers(bookmarkId, ids) {
        const bookmark = FB.bookmark(bookmarkId), byId = {}, out = {};
        bookmark.realms.forEach(function (realm) { byId[realm.id] = realm; });
        ids.forEach(function (id) { out[id] = byId[id].ruler.culture; });
        return out;
      }
      const cultureIds = [
        'norman','coptic','syriac','khazar','finnic','sami','occitan','lombard','rus'
      ];
      const cultures = {};
      cultureIds.forEach(function (id) {
        const definition = FBDATA.cultures[id];
        cultures[id] = {
          tradition:FB.cultureGroup(id),
          maleNames:definition.male.length,
          femaleNames:definition.female.length,
          settlementParts:!!(FBDATA.settlementNames[id] &&
            FBDATA.settlementNames[id].pre.length &&
            FBDATA.settlementNames[id].suf.length)
        };
      });
      return {
        cultures:cultures,
        principals867:principal('867', [
          'rouen','toulouse','benevento','turku','norrland','atil','kiev'
        ]),
        principals1066:principal('1066', [
          'rouen','toulouse','benevento','turku','norrland','atil','kiev'
        ]),
        rulers867:rulers('867', [
          'benevento','finland','karelia','khazaria'
        ]),
        rulers1066:rulers('1066', [
          'normandy','benevento_1066','apulia_1066','kiev_1066',
          'finland_1066','karelia_1066'
        ]),
        pairedMinorities:{
          coptic867:province('867', 'alexandria').communities[1],
          coptic1066:province('1066', 'alexandria').communities[1],
          syriac867:province('867', 'mosul').communities[1],
          syriac1066:province('1066', 'mosul').communities[1],
          sami1066:province('1066', 'norrland').communities[1],
          finnic1066:province('1066', 'novgorod').communities[1]
        },
        techTraditions:{
          latin:FBDATA.techTraditions.latin.cultures,
          byzantine:FBDATA.techTraditions.byzantine.cultures,
          slavic:FBDATA.techTraditions.slavic.cultures,
          steppe:FBDATA.techTraditions.steppe.cultures,
          balticFinnic:FBDATA.techTraditions.baltic_finnic.cultures,
          northeastAfrican:FBDATA.techTraditions.northeast_african.cultures
        },
        khazarHorseArchers:
          FBDATA.unitClasses.horsearcher.cultures.indexOf('khazar') >= 0
      };
    });

    const expectedTraditions = {
      norman:'west_european', coptic:'african', syriac:'middle_eastern',
      khazar:'steppe', finnic:'uralic', sami:'uralic', occitan:'romance',
      lombard:'romance', rus:'slavic_baltic'
    };
    for (const id of Object.keys(expectedTraditions)) {
      expect(result.cultures[id].tradition).toBe(expectedTraditions[id]);
      expect(result.cultures[id].maleNames).toBeGreaterThanOrEqual(30);
      expect(result.cultures[id].femaleNames).toBeGreaterThanOrEqual(30);
      expect(result.cultures[id].settlementParts).toBe(true);
    }
    expect(result.principals867).toEqual({
      rouen:'frankish', toulouse:'occitan', benevento:'lombard',
      turku:'finnic', norrland:'sami', atil:'khazar', kiev:'slavic'
    });
    expect(result.principals1066).toEqual({
      rouen:'norman', toulouse:'occitan', benevento:'lombard',
      turku:'finnic', norrland:'norse', atil:'turkic', kiev:'rus'
    });
    expect(result.rulers867).toEqual({
      benevento:'lombard', finland:'finnic', karelia:'finnic', khazaria:'khazar'
    });
    expect(result.rulers1066).toEqual({
      normandy:'norman', benevento_1066:'lombard', apulia_1066:'norman',
      kiev_1066:'rus', finland_1066:'finnic', karelia_1066:'finnic'
    });
    expect(result.pairedMinorities).toEqual({
      coptic867:{
        culture:'coptic', religion:'eastern', paired:true, populationShare0:4500
      },
      coptic1066:{
        culture:'coptic', religion:'eastern', paired:true, populationShare0:3500
      },
      syriac867:{
        culture:'syriac', religion:'eastern', paired:true, populationShare0:3500
      },
      syriac1066:{
        culture:'syriac', religion:'eastern', paired:true, populationShare0:3000
      },
      sami1066:{
        culture:'sami', religion:'norse_pagan', paired:true, populationShare0:1500
      },
      finnic1066:{
        culture:'finnic', religion:'baltic_pagan', paired:true, populationShare0:2000
      }
    });
    expect(result.techTraditions.latin).toEqual(expect.arrayContaining([
      'norman','occitan','lombard'
    ]));
    expect(result.techTraditions.byzantine).toContain('syriac');
    expect(result.techTraditions.slavic).toContain('rus');
    expect(result.techTraditions.steppe).toContain('khazar');
    expect(result.techTraditions.balticFinnic).toEqual(expect.arrayContaining([
      'finnic','sami'
    ]));
    expect(result.techTraditions.northeastAfrican).toContain('coptic');
    expect(result.khazarHorseArchers).toBe(true);
  });

test('community schema faults are actionable and ordinary counties normalize to one pair',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      function definitionWith(pid, communities) {
        const source = FB.bookmark('867');
        const definition = {};
        for (const key in source) definition[key] = source[key];
        definition.provinces = source.provinces.map(function (province) {
          if (province.id !== pid) return province;
          const copy = {};
          for (const key in province) copy[key] = province[key];
          copy.communities = communities;
          return copy;
        });
        return definition;
      }
      const wastelandId = FB.bookmark('867').provinces.filter(function (province) {
        return province.wasteland;
      })[0].id;
      const cases = {
        empty:definitionWith('london', []),
        notList:definitionWith('london', { culture:'english', religion:'catholic' }),
        duplicate:definitionWith('london', [
          { culture:'english', religion:'catholic' },
          { culture:'english', religion:'catholic' }
        ]),
        culture:definitionWith('london', [
          { culture:'missing_culture', religion:'catholic' }
        ]),
        faith:definitionWith('london', [
          { culture:'english', religion:'christian' }
        ]),
        paired:definitionWith('london', [
          { culture:'english', religion:'catholic', paired:'yes' }
        ]),
        partialShare:definitionWith('london', [
          { culture:'english', religion:'catholic', populationShare0:8000 },
          { culture:'norse', religion:'norse_pagan' }
        ]),
        shareTotal:definitionWith('london', [
          { culture:'english', religion:'catholic', populationShare0:8000 },
          { culture:'norse', religion:'norse_pagan', populationShare0:1000 }
        ]),
        shareInteger:definitionWith('london', [
          { culture:'english', religion:'catholic', populationShare0:8000.5 },
          { culture:'norse', religion:'norse_pagan', populationShare0:1999.5 }
        ]),
        sharePrincipal:definitionWith('london', [
          { culture:'english', religion:'catholic', populationShare0:4000 },
          { culture:'norse', religion:'norse_pagan', populationShare0:6000 }
        ]),
        principal:definitionWith('london', [
          { culture:'norse', religion:'norse_pagan' }
        ]),
        wasteland:definitionWith(wastelandId, [
          { culture:'english', religion:'catholic' }
        ])
      };
      const errors = {};
      for (const id in cases) errors[id] = FB.validateBookmark(cases[id]).join('\n');
      const london = FB.bookmark('867').provinces.filter(function (province) {
        return province.id === 'london';
      })[0];
      const fallback = FB.provinceCommunities(london);
      fallback[0].culture = 'norse';
      const presenceOnly = definitionWith('london', [
        { culture:'english', religion:'catholic' },
        { culture:'norse', religion:'norse_pagan' }
      ]);
      return {
        errors:errors,
        authored:london.communities,
        fallbackLength:fallback.length,
        fallbackReligion:fallback[0].religion,
        provinceCulture:london.culture,
        secondRead:FB.provinceCommunities(london),
        diagnostics:FB.communityShareDiagnostics(presenceOnly)
      };
    });

    expect(result.errors.empty).toContain('communities must be a non-empty array');
    expect(result.errors.notList).toContain('communities must be a non-empty array');
    expect(result.errors.duplicate).toContain('repeats community english/catholic');
    expect(result.errors.culture).toContain('has invalid culture missing_culture');
    expect(result.errors.faith).toContain('has invalid or unassignable faith christian');
    expect(result.errors.paired).toContain('paired must be a boolean');
    expect(result.errors.partialShare)
      .toContain('must give populationShare0 to every community or none');
    expect(result.errors.shareTotal)
      .toContain('populationShare0 values must total 10000');
    expect(result.errors.shareInteger)
      .toContain('populationShare0 must be an integer from 1 through 10000');
    expect(result.errors.sharePrincipal)
      .toContain('principal community populationShare0 must be at least every later share');
    expect(result.errors.principal)
      .toContain('principal community must match its culture and religion');
    expect(result.errors.wasteland).toContain('wasteland');
    expect(result.errors.wasteland).toContain('declares communities');
    expect(result.authored).toBeUndefined();
    expect(result.fallbackLength).toBe(1);
    expect(result.fallbackReligion).toBe('catholic');
    expect(result.provinceCulture).toBe('english');
    expect(result.secondRead).toEqual([
      { culture:'english', religion:'catholic' }
    ]);
    expect(result.diagnostics).toEqual([
      expect.stringContaining(
        'simulated population begins entirely in the principal community')
    ]);
  });

test('legacy unweighted community data keeps later starts but assigns simulated population to the principal',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const province = FB.world.byId.london;
      const original = province.communities;
      province.communities = [
        { culture:'english', religion:'catholic' },
        { culture:'norse', religion:'norse_pagan' }
      ];
      try {
        const state = {
          start:{ id:'867', year:867 }, date:{ year:900 },
          population:{
            schema:1, lastYear:899,
            counties:{ london:{ count:1001, natural:0, migration:0, losses:0 } }
          }
        };
        FB.ensurePopulationState(state);
        return {
          authoredStarts:FB.provinceCommunities(province).map(function (community) {
            return community.culture + '.' + community.religion;
          }),
          live:FB.countyCommunities(state, 'london'),
          diagnostics:FB.communityShareDiagnostics({
            id:'legacy_mod', provinces:[province]
          })
        };
      } finally {
        province.communities = original;
      }
    });

    expect(result.authoredStarts).toEqual([
      'english.catholic', 'norse.norse_pagan'
    ]);
    expect(result.live).toEqual([
      { culture:'english', religion:'catholic', count:1001 }
    ]);
    expect(result.diagnostics).toHaveLength(1);
  });

test('a 1066 Ashkenazi start keeps its Jewish identity paired in matchmaking',
  async function ({ page }) {
    await useStartCode(page,
      'HOUSEHOLD-1066-farmer-mainz-f-Sarah-established-0-ashkenazi.jewish');
    await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
    await expect(page.locator('#game:not(.hidden)')).toBeVisible();
    await page.getByRole('button', { name:'Begin', exact:true }).click();

    const result = await page.evaluate(function () {
      const state = FB.state;
      const me = state.chars[state.player.charId];
      const parents = [me.fatherId, me.motherId].map(function (id) {
        const parent = id && state.chars[id];
        return parent && parent.culture + '.' + parent.religion;
      });
      return {
        identity:me.culture + '.' + me.religion,
        parents:parents,
        tradition:FB.cultureGroup(me.culture),
        communities:FB.provinceCommunities(FB.world.byId.mainz),
        prospectPool:FB.marriageProspectIdentities(state, 'mainz').map(
          function (identity) {
            return identity.culture + '.' + identity.religion;
          })
      };
    });

    expect(result.identity).toBe('ashkenazi.jewish');
    expect(result.parents).toEqual(['ashkenazi.jewish', 'ashkenazi.jewish']);
    expect(result.tradition).toBe('west_european');
    expect(result.communities).toEqual([
      { culture:'german', religion:'catholic', populationShare0:9800 },
      {
        culture:'ashkenazi', religion:'jewish', paired:true,
        populationShare0:200
      }
    ]);
    expect(result.prospectPool).toEqual([
      'german.catholic',
      'ashkenazi.jewish'
    ]);
  });

test('1066 Iona creates a Gaelic Catholic household beneath its Norse ruler and shows both communities',
  async function ({ page }) {
    await useStartCode(page,
      'HOUSEHOLD-1066-farmer-iona-f-Mor-established');
    await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
    await expect(page.locator('#game:not(.hidden)')).toBeVisible();
    await page.getByRole('button', { name:'Begin', exact:true }).click();

    const result = await page.evaluate(function () {
      const state = FB.state;
      const me = state.chars[state.player.charId];
      const ids = {};
      function add(id) { if (id && state.chars[id]) ids[id] = 1; }
      add(me.id); add(me.fatherId); add(me.motherId); add(me.spouseId);
      me.childrenIds.forEach(add);
      const father = state.chars[me.fatherId], mother = state.chars[me.motherId];
      if (father) {
        add(father.fatherId); add(father.motherId);
        father.childrenIds.forEach(add);
      }
      if (mother) mother.childrenIds.forEach(add);
      const identities = Object.keys(ids).map(function (id) {
        return state.chars[id].culture + '.' + state.chars[id].religion;
      });
      const county = FB.world.byId.iona;
      const realm = state.realms[state.owner.iona];
      FB.ui.showTab('prov');
      return {
        identityCount:identities.length,
        identities:identities,
        county:county.culture + '.' + county.religion,
        ruler:realm.ruler.culture,
        owner:state.owner.iona,
        communityOrder:FB.provinceCommunities(county).map(function (community) {
          return community.culture + '.' + community.religion;
        })
      };
    });

    expect(result.identityCount).toBeGreaterThanOrEqual(6);
    expect(result.identities.every(function (identity) {
      return identity === 'gaelic.catholic';
    })).toBe(true);
    expect(result.county).toBe('gaelic.catholic');
    expect(result.ruler).toBe('norse');
    expect(result.owner).not.toBe('player');
    expect(result.communityOrder).toEqual([
      'gaelic.catholic', 'norse.catholic'
    ]);
    const land = page.locator('#tab-prov');
    await expect(land.locator('[data-community-axis="culture"]'))
      .toContainText('Gaelic');
    await expect(land.locator('[data-community-axis="culture"]'))
      .toContainText('Norse');
    const landText = await page.locator('#tab-prov').innerText();
    expect(landText.lastIndexOf('Gaelic')).toBeLessThan(landText.lastIndexOf('Norse'));
  });

test('live county identity drives local runtime consumers without rewriting setup or realms',
  async function ({ page }) {
    await useStartCode(page,
      'COMMUNITY-867-farmer-london-f-Ada');
    await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
    await expect(page.locator('#game:not(.hidden)')).toBeVisible();
    await page.getByRole('button', { name:'Begin', exact:true }).click();

    const result = await page.evaluate(function () {
      const state = FB.state;
      const pid = 'york';
      const province = FB.world.byId[pid];
      const ownerId = state.owner[pid];
      const owner = state.realms[ownerId];
      const authoredBefore = {
        identity:province.culture + '.' + province.religion,
        communities:JSON.stringify(FB.provinceCommunities(province))
      };
      const realmBefore = owner && {
        religion:owner.religion,
        rulerCulture:owner.ruler && owner.ruler.culture,
        rulerReligion:owner.ruler && owner.ruler.religion
      };
      const settlementsBefore = JSON.stringify(FB.settlementsOf(state, pid));

      const rec = state.population.counties[pid];
      rec.communities = [{
        culture:'armenian', religion:'tengri', count:rec.count
      }];
      FB.reconcileCountyCommunities(state, pid);
      state.player.visitedProvinces = [pid];
      state.provChars = state.provChars || {};
      delete state.provChars[pid];

      const notables = FB.provNotables(state, pid);
      const prospects = FB.marriageProspectIdentities(state, pid);
      const eventMatches = FB.checkTrigger(state, {
        provinceCultures:['armenian'], provinceReligionGroup:'tengri'
      }, { locationId:pid });
      const homeDoesNotMatch = FB.checkTrigger(state, {
        provinceCultures:['armenian'], provinceReligionGroup:'tengri'
      });
      const culturePresence = FB.conversionTargetPresence(
        state, 'culture', 'armenian');
      const faithPresence = FB.conversionTargetPresence(
        state, 'faith', 'tengri');
      const realmAfterPopulation = owner && {
        religion:owner.religion,
        rulerCulture:owner.ruler && owner.ruler.culture,
        rulerReligion:owner.ruler && owner.ruler.religion
      };
      const generatedRealm = FB.makeVassalRealm(state, {
        id:'test_live_county_realm', name:'Test County', capital:pid,
        rank:1, liege:ownerId
      });
      const me = state.chars[state.player.charId];
      FB.applyEffects(state, { convertToProvince:true },
        { locationId:pid }, { id:'test_live_county_conversion' });
      FB.ui.selectProvince(pid);

      return {
        authoredBefore:authoredBefore,
        authoredAfter:{
          identity:province.culture + '.' + province.religion,
          communities:JSON.stringify(FB.provinceCommunities(province))
        },
        liveIdentity:FB.countyCulture(state, pid) + '.' +
          FB.countyReligion(state, pid),
        livePairs:FB.countyCommunities(state, pid).map(function (community) {
          return community.culture + '.' + community.religion;
        }),
        notablePairs:notables.map(function (person) {
          return person.culture + '.' + person.religion;
        }),
        prospectPairs:prospects.map(function (identity) {
          return identity.culture + '.' + identity.religion;
        }),
        eventMatches:eventMatches,
        homeDoesNotMatch:homeDoesNotMatch,
        culturePresence:culturePresence && culturePresence.kind,
        faithPresence:faithPresence && faithPresence.kind,
        convertedFaith:me.religion,
        realmBefore:realmBefore,
        realmAfterPopulation:realmAfterPopulation,
        generatedRealm:{
          culture:generatedRealm.ruler.culture,
          religion:generatedRealm.religion
        },
        settlementsStable:JSON.stringify(FB.settlementsOf(state, pid)) ===
          settlementsBefore
      };
    });

    expect(result.authoredAfter).toEqual(result.authoredBefore);
    expect(result.liveIdentity).toBe('armenian.tengri');
    expect(result.livePairs).toEqual(['armenian.tengri']);
    expect(result.notablePairs.length).toBeGreaterThan(0);
    expect(result.notablePairs.every(function (identity) {
      return identity === 'armenian.tengri';
    })).toBe(true);
    expect(result.prospectPairs).toEqual(['armenian.tengri']);
    expect(result.eventMatches).toBe(true);
    expect(result.homeDoesNotMatch).toBe(false);
    expect(result.culturePresence).toBe('travel');
    expect(result.faithPresence).toBe('travel');
    expect(result.convertedFaith).toBe('tengri');
    expect(result.realmAfterPopulation).toEqual(result.realmBefore);
    expect(result.generatedRealm).toEqual({
      culture:'armenian', religion:'tengri'
    });
    expect(result.settlementsStable).toBe(true);
    await expect(page.locator('#tab-prov')).toContainText('Armenian');
    await expect(page.locator('#tab-prov')).toContainText('Tengri');
  });

test('community choices use culture-sensitive names and survive Back to the same county',
  async function ({ page }) {
    await reachIonaCommunityPicker(page);
    await expect(page.locator('#cg-community')).toBeVisible();
    const choices = page.locator('input[name=cg-community]');
    await expect(choices).toHaveCount(2);
    await expect(page.locator('#cg-community')).toContainText('Gaelic');
    await expect(page.locator('#cg-community')).toContainText('Norse');
    await choices.nth(1).check();
    const norseName = await page.locator('#cg-name').inputValue();
    expect(await page.evaluate(function (name) {
      return FBDATA.cultures.norse.male.indexOf(name) >= 0;
    }, norseName)).toBe(true);

    await page.locator('#btn-cg-back').click();
    await expect(page.locator('#pickinfo')).toContainText('Gaelic');
    await expect(page.locator('#pickinfo')).toContainText('Norse');
    const pickText = await page.locator('#pickinfo').innerText();
    expect(pickText.indexOf('Gaelic')).toBeLessThan(pickText.indexOf('Norse'));
    await page.locator('#btn-pick-random').click();
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await expect(page.locator('input[name=cg-community]').nth(1)).toBeChecked();
  });

test('a newly selected county resets the pending identity to its principal community',
  async function ({ page }) {
    await reachIonaCommunityPicker(page);
    await page.locator('input[name=cg-community]').nth(1).check();
    await page.locator('#btn-cg-back').click();
    await page.locator('#btn-pick-back').click();
    await page.evaluate(function () {
      FB.game.pickProvince(FB.world.byId.edinburgh);
      FB.game.pickSettlement({ pid:'edinburgh', index:0 });
    });
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await expect(page.locator('input[name=cg-community]').first()).toBeChecked();
    expect(await page.evaluate(function () {
      return FB.game.pending.culture + '.' + FB.game.pending.religion;
    })).toBe('english.catholic');
  });

test('a non-principal start spells the standard and county-seat placeholders',
  async function ({ page }) {
    const code = 'CADENCE-1066-farmer-iona-m-Olaf-standard-0-norse.catholic';
    await useStartCode(page, code);
    await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
    await expect(page.locator('#game:not(.hidden)')).toBeVisible();
    expect(await page.evaluate(function () { return FB.state.seed; })).toBe(code);
  });

test('a non-principal ninth-part identity shapes an established family and round-trips',
  async function ({ page }) {
    const code = 'CADENCE-1066-farmer-iona-m-Olaf-established-0-norse.catholic';
    await useStartCode(page, code);
    await expect(page.locator('input[name=cg-community]').nth(1)).toBeChecked();
    await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
    await expect(page.locator('#game:not(.hidden)')).toBeVisible();
    const result = await page.evaluate(function () {
      const me = FB.state.chars[FB.state.player.charId];
      const family = {};
      function add(id) { if (id && FB.state.chars[id]) family[id] = 1; }
      add(me.id); add(me.fatherId); add(me.motherId); add(me.spouseId);
      me.childrenIds.forEach(add);
      const father = FB.state.chars[me.fatherId];
      const mother = FB.state.chars[me.motherId];
      if (father) {
        add(father.fatherId); add(father.motherId);
        father.childrenIds.forEach(add);
      }
      if (mother) mother.childrenIds.forEach(add);
      return {
        seed:FB.state.seed,
        identity:me.culture + '.' + me.religion,
        settlement:FB.state.player.homeSettlement,
        familyIdentities:Object.keys(family).map(function (id) {
          const member = FB.state.chars[id];
          return member.culture + '.' + member.religion;
        })
      };
    });
    expect(result.seed).toBe(code);
    expect(result.identity).toBe('norse.catholic');
    expect(result.settlement).toBe(0);
    expect(result.familyIdentities.length).toBeGreaterThanOrEqual(8);
    expect(result.familyIdentities.every(function (identity) {
      return identity === 'norse.catholic';
    })).toBe(true);
  });

test('a ninth-part identity not authored for that bookmark county is rejected',
  async function ({ page }) {
    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill(
      'CADENCE-1066-farmer-iona-m-Olaf-standard-0-gaelic.orthodox');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#ng-seed-err')).toContainText('doesn’t parse');
    await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
    await page.locator('#ng-seed-err').evaluate(function (element) {
      element.textContent = '';
    });
    await page.locator('#ng-seed').fill(
      'CADENCE-1066-farmer-london-m-Edgar-standard-0-english.catholic');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#ng-seed-err')).toContainText('doesn’t parse');
  });

test('legacy five-part and current six-, seven-, and eight-part codes remain accepted',
  async function ({ page }, testInfo) {
    const codes = [
      'CADENCE-farmer-london-f-Ada',
      'CADENCE-867-farmer-london-f-Ada',
      'CADENCE-867-farmer-london-f-Ada-established',
      'CADENCE-867-farmer-london-f-Ada-standard-1'
    ];
    for (let i = 0; i < codes.length; i++) {
      if (i) await openGame(page, testInfo);
      await useStartCode(page, codes[i]);
      await expect(page.locator('#cg-name')).toHaveValue('Ada');
      // a single-community county has nothing to ask — the picker stays hidden
      await expect(page.locator('#cg-community')).toBeHidden();
      await expect(page.locator('input[name=cg-community]')).toHaveCount(0);
      expect(await page.evaluate(function () {
        return FB.game.pending.culture + '.' + FB.game.pending.religion;
      })).toBe('english.catholic');
    }
  });

test('867 Pamplona initializes with Basque Catholic primary identity and Iberian Catholic secondary community',
  async function ({ page }) {
    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#bookmarklist .scencard').first().click();
    await page.getByRole('button', { name:/Free Farmer/ }).click();
    await page.evaluate(function () {
      FB.game.pickProvince(FB.world.byId.pamplona);
      FB.game.pickSettlement({ pid:'pamplona', index:0 });
    });
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    const choices = page.locator('input[name=cg-community]');
    await expect(choices).toHaveCount(2);
    await expect(page.locator('#cg-community')).toContainText('Basque');
    await expect(page.locator('#cg-community')).toContainText('Iberian');

    const info = await page.evaluate(function () {
      const pamplona = FB.world.byId.pamplona;
      return {
        culture: pamplona.culture,
        religion: pamplona.religion,
        communities: FB.provinceCommunities(pamplona).map(function (c) {
          return c.culture + '.' + c.religion;
        }),
        rulerCulture: (FB.state && FB.state.realms && FB.state.realms.navarra) ? FB.state.realms.navarra.ruler.culture : null
      };
    });
    expect(info.culture).toBe('basque');
    expect(info.religion).toBe('catholic');
    expect(info.communities).toEqual(['basque.catholic', 'iberian.catholic']);
  });

test('1066 Granada provides Andalusi, Berber, and Iberian community options',
  async function ({ page }) {
    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#bookmarklist .scencard').nth(1).click();
    await page.getByRole('button', { name:/Free Farmer/ }).click();
    await page.evaluate(function () {
      FB.game.pickProvince(FB.world.byId.granada);
      FB.game.pickSettlement({ pid:'granada', index:0 });
    });
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    const choices = page.locator('input[name=cg-community]');
    await expect(choices).toHaveCount(3);
    await expect(page.locator('#cg-community')).toContainText('Andalusi');
    await expect(page.locator('#cg-community')).toContainText('Berber');
    await expect(page.locator('#cg-community')).toContainText('Iberian');
  });
