'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/government_rollout.js','js/government_administration.js','js/government_recognition.js',
  'data/story_courts_476.js',
  'index.html', 'data/bookmark_711.js', 'data/story_campaigns_711.js',
  'data/bookmarks.js', 'data/counties.js', 'data/geographies.js',
  'data/settlements.js', 'data/cultures.js', 'data/starts.js', 'data/eras.js',
  'data/climate.js', 'js/climate.js',
  'data/technology.js', 'data/systems.js', 'data/papacy.js',
  'data/story_campaigns.js', 'data/bookmark_476_gaul_iberia.js',
  'js/world.js', 'js/model.js', 'js/governments.js', 'js/station.js', 'js/starts.js',
  'js/stories.js', 'js/story_campaign.js', 'data/story_instances.js',
  'data/political_institutions.js', 'js/government_elective.js', 'js/government_selection.js',
  'js/government_lineage.js', 'js/institutions.js', 'js/lordships.js', 'js/treasury.js', 'js/story_government_selection.js',
  'js/story_polity_foundation.js', 'js/rebellions.js', 'js/authority.js',
  'js/main.js', 'js/save.js', 'js/save_v4.js', 'js/papacy.js', 'js/systems.js',
  'js/technology.js', 'js/armies.js', 'js/wars.js', 'js/messages.js',
  'js/i18n.js', 'js/ui_misc.js', 'js/ui_panels.js', 'js/ui_modals.js',
  'js/crazygames.js', 'data/distribution_crazygames.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { openCrazyGame } = require('../support/game/crazygames-title');
const { mockCrazyGames } = require('../support/crazygames');
const { injectBrowserHarness } = require('../support/game/browser-harness');

const CAMPAIGNS = ['strait_crossing_711', 'toledo_campaign_711',
  'septimania_campaign_711', 'gaul_campaign_711', 'asturias_foundation_711',
  'toledo_crown_711', 'northeastern_crown_711'];

async function openBookmarkGame(page, testInfo, crazygames) {
  if (crazygames) {
    await mockCrazyGames(page);
    await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
    await openCrazyGame(page, testInfo);
  } else await openGame(page, testInfo);
}

async function observe(page, testInfo) {
  await openBookmarkGame(page, testInfo);
  const fault = await page.evaluate(function () {
    return new Promise(function (resolve) {
      FB.activateBookmark('711', null, function (error) {
        if (error) { resolve(error.message); return; }
        FB.game.pending = { seed:'ACROSSTHESTRAIT711' };
        FB.game.startObserve();
        FB.game.setPaused(true);
        resolve(null);
      });
    });
  });
  expect(fault).toBe(null);
}

async function household(page, testInfo, scenario, crazygames, birthplace, family) {
  birthplace = birthplace || { county:'toledo', identity:'hispano_roman.catholic' };
  await openBookmarkGame(page, testInfo, crazygames);
  await page.evaluate(function () { FB.startProgression.noteTier(1); });
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('STRAIT711-711-' + scenario +
    '-' + birthplace.county + '-m-Paulus-' + (family || 'standard') + '-0-' + birthplace.identity);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await expect(page.getByRole('heading', { name:'Your Story Begins', exact:true })).toBeVisible();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await page.evaluate(function () {
    FB.game.setPaused(true);
    FB.game.uiPrefs.hideTips = true;
    FB.ui.coachmarkReset();
    delete FB.state.player.flags.tutorial;
    FB.ui.refresh();
  });
}

