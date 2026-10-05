'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html',
  'js/title_ids.js', 'js/lexicon.js', 'js/world.js', 'js/authority.js',
  'js/actions.js', 'js/wars.js', 'js/holywar.js', 'js/main.js', 'js/model.js',
  'js/save.js', 'js/save_v4.js', 'js/ambitions.js', 'js/station.js',
  'js/ui_panels.js', 'js/ui_modals.js', 'js/governments.js',
  'data/lexicons.js', 'data/technology.js', 'data/political_institutions.js',
  'data/bookmarks.js', 'data/bookmark_476.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js', 'data/eras.js', 'data/counties.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

/* The real bookmark/world/observer path, without replacing any simulation
   functions. Every test receives a fresh browser context from the fixture. */
async function startWorld(page, testInfo, id, noHierarchy) {
  await openGame(page, testInfo);
  const error = await page.evaluate(function (input) {
    if (input.noHierarchy) {
      const book = JSON.parse(JSON.stringify(FB.bookmark('867')));
      book.id = input.id;
      delete book.duchies; delete book.kingdoms; delete book.empires;
      book.provinces.forEach(function (pr) { delete pr.duchy; });
      FBDATA.bookmarks[input.id] = book;
    }
    return new Promise(function (resolve) {
      FB.activateBookmark(input.id, null, function (fault) {
        if (fault) { resolve(fault.message); return; }
        FB.game.pending = { seed:'OPTIONAL-TITLE-LEVELS' };
        FB.game.startObserve();
        FB.game.setPaused(true);
        resolve(null);
      });
    });
  }, { id:id, noHierarchy:!!noHierarchy });
  expect(error).toBe(null);
}

for (const id of ['867', '1066']) {
  test(id + ' preserves medieval title chains and recognition substance', async function ({ page }, testInfo) {
    await startWorld(page, testInfo, id);
    const result = await page.evaluate(function () {
      const s = FB.state, book = FB.bookmark(s.start.id);
      const before = JSON.stringify(s), rng = FB.getRngState();
      const chains = book.provinces.filter(function (p) { return !p.wasteland; })
        .every(function (p) {
          const d = book.duchies[p.duchy], k = book.kingdoms[d.kingdom];
          const dj = FB.dejureOf(p.id);
          return dj.duchy === p.duchy && dj.kingdom === d.kingdom && dj.empire === k.empire &&
            FB.duchyCounties(p.duchy).indexOf(p.id) >= 0 &&
            FB.kingdomCounties(d.kingdom).indexOf(p.id) >= 0;
        });
      const labels = FB.titleLevels.kinds.map(function (kind) {
        return FB.titleLevels.name(s, kind, { viewer:null });
      });
      const counts = Object.keys(book.duchies).every(function (did) {
        const progress = FB.duchyProgress(s, did);
        const total = book.provinces.filter(function (pr) { return !pr.wasteland && pr.duchy === did; }).length;
        return progress.total === total && progress.need === Math.max(2, Math.ceil(total / 2));
      });
      return { errors:FB.validateBookmark(book), chains:chains, counts:counts,
        labels:labels, unchanged:JSON.stringify(s) === before && FB.getRngState() === rng };
    });
    expect(result).toEqual({ errors:[], chains:true, counts:true,
      labels:['duchy','kingdom','empire'], unchanged:true });
  });
}

test('optional parents and mixed regions accept absence but reject supplied invalid ids', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const result = await page.evaluate(function () {
    const book = JSON.parse(JSON.stringify(FB.bookmark('867')));
    const london = book.provinces.find(function (p) { return p.id === 'london'; });
    const did = london.duchy;
    const kid = book.duchies[did].kingdom;
    delete book.kingdoms[kid].empire;
    delete book.duchies[did].kingdom;
    london.duchy = null;
    const normalized = FB.titleIds.normalizeBookmark(book);
    const mixed = FB.validateBookmark(book);
    const invalid = ['', 'd_missing', 'k_essex'].map(function (id) {
      const broken = JSON.parse(JSON.stringify(book));
      broken.provinces.find(function (p) { return p.id === 'london'; }).duchy = id;
      return FB.validateBookmark(broken).length > 0;
    });
    const mod = FB.titleIds.normalizeMod({ provinces:[{ id:'london', duchy:null }],
      duchies:{ essex:{ name:'Essex', kingdom:null } } });
    return { mixed:mixed, county:normalized.provinces.find(function (p) { return p.id === 'london'; }).duchy,
      parent:normalized.duchies[did].kingdom, grandparent:normalized.kingdoms[kid].empire,
      invalid:invalid, mod:mod.provinces[0].duchy === null && mod.duchies.essex.kingdom === null };
  });
  expect(result).toEqual({ mixed:[], county:null, parent:null, grandparent:null,
    invalid:[true,true,true], mod:true });
});

