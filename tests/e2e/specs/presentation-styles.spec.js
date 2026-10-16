'use strict';
const path = require('node:path');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/eras.js', 'data/geographies.js', 'data/cultures.js', 'data/map_data.js',
  'data/music_catalog.js', 'data/distribution_crazygames.js', 'js/crazygames.js', 'js/main.js',
  'js/siteart.js', 'js/util.js', 'js/model.js', 'js/world.js', 'js/mods.js',
  'js/i18n.js', 'js/music.js', 'js/mapview.js', 'js/armies.js', 'js/population.js',
  'js/ui_topbar.js', 'js/ui_misc.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { openCrazyGame } = require('../support/game/crazygames-title');
const { mockCrazyGames } = require('../support/crazygames');
const { startDeterministicGame } = require('../support/game/start');

test('867 and 1066 keep the original settlement and house pixels without consuming RNG',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await page.addScriptTag({ path:path.join(__dirname, '../fixtures/presentation/medieval-art.js') });
    const result = await page.evaluate(function () {
      function pixels(canvas) { return canvas.toDataURL(); }
      function crest() {
        const cv = document.createElement('canvas'); cv.width = 48; cv.height = 56; return cv;
      }
      const rng = FB.getRngState();
      const matches = [];
      ['867', '1066'].forEach(function (id) {
        const state = { start:{ id:id, era:FB.bookmark(id).era } };
        ['roma', 'paris', 'cordoba', 'aachen'].forEach(function (slug) {
          [0, 1, 2].forEach(function (rank) {
            matches.push(pixels(FB.siteArt(rank, slug, 'roman', state)) ===
              pixels(window.__legacySiteArt(rank, slug)));
          });
          const before = crest(), after = crest();
          window.__legacyDrawCrest(before, slug);
          FB.drawCrest(after, slug, state);
          matches.push(pixels(before) === pixels(after));
        });
      });
      return { matches:matches, rng:FB.getRngState() === rng };
    });
    expect(result.matches).toHaveLength(32);
    expect(result.matches.every(Boolean)).toBe(true);
    expect(result.rng).toBe(true);
  });

test('architecture follows inherited culture, era and default, and invalidates cached style data',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = { start:{ id:'476', era:'late_antique' },
        cultures:{ child:{ parent:'roman', name:'Child' } } };
      const rng = FB.getRngState();
      FB.mods.apply({ architectureStyles:{
        period:{ shapes:{ dwellings:'flat', worship:'basilica', fortification:'palisade' },
          palettes:{ walls:['#ccaabb'] } },
        local:{ shapes:{ worship:'dome' } }
      } });
      FBDATA.eras.late_antique.architecture = 'period';
      const fromEra = FB.architectureStyle('roman', state);
      const eraArt = FB.siteArt(1, 'roma', 'roman', state);
      const cached = FB.siteArt(1, 'roma', 'roman', state) === eraArt;
      FB.mods.apply({ cultures:{ roman:Object.assign({}, FBDATA.cultures.roman, { architecture:'local' }) } });
      const fromParent = FB.architectureStyle('child', state);
      const localArt = FB.siteArt(1, 'roma', 'child', state);
      const distinct = localArt.toDataURL() !== eraArt.toDataURL();
      FBDATA.architectureStyles.local.palettes = { stones:['#ffeeff'] };
      const updated = FB.siteArt(1, 'roma', 'child', state);
      state.cultures.child.architecture = null;
      FB.invalidateCultureData();
      const childClears = FB.architectureStyle('child', state);
      FBDATA.eras.late_antique.architecture = null;
      const fallback = FB.architectureStyle('child', state);
      return { fromEra:fromEra, fromParent:fromParent, cached:cached, distinct:distinct,
        updated:updated !== localArt && updated.toDataURL() !== localArt.toDataURL(),
        childClears:childClears, fallback:fallback, rng:FB.getRngState() === rng };
    });
    expect(result).toEqual({ fromEra:'period', fromParent:'local', cached:true,
      distinct:true, updated:true, childClears:'period', fallback:'manuscript', rng:true });
  });