test('711 is selectable with its supplemental data and independent earlier starts',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const candidate = FBDATA.bookmarkCandidates['711'];
      const before = JSON.stringify(candidate);
      const earlier = FBDATA.bookmarks['867'].provinces.find(function (p) { return p.id === 'toledo'; });
      const owner = earlier.realm;
      let independent;
      try {
        earlier.realm = 'review_replacement';
        independent = JSON.stringify(candidate) === before;
      } finally { earlier.realm = owner; }
      return { selectable:FB.bookmark('711') === candidate && FB.bookmarks().some(function (b) { return b.id === '711'; }),
        cultures:Object.keys(FBDATA.bookmarkCultures711).every(function (id) { return !!FBDATA.cultures[id]; }),
        faiths:Object.keys(FBDATA.bookmarkReligions711).every(function (id) { return !!FBDATA.religions[id]; }),
        sites:Object.keys(FBDATA.bookmarkSites711).every(function (id) { return !!FBDATA.settlementSites[id]; }),
        independent:independent,
        principalMatches:candidate.provinces.filter(function (p) { return !p.wasteland; })
          .every(function (p) { return p.communities[0].culture === p.culture &&
            p.communities[0].religion === p.religion; }),
        cells:candidate.provinces.length,
        stable:candidate.provinces.map(function (p) { return p.id; }).sort().join('|') ===
          FBDATA.bookmarks['867'].provinces.map(function (p) { return p.id; }).sort().join('|'),
        stories:candidate.stories.every(function (id) { return FB.stories.get(id).kind === 'world'; }),
        scripted:candidate.scripted };
    });
    expect(result).toEqual({ selectable:true, cultures:true, faiths:true, sites:true, independent:true,
      principalMatches:true,
      cells:498, stable:true, stories:true, scripted:[] });
  });

for (const county of ['tarsos', 'adana']) {
  test('711 ' + county + ' accepts its principal household and preserves it through restore',
    async function ({ page }, testInfo) {
      await household(page, testInfo, 'serf', false, { county:county, identity:'armenian.eastern' });
      const result = await page.evaluate(function (county) {
        const b = FB.bookmark('711');
        const province = b.provinces.find(function (p) { return p.id === county; });
        const s = FB.state, me = s.chars[s.player.charId];
        const before = { county:s.player.provinceId, culture:me.culture, religion:me.religion };
        FB.save.restore(JSON.parse(FB.save.serialize()));
        const restored = FB.state, character = restored.chars[restored.player.charId];
        return { before:before,
          after:{ county:restored.player.provinceId, culture:character.culture, religion:character.religion },
          principal:province.communities[0],
          shares:province.communities.map(function (c) { return c.populationShare0; }),
          faults:FB.validateBookmark(b) };
      }, county);
      expect(result).toEqual({
        before:{ county:county, culture:'armenian', religion:'eastern' },
        after:{ county:county, culture:'armenian', religion:'eastern' },
        principal:{ culture:'armenian', religion:'eastern', populationShare0:7000 },
        shares:[7000,2500,500], faults:[]
      });
    });
}

test('711 activation owns a full map, mixed communities and a separate hierarchy',
  async function ({ page }, testInfo) {
    await observe(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, b = FB.bookmark('711');
      const realms = {};
      b.realms.forEach(function (r) { realms[r.id] = r; });
      function sovereign(id) {
        while (realms[id].liege) id = realms[id].liege;
        return id;
      }
      const inhabited = b.provinces.filter(function (p) { return !p.wasteland; });
      return { faults:FB.validateBookmark(b), diagnostics:FB.communityShareDiagnostics(b),
        attached:FB.stories.attached(s), era:s.start.era, geography:s.start.geography,
        owners:inhabited.every(function (p) { return s.owner[p.id] === sovereign(p.realm) && !!s.realms[s.holder[p.id]]; }),
        hierarchy:inhabited.every(function (p) {
          const d = b.duchies[p.duchy], k = d && b.kingdoms[d.kingdom];
          return /^d_711_/.test(p.duchy) && k && b.empires[k.empire];
        }),
        periodNames:inhabited.every(function (p) {
          return Array.isArray(p.names) && !p.names.length && FB.world.byId[p.id].name === p.name;
        }),
        shares:inhabited.every(function (p) {
          return p.communities.reduce(function (sum, c) { return sum + c.populationShare0; }, 0) === 10000;
        }),
        sites:inhabited.every(function (p) { return p.settlements.length === 1 && FB.world.sitesByProv[p.id].list[0].authored; }),
        names:['oviedo','santiago','baghdad','mansura','fes'].map(function (id) { return FB.world.byId[id].name; }),
        gothic:b.provinces.find(function (p) { return p.id === 'toledo'; }).communities,
        forms:b.realms.every(function (r) { return r.government ===
          (['visigoths_711','achila_711'].includes(r.id) ? 'elective_monarchy' :
            ['byzantium_711','umayyad_711'].includes(r.id) ? 'administrative_monarchy' : 'territorial'); }) };
    });
    expect(result).toMatchObject({ faults:[], diagnostics:[], attached:CAMPAIGNS,
      era:'early_medieval', geography:'europe_regional', owners:true, hierarchy:true,
      periodNames:true, shares:true, sites:true, forms:true,
      names:['Asturian uplands','Iria Flavia',"Al-Mada'in",'Brahmanabad','Volubilis'] });
    expect(result.gothic).toEqual([
      { culture:'hispano_roman', religion:'catholic', populationShare0:8500 },
      { culture:'gothic', religion:'catholic', paired:true, populationShare0:1000 },
      { culture:'hispano_roman', religion:'jewish', paired:true, populationShare0:500 }
    ]);
  });