test('hierarchy-free worlds run ten years with direct holders, empty title goals and save round trips', async function ({ page }, testInfo) {
  test.setTimeout(6 * 60 * 1000);
  await startWorld(page, testInfo, 'e2e_optional_titles', true);
  const result = await page.evaluate(function () {
    const s = FB.state, initialYear = s.date.year;
    const direct = FB.world.provs.filter(function (p) { return !p.wasteland; }).every(function (p) {
      return s.holder[p.id] === p.realm0;
    });
    for (let i = 0; i < 3600; i++) {
      const before = s.turn;
      FB.game.passDay();
      if (s.turn !== before + 1) throw new Error('Observer stalled at day ' + i);
    }
    const original = JSON.parse(FB.save.serialize());
    const input = JSON.stringify(original);
    const migrated = FB.save.v4.migrate(original);
    FB.save.restore(migrated);
    const restored = FB.state;
    const bogus = FB.titleIds.migrateState(Object.assign({}, restored, {
      faiths:{ test:{ head:{ greatHolyWar:{ firstTarget:'k_syria',
        sacredTargets:[{ kingdom:'k_syria', counties:['damascus'] }], crisisKingdoms:['k_egypt'] } } } }
    }), FB.bookmark('e2e_optional_titles'));
    return { years:restored.date.year - initialYear, direct:direct,
      noSynthetic:!Object.keys(restored.realms).some(function (id) { return /undefined|null/.test(id); }),
      empty:FB.world.provs.every(function (p) { return !FB.dejureOf(p.id).duchy; }),
      lists:[FB.duchyCounties(null), FB.kingdomCounties(null), FB.empireKingdoms(null)],
      titles:[FB.playerDuchies(restored), FB.playerKingdoms(restored), FB.playerEmpires(restored)],
      holy:FB.greatHolyWarTargets(restored, 'christian'),
      immutable:JSON.stringify(original) === input,
      inactiveTarget:bogus.faiths.test.head.greatHolyWar.firstTarget };
  });
  expect(result).toEqual({ years:10, direct:true, noSynthetic:true, empty:true,
    lists:[[],[],[]], titles:[[],[],[]], holy:[], immutable:true, inactiveTarget:'syria' });
});