test('currency uses stamped era and geography with atomic mod priority and unchanged gold',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = { start:{ id:'476', era:'late_antique', geography:'europe_regional' },
        date:{ year:1100 }, player:{ gold:12.5 } };
      const saved = JSON.stringify(state);
      const base = FB.currencyDef({ start:{ id:'867', era:'early_medieval' } });
      const period = Object.assign({}, base, {
        id:'solidus', label:'Solidi', icon:'S',
        units:[{ id:'solidus', value:1, symbol:'s', singular:'solidus', plural:'solidi',
          position:'after', space:true }]
      });
      FBDATA.eras.late_antique.currency = period;
      const era = [FB.currencyLabel(state), FB.money(2, { state:state, style:'long' }),
        FB.money(0, { state:state, style:'icon' })];
      FBDATA.geographies.europe_regional.currency = { label:'Local coin', icon:'L' };
      const geography = FB.currencyDef(state);
      FB.configureCurrency(Object.assign({}, base, { id:'mod', label:'Mod coin', icon:'M' }), true);
      const mod = FB.currencyDef(state);
      const invalid = FB.configureCurrency({ label:'Broken', icon:'B' }, true);
      const invalidFallback = FB.currencyDef(state);
      FB.configureCurrency(null, false, 'C');
      const legacy = FB.currencyDef(state);
      delete FBDATA.geographies.europe_regional.currency;
      FB.configureCurrency(null, false);
      const medieval = ['867', '1066'].map(function (id) {
        const s = { start:{ id:id, era:FB.bookmark(id).era } };
        return [FB.currencyLabel(s), FB.money(2, { state:s }), FB.money(0, { state:s, style:'icon' })];
      });
      return { era:era, geography:[geography.label, geography.icon, geography.smallestPerGold],
        mod:[mod.id, mod.label, mod.icon], invalid:invalid, invalidFallback:invalidFallback.id,
        legacy:[legacy.label, legacy.icon], medieval:medieval, unchanged:JSON.stringify(state) === saved };
    });
    expect(result).toEqual({ era:['Solidi', '2 solidi', 'S'],
      geography:['Local coin', 'L', 1], mod:['mod', 'Mod coin', 'M'],
      invalid:false, invalidFallback:'gold', legacy:['Local coin', 'C'],
      medieval:[['Gold', '2 gold', '💰'], ['Gold', '2 gold', '💰']], unchanged:true });
  });

test('presentation validators reject unknown shapes and bad period or geography declarations',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const clean = FB.validateEraData();
      let rejected = '';
      try {
        FB.mods.apply({ architectureStyles:{ invalid:{ shapes:{ worship:'unknown' } } },
          balance:{ e2ePresentationMarker:99 } });
      } catch (error) { rejected = error.message; }
      FBDATA.eras.late_antique.emblem = 'unknown';
      FBDATA.eras.late_antique.architecture = 'unknown';
      FBDATA.eras.late_antique.currency = { label:'Bad', icon:'<img>' };
      FBDATA.geographies.europe_regional.currency = { label:'Bad' };
      return { clean:clean, rejected:rejected, marker:FBDATA.balance.e2ePresentationMarker || null,
        era:FB.validateEraData(), geography:FB.validateGeography('europe_regional') };
    });
    expect(result.clean).toEqual([]);
    expect(result.rejected).toContain('unknown worship shape');
    expect(result.marker).toBeNull();
    expect(result.era.join(' ')).toContain('unknown architecture');
    expect(result.era.join(' ')).toContain('unknown emblem');
    expect(result.era.join(' ')).toContain('invalid currency');
    expect(result.geography.join(' ')).toContain('currency needs');
  });

