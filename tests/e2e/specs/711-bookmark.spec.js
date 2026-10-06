'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/bookmark_711.js', 'data/story_campaigns_711.js',
  'data/bookmarks.js', 'data/counties.js', 'data/geographies.js',
  'data/settlements.js', 'data/cultures.js', 'data/starts.js', 'data/eras.js',
  'data/climate.js', 'js/climate.js',
  'data/technology.js', 'data/systems.js', 'data/papacy.js',
  'data/story_campaigns.js', 'data/bookmark_476_gaul_iberia.js',
  'js/world.js', 'js/model.js', 'js/governments.js', 'js/station.js', 'js/starts.js',
  'js/stories.js', 'js/story_campaign.js', 'js/story_476_rails.js',
  'js/main.js', 'js/save.js', 'js/save_v4.js', 'js/papacy.js', 'js/systems.js',
  'js/technology.js', 'js/armies.js', 'js/wars.js', 'js/messages.js',
  'js/i18n.js', 'js/ui_misc.js', 'js/ui_panels.js', 'js/ui_modals.js',
  'js/crazygames.js', 'data/distribution_crazygames.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { openCrazyGame } = require('../support/game/crazygames-title');
const { injectBrowserHarness } = require('../support/game/browser-harness');

const CAMPAIGNS = ['strait_crossing_711', 'toledo_campaign_711',
  'septimania_campaign_711', 'gaul_campaign_711'];

// A scenario-local review install. Ordinary boot never promotes this candidate.
async function review(page, testInfo, crazygames) {
  if (crazygames) {
    await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
    await openCrazyGame(page, testInfo);
  } else await openGame(page, testInfo);
  await page.evaluate(function () {
    Object.assign(FBDATA.cultures, FBDATA.bookmarkCultures711);
    Object.assign(FBDATA.religions, FBDATA.bookmarkReligions711);
    Object.assign(FBDATA.settlementSites, FBDATA.bookmarkSites711);
    FBDATA.bookmarks['711'] = FBDATA.bookmarkCandidates['711'];
    FB.invalidateCultureData();
    FB.invalidateReligionData();
  });
}

async function observe(page, testInfo) {
  await review(page, testInfo);
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

async function household(page, testInfo, scenario, crazygames) {
  await review(page, testInfo, crazygames);
  await page.evaluate(function () { FB.startProgression.noteTier(1); });
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('STRAIT711-711-' + scenario +
    '-toledo-m-Paulus-standard-0-hispano_roman.catholic');
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

test('711 remains hidden and its supplemental data does not change accepted starts',
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
      return { hidden:!FB.bookmark('711') && FB.bookmarks(true).every(function (b) { return b.id !== '711'; }),
        faiths:Object.keys(FBDATA.bookmarkReligions711).every(function (id) { return !FBDATA.religions[id]; }),
        sites:Object.keys(FBDATA.bookmarkSites711).every(function (id) { return !FBDATA.settlementSites[id]; }),
        independent:independent,
        cells:candidate.provinces.length,
        stable:candidate.provinces.map(function (p) { return p.id; }).sort().join('|') ===
          FBDATA.bookmarks['867'].provinces.map(function (p) { return p.id; }).sort().join('|'),
        stories:candidate.stories.every(function (id) { return FB.stories.get(id).kind === 'world'; }),
        scripted:candidate.scripted };
    });
    expect(result).toEqual({ hidden:true, faiths:true, sites:true, independent:true,
      cells:498, stable:true, stories:true, scripted:[] });
  });

test('review activation owns a full map, mixed communities and a separate 711 hierarchy',
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
        forms:b.realms.every(function (r) { return r.government === 'territorial'; }) };
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

test('711 natural world simulation advances ten years and restores its campaign records',
  async function ({ page }, testInfo) {
    test.setTimeout(6 * 60 * 1000);
    await observe(page, testInfo);
    const authored = await page.evaluate(function () {
      return JSON.stringify(FBDATA.bookmarkCandidates['711']);
    });
    for (let year = 0; year < 10; year++) {
      await page.evaluate(function () {
        for (let day = 0; day < 360; day++) {
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
      return { year:FB.state.date.year,
        unchanged:authored === JSON.stringify(FBDATA.bookmarkCandidates['711']),
        records:records === JSON.stringify(FB.state.stories),
        faults:FB.validateBookmark(FB.bookmark('711')),
        valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state) };
    }, authored);
    expect(result).toEqual({ year:721, unchanged:true, records:true, faults:[], valid:true });
  });