test('customary jurisdiction supports exact lawful claims and rejects stale or unrelated powers', async function ({ page }, testInfo) {
  await startWorld(page, testInfo, 'e2e_optional_titles', true);
  const result = await page.evaluate(function () {
    const s = FB.state, home = 'london';
    s.player.provs = [home]; s.player.provinceId = home; s.player.liege = null;
    FB.setPlayerTier(s, 4, { attachLiege:false }); FB.foundPlayerRealm(s);
    const target = Object.keys(FB.world.adj[home]).filter(function (pid) {
      return !FB.world.byId[pid].wasteland && s.owner[pid] !== 'player';
    }).sort()[0];
    const enemy = FB.warTargetDefender(s, 'player', target);
    const issuer = { kind:'realm', id:enemy }, actor = { kind:'realm', id:'player' };
    function establish(power, beneficiary, evidence) {
      return FB.authorityEstablishRight(s, { issuer:issuer, beneficiary:beneficiary,
        scope:{ kind:'county', id:target }, power:power, basis:'judgment', basisRef:evidence });
    }
    const revenue = establish('revenue', actor, 'revenue-proof');
    const noRevenueClaim = FB.customaryWarRights(s, 'player', target).length === 0;
    const peace = establish('peace', actor, 'jurisdiction-proof');
    const personal = establish('peace', { kind:'character', id:s.player.charId }, 'personal-proof');
    const cause = FB.warCauses(s, true, true).find(function (c) { return c.target === target; });
    const rights = FB.warJustifications(s, target, enemy, true);
    const next = Object.keys(FB.world.adj[target]).filter(function (pid) {
      return pid !== home && !FB.world.byId[pid].wasteland &&
        FB.warTargetDefender(s, 'player', pid) === enemy;
    }).sort()[0];
    const other = FB.authorityEstablishRight(s, { issuer:issuer, beneficiary:actor,
      scope:{ kind:'county', id:next }, power:'peace', basis:'judgment', basisRef:'next-proof' });
    const nextCause = FB.warCauses(s, true, true).find(function (c) { return c.target === next; });
    const packageValid = !!other && !!nextCause && FB.warDeclarationPreview(s, 'player', [cause, nextCause]).valid;
    const aiRight = FB.authorityEstablishRight(s, { issuer:issuer, beneficiary:issuer,
      scope:{ kind:'county', id:target }, power:'peace', basis:'judgment', basisRef:'ai-proof' });
    const ai = FB.territorialWarRights(s, enemy, target);
    const aiCustomary = !!aiRight && ai.some(function (right) {
      return right.type === 'customary' && right.rightId === aiRight.id;
    });
    const before = JSON.stringify(s), rng = FB.getRngState();
    const read = FB.political.territorialClaims(s, actor, target);
    read[0].strength = 0;
    const preview = FB.warDeclarationPreview(s, 'player', [cause]);
    const pure = JSON.stringify(s) === before && FB.getRngState() === rng;
    FB.authorityRevokeRight(s, peace.id, issuer);
    const stale = FB.warDeclarationPreview(s, 'player', [cause]);
    const staleState = JSON.stringify(s), staleRng = FB.getRngState();
    const rejected = !FB.startPlayerWar(s, cause);
    const rejectedPure = JSON.stringify(s) === staleState && FB.getRngState() === staleRng;
    FB.authorityRecordCustom(s, personal.id, 'disputed');
    const suspended = FB.customaryWarRights(s, 'player', target).length === 0;
    const fallback = FB.warCauses(s, true, true).find(function (c) { return c.target === target; });
    const noPromotion = !FB.rankElevationStatus(s, 5, { route:'higher' }).eligible;
    FB.setPlayerTier(s, 6, { attachLiege:false }); FB.foundPlayerRealm(s);
    FB.checkTierPromotions(s);
    return { created:!!revenue && !!peace && !!personal, noRevenueClaim:noRevenueClaim,
      cause:cause.type, evidence:cause.rightId === peace.id,
      alternatives:rights.filter(function (r) { return r.type === 'customary'; }).length,
      packageValid:packageValid, aiCustomary:aiCustomary,
      noAIJure:!ai.some(function (right) { return right.type === 'dejure'; }),
      valid:preview.valid, pure:pure, stale:!stale.valid,
      rejected:rejected, rejectedPure:rejectedPure, suspended:suspended,
      fallback:fallback.type, noPromotion:noPromotion, noLapse:!s.player.titleLapse,
      tech:FBDATA.techImpactReviews.features.customary_territorial_claims.mode };
  });
  expect(result).toEqual({ created:true, noRevenueClaim:true, cause:'customary', evidence:true,
    alternatives:2, packageValid:true, aiCustomary:true, noAIJure:true, valid:true, pure:true, stale:true, rejected:true, rejectedPure:true,
    suspended:true, fallback:'aggression', noPromotion:true, noLapse:true, tech:'none' });
});

test('level words resolve by era and government and holders follow rank and sex', async function ({ page }, testInfo) {
  await startWorld(page, testInfo, '476');
  const result = await page.evaluate(function () {
    const s = FB.state;
    const roman = Object.keys(s.realms).find(function (id) {
      return (FB.governments.forRealm(s, id) || {}).id === 'roman_civic';
    });
    const kingdom = Object.keys(s.realms).find(function (id) {
      return (FB.governments.forRealm(s, id) || {}).id === 'regnum';
    });
    return { district:FB.titleLevels.name(s, 'duchy', { viewer:null }),
      roman:FB.titleLevels.name(s, 'duchy', { realm:roman, viewer:null }),
      diocese:FB.titleLevels.name(s, 'kingdom', { realm:roman, viewer:null }),
      kingdom:FB.titleLevels.name(s, 'kingdom', { realm:kingdom, viewer:null }),
      holder:FB.titleLevels.holder(s, 'duchy', { viewer:null, faith:'nicene', sex:'m' }),
      female:FB.titleLevels.holder(s, 'kingdom', { viewer:null, faith:'nicene', sex:'f' }) };
  });
  expect(result).toEqual({ district:'district', roman:'province', diocese:'diocese',
    kingdom:'kingdom', holder:'Dux', female:'Regina' });
  await page.evaluate(function () { FB.ui.setMapFilterOverlay(true); });
  await expect(page.locator('[data-map-mode="duchy"] b')).toHaveText(/Districts|Provinces/);
  await expect(page.locator('[data-map-mode="kingdom"] b')).toHaveText(/Realms|Kingdoms|Dioceses/);
});

test('absent title filters remain visible and explain their disabled state', async function ({ page }, testInfo) {
  await startWorld(page, testInfo, 'e2e_optional_titles', true);
  await page.evaluate(function () { FB.ui.setMapFilterOverlay(true); });
  for (const kind of ['duchy','kingdom']) {
    const button = page.locator('[data-map-mode="' + kind + '"]');
    await expect(button).toBeDisabled();
    await expect(button.locator('[data-map-filter-status]')).toHaveText('No title hierarchy');
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('#map-filter-controls')).toHaveClass(/hidden/);
});
