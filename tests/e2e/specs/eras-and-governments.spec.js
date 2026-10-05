'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/eras.js', 'data/bookmarks.js', 'data/bookmark_476.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js',
  'data/political_institutions.js', 'data/cultures.js',
  'js/governments.js', 'js/world.js', 'js/authority.js', 'js/federates.js', 'js/politics.js',
  'js/armies.js', 'js/wars.js', 'js/stories.js', 'js/story_western_court_476.js', 'js/main.js',
  'js/save.js', 'js/save_v4.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

async function start(page, testInfo, bookmark) {
  await openGame(page, testInfo);
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(bookmark === '476'
    ? 'ERAS-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian'
    : 'ERAS-' + bookmark + '-serf-london-f-Ada');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  expect(await page.evaluate(function () { return FB.state.start.id; })).toBe(bookmark);
}

test('every bookmark declares an era and resolves each realm form',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const out = {};
      ['867', '1066', '476'].forEach(function (id) {
        const platform = FB.resolveBookmarkPlatform(FB.bookmark(id));
        const forms = {};
        Object.keys(platform.governments).forEach(function (rid) {
          const form = platform.governments[rid];
          forms[form] = (forms[form] || 0) + 1;
        });
        out[id] = { declared:FB.bookmark(id).era, era:platform.era,
          faults:platform.faults, errors:FB.validateBookmark(FB.bookmark(id)),
          forms:forms };
      });
      const forms476 = FB.resolveBookmarkPlatform(FB.bookmark('476')).governments;
      out.named476 = { italy:forms476.italy, croatia:forms476.croatia,
        byzantium:forms476.byzantium, federates_476:forms476.federates_476,
        franks_476:forms476.franks_476 };
      out.data = FB.validateEraData().concat(FB.governments.validate());
      out.territorial = FB.governments.resolve('territorial').strategies;
      out.lateAntique = ['roman_civic','federate_polity'].map(function (id) {
        const strategies = FB.governments.resolve(id).strategies;
        return [id, strategies.ladder, strategies.ai];
      });
      out.regnum = FB.governments.resolve('regnum').strategies.holders;
      return out;
    });
    expect(result['867']).toMatchObject({ declared:'early_medieval',
      era:'early_medieval', faults:[], errors:[] });
    expect(result['1066']).toMatchObject({ declared:'high_medieval',
      era:'high_medieval', faults:[], errors:[] });
    expect(result['476']).toMatchObject({ declared:'late_antique',
      era:'late_antique', faults:[], errors:[],
      forms:{ regnum:10, roman_civic:4, federate_polity:3 } });
    expect(Object.keys(result['867'].forms)).toEqual(['territorial']);
    expect(Object.keys(result['1066'].forms)).toEqual(['territorial']);
    expect(result.named476).toEqual({ italy:'roman_civic', croatia:'roman_civic',
      byzantium:'roman_civic', federates_476:'federate_polity',
      franks_476:'regnum' });
    expect(result.data).toEqual([]);
    expect(result.territorial).toEqual({ holders:'feudal_vassals',
      succession:'dynastic', territory:'fixed', consent:'territorial',
      levy:'engine_default', revenue:'engine_default', council:'engine_default',
      diplomacy:'engine_default', ai:'federate_contracts',
      vocabulary:'engine_default', ladder:'engine_default' });
    expect(result.regnum).toBe('direct');
    expect(result.lateAntique).toEqual([
      ['roman_civic','roman_civic','federate_contracts'],
      ['federate_polity','federate_polity','federate_contracts']
    ]);
  });