test('topbar and card emblems follow the period while the title retains its crest',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(async function () {
      FB.game.setPaused(true);
      const s = FB.state, me = s.chars[s.player.charId];
      s.start.era = 'late_antique';
      const original = document.getElementById('crest').toDataURL();
      const variants = [], matches = [], keys = [];
      const rng = FB.getRngState();
      const title = document.createElement('canvas'); title.width = 48; title.height = 56;
      FB.drawCrest(title, 'Fallowborn', null);
      const titlePixels = title.toDataURL();
      for (const style of ['standard', 'chi_rho', 'tamga']) {
        FBDATA.eras.late_antique.emblem = style;
        FB.ui.refresh();
        await new Promise(function (resolve) { requestAnimationFrame(resolve); });
        const top = document.getElementById('crest');
        variants.push(top.toDataURL());
        keys.push(FB.crestVisualKey(me.dyn || me.name, s));
        const root = document.createElement('div');
        root.innerHTML = FB.crestTag(me.dyn || me.name, top.width, top.height);
        FB.paintCrests(root);
        matches.push(root.firstChild.toDataURL() === top.toDataURL());
        FB.drawCrest(title, 'Fallowborn', null);
        matches.push(titlePixels === title.toDataURL());
      }
      return { matches:matches, distinct:new Set(variants.concat(original)).size,
        keys:new Set(keys).size, rng:FB.getRngState() === rng };
    });
    expect(result.matches.every(Boolean)).toBe(true);
    expect(result.distinct).toBe(4);
    expect(result.keys).toBe(3);
    expect(result.rng).toBe(true);
  });

test('music prefers the era and retains exact, lineage, role and general fallback order',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served', 'Synthetic catalog routing uses HTTP.');
    const banks = [
      { id:'christian/roman/court', faith:'christian', culture:'roman', role:'court' },
      { id:'christian/roman/folk', faith:'christian', culture:'roman', role:'folk' },
      { id:'muslim/all/folk', faith:'muslim', culture:'all', role:'folk' },
      { id:'late_antique/christian/roman/court', faith:'christian', culture:'roman', role:'court', eras:['late_antique'] },
      { id:'late_antique/christian/all/court', faith:'christian', culture:'all', role:'court', eras:['late_antique'] },
      { id:'late_antique/christian/all/folk', faith:'christian', culture:'all', role:'folk', eras:['late_antique'] }
    ].map(function (bank) { return Object.assign(bank, { trackIds:[], bytes:0, duration:0 }); });
    await page.route('**/data/music_catalog.js', function (route) {
      return route.fulfill({ contentType:'application/javascript',
        body:'FBDATA.musicCatalog=' + JSON.stringify({ schema:1, intros:[], tracks:[], banks:banks }) + ';' });
    });
    // This empty routing catalog has no boot music choice. Resolve the
    // preference before navigation so the title helper cannot race its shell.
    await page.addInitScript(function () {
      localStorage.setItem('fb_ui', JSON.stringify({ musicChoice:'off' }));
    });
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const s = { start:{ id:'476', era:'late_antique' },
        player:{ charId:'me', tier:6, profession:'farmer', flags:{} },
        chars:{ me:{ id:'me', religion:'homoian', culture:'roman' } }, realms:{} };
      function bank() { const b = FB.music.resolveBank(s); return b && b.id; }
      const out = [bank()];
      const scoped = FBDATA.musicCatalog.banks.filter(function (b) { return b.eras; });
      scoped[0].eras = ['high_medieval']; out.push(bank());
      scoped[1].eras = ['high_medieval']; out.push(bank());
      scoped[2].eras = ['high_medieval']; out.push(bank());
      s.start.era = 'early_medieval'; out.push(bank());
      s.player.tier = 1; s.chars.me.religion = 'jewish'; out.push(bank());
      FBDATA.musicCatalog.banks.forEach(function (b) { b.eras = ['high_medieval']; });
      out.push(bank());
      FB.platform.isCrazyGames = true; out.push(bank());
      return out;
    });
    expect(result).toEqual([
      'late_antique/christian/roman/court', 'late_antique/christian/all/court',
      'late_antique/christian/all/folk', 'christian/roman/court',
      'christian/roman/court', 'muslim/all/folk', null, null
    ]);
  });