test('711 religious offices use Damascus, retain papal date gates and survive a save',
  async function ({ page }, testInfo) {
    await observe(page, testInfo);
    const result = await page.evaluate(function () {
      let s = FB.state;
      const head = FB.religionOf('umayyad_sunni_711', s).head;
      const before = {
        caliph:s.religiousHeads.umayyad_caliph_711,
        pope:s.religiousHeads.catholic,
        strategy:head.succession,
        claims:head.claimCounties,
        ownsSeat:FB.controlsReligiousHeadClaim(s, 'umayyad_sunni_711', 'umayyad_711'),
        greatWars:FB.systemEnabled(s, 'great_holy_wars'),
        college:FB.papalInstitutionActive(s, 'cardinal_shortlist'),
        concordat:FB.papalInstitutionActive(s, 'investiture_concordat')
      };
      s.religiousHeads.umayyad_caliph_711 = null;
      const claimable = FB.canClaimReligiousHead(s, 'umayyad_sunni_711', 'umayyad_711');
      const claimed = FB.claimReligiousHead(s, 'umayyad_sunni_711', 'umayyad_711');
      FB.save.restore(JSON.parse(FB.save.serialize()));
      s = FB.state;
      return { before:before, claimable:claimable, claimed:claimed,
        restored:s.religiousHeads.umayyad_caliph_711,
        valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state) };
    });
    expect(result).toEqual({ before:{ caliph:'umayyad_711', pope:'papacy_711',
      strategy:'caliphal_claim', claims:[['damascus'],['mecca','medina']], ownsSeat:true,
      greatWars:false, college:false, concordat:false }, claimable:true, claimed:true,
      restored:'umayyad_711', valid:true });
  });

for (const crazygames of [false, true]) {
  for (const scenario of ['serf', 'apprentice']) {
    test('711 ' + scenario + ' smoke and save, CrazyGames flag ' + crazygames,
      async function ({ page }, testInfo) {
        await household(page, testInfo, scenario, crazygames);
        await injectBrowserHarness(page);
        const result = await page.evaluate(function () {
          const opening = FB.state.start.id;
          const record = JSON.stringify(FB.state.stories);
          FB.save.restore(JSON.parse(FB.save.serialize()));
          const unchanged = record === JSON.stringify(FB.state.stories);
          const run = FBTEST.advanceDays({ days:30, maxDays:30, maxEvents:80,
            maxInterruptions:0, checkEvery:10, style:'first' });
          return { opening:opening, profession:FB.state.player.profession,
            unchanged:unchanged, advanced:run.advanced,
            attached:FB.stories.attached(FB.state),
            valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state) };
        });
        expect(result).toEqual({ opening:'711', profession:scenario === 'serf' ? 'farmer' : 'craftsman', unchanged:true,
          advanced:30, attached:CAMPAIGNS, valid:true });
      });
  }
}