test('unknown eras, dates outside a declared era and unknown forms are rejected',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const base = FB.bookmark('867');
      function errors(changes) {
        return FB.validateBookmark(Object.assign({}, base, changes)).join('\n');
      }
      const undeclared = Object.assign({}, base);
      delete undeclared.era;
      const later = Object.assign({}, undeclared,
        { date:{ year:1400, season:0, day:1 } });
      const realms = base.realms.map(function (realm, index) {
        return index ? realm : Object.assign({}, realm, { government:'e2e_missing_form' });
      });
      const saved = FBDATA.eras.e2e_overlap;
      let overlap, badDefault;
      try {
        FBDATA.eras.e2e_overlap = { from:900, to:950,
          defaultGovernment:'e2e_missing_form', defaultCulture:'frankish' };
        overlap = FB.validateEraData().join('\n');
        badDefault = errors({});
      } finally {
        if (saved === undefined) delete FBDATA.eras.e2e_overlap;
        else FBDATA.eras.e2e_overlap = saved;
      }
      let unknownForm = '';
      try { FB.governments.resolve('e2e_missing_form'); }
      catch (error) { unknownForm = error.message; }
      return {
        unknownEra:errors({ era:'e2e_missing_era' }),
        outside:errors({ era:'late_antique' }),
        inferred:FB.bookmarkEra(undeclared),
        inferredErrors:FB.validateBookmark(undeclared),
        nearest:FB.bookmarkEra(later),
        nearestErrors:FB.validateBookmark(later),
        unknownRealmForm:errors({ realms:realms }),
        firstRealm:base.realms[0].id,
        overlap:overlap, badDefault:badDefault, unknownForm:unknownForm,
        restored:FB.validateEraData()
      };
    });
    expect(result.unknownEra).toContain('Bookmark 867: unknown era e2e_missing_era.');
    expect(result.outside).toContain(
      'Bookmark 867: start year 867 is outside era late_antique (375–649).');
    expect(result.inferred).toBe('early_medieval');
    expect(result.inferredErrors).toEqual([]);
    expect(result.nearest).toBe('high_medieval');
    /* the nearest era resolves, but the start lies past the technology
       catalogue's authored coverage */
    expect(result.nearestErrors).toEqual([
      'Bookmark 867: start year 1400 is outside the technology catalogue coverage (476–1300).'
    ]);
    expect(result.unknownRealmForm).toContain('Bookmark 867: realm ' +
      result.firstRealm + ' has unknown government e2e_missing_form.');
    expect(result.overlap).toContain('Eras early_medieval and e2e_overlap overlap.');
    expect(result.overlap).toContain(
      'Era e2e_overlap has unknown default government e2e_missing_form.');
    expect(result.badDefault).toContain('Eras early_medieval and e2e_overlap overlap.');
    expect(result.unknownForm).toBe('Unknown government form e2e_missing_form.');
    expect(result.restored).toEqual([]);
  });

test('activation fails with a named error for an unregistered strategy',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(async function () {
      const base = FB.bookmark('867');
      const realm = base.realms[0].id;
      const world = FB.world, active = FB.activeBookmarkId;
      let duplicate = '';
      try { FB.governments.register('holders', 'direct', {}); }
      catch (error) { duplicate = error.message; }
      FBDATA.governmentForms.e2e_unregistered = { holders:'e2e_missing_holders',
        succession:'acclamation', territory:'fixed', consent:'delegated' };
      FBDATA.bookmarks.e2e_unregistered = Object.assign({}, base, { id:'e2e_unregistered',
        realms:base.realms.map(function (row, index) {
          return index ? row : Object.assign({}, row, { government:'e2e_unregistered' });
        }) });
      let message = '', data = [];
      try {
        data = FB.governments.validate();
        message = await new Promise(function (resolve) {
          FB.activateBookmark('e2e_unregistered', null, function (error) {
            resolve(error ? error.message : '');
          });
        });
      } finally {
        delete FBDATA.bookmarks.e2e_unregistered;
        delete FBDATA.governmentForms.e2e_unregistered;
      }
      return { realm:realm, message:message, data:data, duplicate:duplicate,
        unchanged:FB.world === world && FB.activeBookmarkId === active,
        clean:FB.governments.validate() };
    });
    expect(result.message).toContain('Bookmark e2e_unregistered: realm ' + result.realm +
      ' uses government e2e_unregistered, whose holders strategy e2e_missing_holders is not registered.');
    expect(result.data).toEqual([
      'Government form e2e_unregistered uses holders strategy e2e_missing_holders, which is not registered.'
    ]);
    expect(result.duplicate).toBe('Duplicate holders strategy direct.');
    expect(result.unchanged).toBe(true);
    expect(result.clean).toEqual([]);
  });

for (const [bookmark, era] of [['867', 'early_medieval'], ['1066', 'high_medieval']]) {
  test(bookmark + ' stamps its era and keeps feudal vassal holders without records',
    async function ({ page }, testInfo) {
      await start(page, testInfo, bookmark);
      const result = await page.evaluate(function () {
        const s = FB.state, forms = {};
        Object.keys(s.realms).forEach(function (rid) {
          if (!s.realms[rid].alive) return;
          const form = FB.political.government(s, { kind:'realm', id:rid });
          if (form) forms[form.formId] = true;
        });
        return {
          era:s.start.era, defaultGovernment:s.start.defaultGovernment,
          geography:s.start.geography,
          authority:Object.prototype.hasOwnProperty.call(s, 'authority'),
          forms:Object.keys(forms),
          generatedVassals:Object.keys(s.realms).some(function (rid) {
            return s.realms[rid].generated && !!s.realms[rid].liege;
          }),
          culture:FB.eraDefaultCulture(s), campaignEra:FB.campaignEra(s)
        };
      });
      expect(result).toEqual({ era:era, defaultGovernment:'territorial',
        geography:'europe_regional', authority:false, forms:['territorial'],
        generatedVassals:true, culture:'frankish', campaignEra:era });
    });
}