test('map art follows live county culture and player-host badges refresh when the era form changes',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      FB.game.setPaused(true);
      const s = FB.state, home = s.player.provinceId;
      FB.mods.apply({ architectureStyles:{
        local:{ shapes:{ worship:'dome' } }, period:{ shapes:{ dwellings:'flat' } }
      }, cultures:{ roman:Object.assign({}, FBDATA.cultures.roman, { architecture:'local' }) } });
      s.start.era = 'late_antique';
      FBDATA.eras.late_antique.architecture = 'period';
      const province = FB.world.byId[home];
      const baseCulture = province.culture;
      const initialCulture = FB.countyCulture(s, home);
      const site = FB.world.sitesByProv[home].list[0];
      FB.map.zoom = 20;
      FB.map.viewX = site.x - FB.map.canvas.width / FB.map.zoom / 2;
      FB.map.viewY = site.y - FB.map.canvas.height / FB.map.zoom / 2;
      const originalArt = FB.siteArt, seen = [], sitePixels = [], pureRenders = [];
      FB.siteArt = function (rank, slug, culture, state, presentation) {
        const image = originalArt.apply(this, arguments);
        if (slug === site.site) {
          seen.push({ culture:culture, style:presentation.key.split('|')[0], state:state === s });
          sitePixels.push(image.toDataURL());
        }
        return image;
      };
      function render() {
        const saved = JSON.stringify(s), rng = FB.getRngState();
        FB.map.render();
        pureRenders.push(JSON.stringify(s) === saved && FB.getRngState() === rng);
      }
      try {
        render();
        const rec = s.population.counties[home];
        rec.communities = [{ culture:'roman', religion:province.religion, count:rec.count }];
        FB.reconcileCountyCommunities(s, home);
        render();
      } finally { FB.siteArt = originalArt; }

      s.armies = [{ id:'period-host', realm:'player', at:home, from:home,
        men:400, size:400, units:{ levy:400 }, path:[], moveLeft:0, supply:100 }];
      const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 800;
      const ctx = canvas.getContext('2d'), blit = ctx.drawImage, crests = [];
      ctx.drawImage = function (image) {
        crests.push(image.toDataURL());
        return blit.apply(this, arguments);
      };
      const matches = [], variants = [];
      ['standard', 'chi_rho', 'heraldry'].forEach(function (style) {
        FBDATA.eras.late_antique.emblem = style;
        crests.length = 0;
        FB.renderArmies(ctx, function () { return [400, 400]; }, 2, 1);
        const expected = document.createElement('canvas'); expected.width = 48; expected.height = 56;
        const me = s.chars[s.player.charId];
        FB.drawCrest(expected, me.dyn || me.name, s);
        matches.push(crests.length === 1 && crests[0] === expected.toDataURL());
        variants.push(crests[0]);
      });
      return { map:seen, initialCulture:initialCulture,
        liveCulture:FB.countyCulture(s, home), baseUnchanged:province.culture === baseCulture,
        distinct:sitePixels[0] !== sitePixels[1], pureRenders:pureRenders,
        matches:matches, variants:new Set(variants).size };
    });
    expect(result.initialCulture).not.toBe('roman');
    expect(result.map).toEqual([
      { culture:result.initialCulture, style:'period', state:true },
      { culture:'roman', style:'local', state:true }
    ]);
    expect(result.liveCulture).toBe('roman');
    expect(result.baseUnchanged).toBe(true);
    expect(result.distinct).toBe(true);
    expect(result.pureRenders).toEqual([true, true]);
    expect(result.matches).toEqual([true, true, true]);
    expect(result.variants).toBe(3);
  });

test('CrazyGames skips audio initialization even if a catalog is present',
  async function ({ page }, testInfo) {
    await mockCrazyGames(page);
    await page.addInitScript(function () {
      window.FB_DISTRIBUTION = 'crazygames';
      window.__presentationAudioCount = 0;
      window.Audio = function () { window.__presentationAudioCount++; };
    });
    await openCrazyGame(page, testInfo);
    expect(await page.evaluate(function () {
      FB.music.init();
      return { audio:window.__presentationAudioCount,
        declaredCatalog:!!(FBDATA.musicCatalog && FBDATA.musicCatalog.tracks.length),
        supported:FB.music.supported(), catalog:FB.music.catalog(),
        bank:FB.music.resolveBank({ player:{}, chars:{} }) };
    })).toEqual({ audio:0, declaredCatalog:true, supported:false, catalog:null, bank:null });
  });