test('711 campaigns diverge on missing footholds and never transfer counties on a date',
  async function ({ page }, testInfo) {
    await observe(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, before = s.owner.malaga;
      FB.stories.day(s);
      const crossing = s.stories.strait_crossing_711;
      const ordinary = !!FB.ordinaryWarById(s, crossing.warId);
      const unchanged = s.owner.malaga === before;
      s.date.year = 719;
      FB.stories.day(s);
      const septimania = s.stories.septimania_campaign_711;
      const resolved = JSON.stringify(septimania);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      FB.stories.day(FB.state);
      return { crossing:crossing.phase, ordinary:ordinary, unchanged:unchanged,
        septimania:{ phase:septimania.phase, result:septimania.result, reason:septimania.reason },
        once:resolved === JSON.stringify(FB.state.stories.septimania_campaign_711),
        toledo:FB.state.owner.toledo, narbonne:FB.state.owner.narbonne,
        asturias:!!FB.state.realms.asturias_711,
        modes:['period_711_crossing','period_711_toledo','period_711_septimania','period_711_gaul']
          .map(function (id) { return FBDATA.techImpactReviews.features[id].mode; }) };
    });
    expect(result).toEqual({ crossing:'started', ordinary:true, unchanged:true,
      septimania:{ phase:'resolved', result:'diverted', reason:'capital_lost' }, once:true,
      toledo:'visigoths_711', narbonne:'achila_711', asturias:false,
      modes:['none','none','none','none'] });
  });

test('711 natural world simulation advances one season and restores its campaign records',
  async function ({ page }, testInfo) {
    await observe(page, testInfo);
    const authored = await page.evaluate(function () {
      return JSON.stringify(FBDATA.bookmarkCandidates['711']);
    });
    for (let batch = 0; batch < 3; batch++) {
      await page.evaluate(function () {
        for (let day = 0; day < 30; day++) {
          const before = FB.state.turn;
          FB.game.passDay({ deferUi:true });
          if (FB.state.turn !== before + 1) throw new Error('711 observer stalled at turn ' + before);
        }
      });
    }
    const result = await page.evaluate(function (authored) {
      const s = FB.state;
      const records = JSON.stringify(s.stories);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { date:FB.state.date, turn:FB.state.turn,
        unchanged:authored === JSON.stringify(FBDATA.bookmarkCandidates['711']),
        records:records === JSON.stringify(FB.state.stories),
        faults:FB.validateBookmark(FB.bookmark('711')),
        valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state) };
    }, authored);
    expect(result).toEqual({ date:{ year:711, season:1, day:1 }, turn:90, unchanged:true, records:true, faults:[], valid:true });
  });

test('711 ordinary household play advances one season with a midpoint save and natural events',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served', 'Run the bounded household journey once; smoke covers every browser project.');
    await household(page, testInfo, 'farmer', false, null, 'established');
    await injectBrowserHarness(page);
    // Retain ordinary mortality, family life, diplomacy, events and campaigns.
    // The standard harness chooses through the game's player automation.
    await page.evaluate(function () {
      FB.game.uiPrefs.hideBeginnerHints = true;
      FB.game.auto.all = true; FB.game.auto.style = 'first';
    });
    for (let half = 0; half < 2; half++) {
      const result = await page.evaluate(function () {
        const before = FB.state.turn, target = before + 45;
        for (let attempts = 0; attempts < 60 && FB.state.turn < target; attempts++) {
          if (FB.state.player.dead) {
            const heirs = FB.heirsOf(FB.state);
            if (!heirs.length) throw new Error('The natural 711 dynasty ended before its review boundary.');
            FB.ui.closeModal(); FB.game.succeedTo(heirs[0].id); FB.ui.closeModal();
            FB.game.auto.all = true;
          }
          FB.game.passDay({ deferUi:true });
        }
        return { advanced:FB.state.turn - before, errors:FBTEST.checkInvariants() };
      });
      expect(result.advanced).toBe(45);
      expect(result.errors).toEqual([]);
      if (half === 0) await page.evaluate(function () {
        FB.save.restore(JSON.parse(FB.save.serialize()));
      });
    }
    const end = await page.evaluate(function () {
      const records = JSON.stringify(FB.state.stories);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { year:FB.state.date.year, turn:FB.state.turn,
        errors:FBTEST.checkInvariants(), ordinary:!FB.game.observe,
        bookmark:FB.state.start.id,
        records:records === JSON.stringify(FB.state.stories),
        valid:FB.save.v4.validatePlatform(FB.state) };
    });
    expect(end).toMatchObject({ year:711, turn:90, errors:[], ordinary:true,
      bookmark:'711', records:true, valid:true });
  });