test('476 seeds its forms from bookmark data and holds counties directly',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '476');
    const result = await page.evaluate(function () {
      const s = FB.state, Q = FB.political;
      function form(rid) {
        return Q.government(s, { kind:'realm', id:rid }).formId;
      }
      const consent = Q.power(s, { kind:'realm', id:'franks_476' }, 'consent',
        { provinceId:'arras' });
      const delegated = Q.power(s, { kind:'realm', id:'italy' }, 'consent',
        { provinceId:'ravenna' });
      const rows = {};
      Object.keys(s.authority.governments).forEach(function (rid) {
        const row = s.authority.governments[rid];
        rows[rid] = { formId:row.formId, sinceTurn:row.sinceTurn };
      });
      return {
        era:s.start.era, defaultGovernment:s.start.defaultGovernment,
        rows:rows,
        franks:form('franks_476'), italy:form('italy'),
        federates:form('federates_476'),
        direct:FB.world.provs.every(function (pr) {
          return pr.wasteland || s.holder[pr.id] === pr.realm0;
        }),
        consent:consent.allowed && consent.basis[0].kind,
        delegated:delegated.allowed,
        culture:FB.eraDefaultCulture(s)
      };
    });
    expect(result).toEqual({
      era:'late_antique', defaultGovernment:'regnum',
      rows:{
        italy:{ formId:'roman_civic', sinceTurn:0 },
        rugi_476:{ formId:'regnum', sinceTurn:0 },
        croatia:{ formId:'roman_civic', sinceTurn:0 },
        byzantium:{ formId:'roman_civic', sinceTurn:0 },
        pannonia:{ formId:'federate_polity', sinceTurn:0 },
        gepids_476:{ formId:'regnum', sinceTurn:0 },
        thracian_goths_476:{ formId:'federate_polity', sinceTurn:0 },
        federates_476:{ formId:'federate_polity', sinceTurn:0 },
        west_francia:{ formId:'roman_civic', sinceTurn:0 },
        franks_476:{ formId:'regnum', sinceTurn:0 },
        aquitaine:{ formId:'regnum', sinceTurn:0 },
        burgundy:{ formId:'regnum', sinceTurn:0 },
        suebi_476:{ formId:'regnum', sinceTurn:0 },
        armorica_476:{ formId:'regnum', sinceTurn:0 },
        rhein_franks_476:{ formId:'regnum', sinceTurn:0 },
        aghlabids:{ formId:'regnum', sinceTurn:0 },
        mauri_476:{ formId:'regnum', sinceTurn:0 },
        altava_476:{ formId:'regnum', sinceTurn:0 },
        tingitana_476:{ formId:'regnum', sinceTurn:0 }
      },
      franks:'regnum', italy:'roman_civic', federates:'federate_polity',
      direct:true, consent:'territorial_consent', delegated:false,
      culture:'roman'
    });
  });

test('476 saves keep their stamp and unstamped saves resolve as territorial',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '476');
    const result = await page.evaluate(function () {
      const original = FB.save.serialize();
      function forms() {
        return ['franks_476', 'italy'].map(function (rid) {
          return FB.political.government(FB.state, { kind:'realm', id:rid }).formId;
        });
      }
      try {
        FB.save.restore(JSON.parse(original));
        const stamped = { era:FB.state.start.era,
          defaultGovernment:FB.state.start.defaultGovernment, forms:forms() };
        const legacy = JSON.parse(original);
        delete legacy.state.start.era;
        delete legacy.state.start.defaultGovernment;
        const migrated = FB.save.v4.migrate(legacy);
        FB.save.restore(legacy);
        return { stamped:stamped,
          migrated:{ era:migrated.state.start.era,
            defaultGovernment:migrated.state.start.defaultGovernment },
          legacyForms:forms() };
      } finally {
        FB.save.restore(JSON.parse(original));
      }
    });
    expect(result).toEqual({
      stamped:{ era:'late_antique', defaultGovernment:'regnum',
        forms:['regnum', 'roman_civic'] },
      migrated:{ era:'late_antique', defaultGovernment:undefined },
      legacyForms:['territorial', 'roman_civic']
    });
  });

test('scenario hosts follow their own standing and escort flags',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '476');
    const result = await page.evaluate(function () {
      const s = FB.state, sc = s.stories.western_court_476;
      function host(id) {
        return s.armies.filter(function (army) { return army.id === id; })[0] || null;
      }
      s.turn++;
      FB.armyTick(s);
      const standing = !!host('host_476_italy') && !!host('host_476_federates');
      FB.repairWars(s);
      const restoredStanding = !!host('host_476_italy') && !!host('host_476_federates');
      host('host_476_federates').scenarioEndTurn = s.turn;
      s.turn++;
      FB.armyTick(s);
      const released = !host('host_476_federates');
      const escort = host('host_476_italy');
      escort.scenarioCourtEscort = true;
      sc.courtMove = 'travelling';
      s.owner.pavia = 'aquitaine';
      FB.invalidateRealmCache();
      FB.stories.day(s);
      return { standing:standing, restoredStanding:restoredStanding, released:released, move:sc.courtMove,
        escort:escort.scenarioCourtEscort };
    });
    expect(result).toEqual({ standing:true, restoredStanding:true, released:true,
      move:'interrupted', escort:false });
  });
