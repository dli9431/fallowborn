'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html','data/bookmarks.js','data/bookmark_476.js','data/bookmark_476_gaul_iberia.js',
  'data/bookmark_476_italy.js','data/cultures.js','data/intrigue.js','data/settlements.js',
  'data/geographies.js','data/eras.js','data/starts.js','data/technology.js','data/systems.js',
  'data/political_institutions.js','data/story_campaigns.js','data/distribution_crazygames.js',
  'js/world.js','js/model.js','js/authority.js','js/governments.js','js/politics.js',
  'js/justice.js','js/institutions.js','js/religion.js','js/population.js','js/settlement.js',
  'js/stories.js','js/story_campaign.js','js/story_476_rails.js','js/story_western_court_476.js',
  'js/story_curialis_track_476.js','js/bookmark_setup.js','js/events.js','js/wars.js',
  'js/armies.js','js/treasury.js','js/save.js','js/save_v4.js','js/main.js','js/technology.js',
  'js/starts.js','js/ui_modals.js','js/messages.js','js/i18n.js'
]);
const { test, expect } = require('../support/fixture');
const { startHistoricalGame } = require('../support/game/historical-start');
const { openGame } = require('../support/game/navigation');
const previous = require('../fixtures/bookmarks/476-iberia-before.json');

async function start(page, testInfo, crazygames) {
  if (crazygames) await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
  await startHistoricalGame(page, testInfo, { bookmark:'476',
    code:'IBERIA476-476-curialis_476-ravenna-m-Marcus-standard-0-roman.nicene' }, !!crazygames);
}

for (const crazygames of [false, true]) {
  test('Iberian smoke retains civic seats, regional communities and courts with flag ' + crazygames,
    async function ({ page }, testInfo) {
      await start(page, testInfo, crazygames);
      const result = await page.evaluate(function () {
        const s = FB.state, region = FBDATA.bookmarkRegions476.gaul_iberia;
        const cities = ['tarragona','merida','sevilla','toledo','cordoba','barcelona','zaragoza','lisboa','astorga','lugo'];
        const institutions = cities.every(function (pid) {
          return ['council','see'].every(function (kind) {
            const id = pid + '_' + kind, def = region.localInstitutions[id], row = s.localInstitutions[id];
            return !!(row && s.chars[row.representativeId] && !s.chars[row.representativeId].dead &&
              def.provinceId === pid && FB.world.sitesByProv[pid].list.some(function (site) { return site.site === def.site; }));
          });
        });
        const governors = FB.officeCourts(s).filter(function (row) {
          return ['aquitaine','suebi_476'].indexOf(row.id) >= 0;
        });
        const state = function () { return JSON.stringify([FB.state.owner,FB.state.holder,FB.state.population,
          FB.state.localInstitutions,FB.state.authority,FB.state.stories,FB.state.bookmarkSetup]); };
        const before = state();
        FB.save.restore(JSON.parse(FB.save.serialize()));
        return { faults:FB.validateBookmark(FB.bookmark('476')).concat(FB.validateLegalTraditions(),
            FB.validateReligionInstitutionsData(), FB.validateAuthorityData(), FB.validateTechnologyData()),
          institutions:institutions, durable:before === state(),warnings:FB.save.lastRestoreWarnings.length,
          governors:governors.length === 2 && governors.every(function (row) {
            return ['defensor_civitatis','praeses','comes_rei_privatae','dux'].every(function (id) { return row.offices.indexOf(id) >= 0; });
          }),
          north:['oviedo','santander','alava','pamplona'].map(function (id) {
            return [FB.state.owner[id],FB.countyCulture(FB.state,id)];
          }),
          balearics:FB.state.owner.mallorca,
          suevic:FB.state.realms.suebi_476.ruler.generated === true,
          code:FB.political.governingIdentity(FB.state,'aquitaine').legalIdentityId,
          basquePeriod:JSON.stringify(FB.cultureNamePool('basque','m',FB.state)) ===
            JSON.stringify(FB.cultureNamePool('roman','m',FB.state)),
          faiths:region.provinces.find(function (p) { return p.id === 'lugo'; }).communities.map(function (c) {
            return [c.culture,c.religion];
          }),
          stories:region.storyIds.every(function (id) { return !!FB.state.stories[id]; }),
          tech:['roman_office_petitions','local_institution_bargains','dual_jurisdiction','period_476_conditional_campaigns']
            .map(function (id) { return FBDATA.techImpactReviews.features[id].mode; }),
          population:FB.validatePopulationCommunities(FB.state),
          valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state) };
      });
      expect(result).toMatchObject({ faults:[], institutions:true, durable:true, governors:true,warnings:0,
        balearics:'aghlabids', suevic:true, code:'euric_code_476', basquePeriod:true, stories:true, population:[], valid:true,
        tech:['none','none','none','none'] });
      expect(result.north).toEqual([['cantabri_476','hispano_roman'],['cantabri_476','hispano_roman'],
        ['basques_476','basque'],['aquitaine','basque']]);
      expect(result.faiths).toEqual([['hispano_roman','nicene'],['suevic','homoian'],['suevic','nicene']]);
    });
}

test('personal law, royal appointments and civic guarantees keep their exact jurisdiction',
  async function ({ page }, testInfo) {
    await start(page,testInfo);
    const result = await page.evaluate(function () {
      let s = FB.state;
      function person(culture) {
        return FB.makeCharacter(s,{ sex:'m',culture:culture,religion:'nicene',born:446,station:1,traitsN:0 }).id;
      }
      const roman = person('hispano_roman'), goth = person('gothic'), basque = person('basque');
      const ruler = FB.realmRulerCharacterSnapshot(s,'aquitaine').id;
      const law = function (a,b) { return FB.justiceTradition(s,ruler,'secular',{ accusedId:a,otherPartyId:b }); };
      const mixed = law(goth,roman);
      const laws = [law(roman).id,law(goth).id,law(basque).id,mixed.id,mixed.assessorId];
      const actor = { kind:'character',id:roman }, scope = { kind:'county',id:'merida' };
      const beforeLand = JSON.stringify([s.owner,s.holder,s.population,s.bookmarkSetup.estates]);
      const official = FB.authorityAppoint(s,{ officeId:'praeses',institutionId:'aquitaine',
        appointer:{ kind:'realm',id:'aquitaine' },holder:actor,scope:scope });
      const local = ['peace','revenue'].every(function (power) {
        return FB.political.power(s,actor,power,{ provinceId:'merida' }).allowed;
      });
      const external = FB.political.power(s,actor,'peace',{ provinceId:'sevilla' }).allowed;
      const subject = { kind:'realm',id:'aquitaine' };
      const q = FB.localInstitutionQuote(s,'merida_council',subject,'petition',
        { courts:true,protection:true,tolerance:true,taxRelief:true });
      const grant = FB.localInstitutionMediate(s,'merida_see',subject,'merida');
      const protectedFields = s.authority.rights.filter(function (r) {
        return r.scope.kind === 'county' && r.scope.id === 'merida' && r.basis === 'tenure';
      });
      const tenure = protectedFields.length === 2 && protectedFields.every(function (r) {
        return r.basisRef === 'municipal_tenure_476:merida';
      });
      const before = JSON.stringify([s.authority,s.localInstitutions,s.bookmarkSetup]);
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      return { laws:laws,official:!!official,local:local,external:external,petition:q.allowed,
        church:!!grant,protectedFields:tenure,
        durable:before === JSON.stringify([s.authority,s.localInstitutions,s.bookmarkSetup]),
        sameLand:beforeLand === JSON.stringify([s.owner,s.holder,s.population,s.bookmarkSetup.estates]) };
    });
    expect(result).toEqual({ laws:['late_roman','euric_code_476','basque_custom_476','euric_code_476','late_roman'],
      official:true,local:true,external:false,petition:true,church:true,protectedFields:true,durable:true,sameLand:true });
  });

test('Iberian incidents follow live local communities and receipt only household consequences',
  async function ({ page }, testInfo) {
    await start(page,testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state; s.chars[s.player.charId].born = 446; s.player.gold = 100;
      const checks = [['iberia_476_civic_assessment','sevilla','santander'],
        ['iberia_476_euric_hearing','tarragona','sevilla'],['iberia_476_settled_fields','merida','sevilla'],
        ['iberia_476_episcopal_relief','cordoba','alava'],['iberia_476_two_congregations','lugo','sevilla'],
        ['iberia_476_suevic_envoy','lugo','tarragona'],['iberia_476_upland_pasture','alava','toledo']];
      const world = JSON.stringify([s.owner,s.holder,s.population,s.authority,s.localInstitutions]);
      const rows = checks.map(function (row) {
        const ev = FB.eventById(row[0]), location = { locationId:row[1] };
        const before = s.player.gold;
        const eligible = FB.eventPeriodEnabled(s,ev) && FB.checkTrigger(s,ev.trigger,location);
        const elsewhere = FB.checkTrigger(s,ev.trigger,{ locationId:row[2] });
        const receipt = FB.resolveEventOption(s,ev,ev.options[0],FB.eventContext(s,location),{ automated:false });
        return [eligible,elsewhere,before - s.player.gold,!!receipt,FB.validateEventPeriod(ev)];
      });
      const mixed = FB.eventById('iberia_476_two_congregations');
      const sameWorld = world === JSON.stringify([s.owner,s.holder,s.population,s.authority,s.localInstitutions]);
      const total = FB.countyPopulation(s,'lugo');
      const converted = FB.convertCountyCommunity(s,'lugo',{ kind:'faith',target:'nicene',source:'homoian',rate:1 });
      const unmixed = FB.checkTrigger(s,mixed.trigger,{ locationId:'lugo' });
      s.date.year = 601;
      return { rows:rows,unmixed:unmixed,sameWorld:sameWorld,converted:converted.count > 0,
        conserved:total === FB.countyPopulation(s,'lugo'),
        expired:checks.every(function (row) { return !FB.eventPeriodEnabled(s,FB.eventById(row[0])); }) };
    });
    expect(result.rows).toEqual([3,3,4,4,4,3,3].map(function (cost) { return [true,false,cost,true,null]; }));
    expect(result).toMatchObject({ unmixed:false,sameWorld:true,converted:true,conserved:true,expired:true });
  });

for (const id of ['suevic_frontier_476','cantabrian_campaign_476','vasconian_campaign_476','gallaecian_campaign_476']) {
  test(id + ' uses an ordinary war and preserves its won result across restore', async function ({ page },testInfo) {
    await start(page,testInfo);
    const result = await page.evaluate(function (id) {
      let s = FB.state;
      const def = FBDATA.storyCampaigns[id], story = FB.stories.get(id), pid = def.target.provinceId;
      s.date.year = def.firstYear; s.date.season = 0; s.date.day = 1;
      const original = s.owner[pid], population = JSON.stringify(s.population);
      story.day(s,s.stories[id]);
      const rec = s.stories[id], war = FB.ordinaryWarById(s,rec.warId);
      const started = rec.phase === 'started' && !!war && war.objectives[0].target === pid;
      const noAward = s.owner[pid] === original;
      const siblings = ['coruna','santiago','ourense','oviedo','pamplona'].map(function (p) { return s.owner[p]; });
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      FB.transferProvince(s,pid,def.actor.realmId);
      FB.settleOrdinaryWar(s,s.stories[id].warId,'victory'); story.day(s,s.stories[id]);
      const finished = JSON.stringify([s.stories[id],s.wars,s.authority]);
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state; story.day(s,s.stories[id]);
      return { started:started,noAward:noAward,result:s.stories[id].result,
        bounded:rec.deadline - rec.startedTurn === def.durationDays,
        samePopulation:population === JSON.stringify(s.population),
        otherCounties:siblings.every(function (owner,i) {
          return owner === s.owner[['coruna','santiago','ourense','oviedo','pamplona'][i]];
        }),durable:finished === JSON.stringify([s.stories[id],s.wars,s.authority]) };
    },id);
    expect(result).toEqual({ started:true,noAward:true,result:'won',bounded:true,samePopulation:true,otherCounties:true,durable:true });
  });
}

for (const mode of ['early','third_party','capital_lost','defeat','succession','timeout','expired']) {
  test('the Suevic frontier opportunity respects ' + mode, async function ({ page },testInfo) {
    await start(page,testInfo);
    const result = await page.evaluate(function (mode) {
      const s = FB.state, id = 'suevic_frontier_476', story = FB.stories.get(id), def = FBDATA.storyCampaigns[id];
      s.date.year = mode === 'early' ? 475 : mode === 'expired' ? def.lastYear + 1 : def.firstYear;
      if (mode === 'third_party') FB.transferProvince(s,'astorga','cantabri_476');
      if (mode === 'capital_lost') FB.transferProvince(s,'lugo','aquitaine');
      const land = JSON.stringify([s.owner,s.holder,s.population]);
      story.day(s,s.stories[id]);
      const rec = s.stories[id];
      if (mode === 'defeat') FB.settleOrdinaryWar(s,rec.warId,'defeat');
      if (mode === 'succession') {
        const next = FB.makeCharacter(s,{ sex:'m',culture:'suevic',religion:'homoian',born:446,station:3,traitsN:0 });
        FB.assignRealmRulerCharacter(s,'suebi_476',next.id,{ replaceAuthored:true });
      }
      if (mode === 'timeout') s.turn = rec.deadline;
      story.day(s,rec);
      const closed = JSON.stringify(rec);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      story.day(FB.state,FB.state.stories[id]);
      return { phase:rec.phase,result:rec.result,durable:closed === JSON.stringify(FB.state.stories[id]),
        land:land === JSON.stringify([FB.state.owner,FB.state.holder,FB.state.population]) };
    },mode);
    expect(result).toEqual({ phase:mode === 'early' ? 'pending' : 'resolved',
      result:mode === 'early' ? null : mode === 'succession' ? 'interrupted' :
        mode === 'defeat' || mode === 'timeout' ? 'failed' : 'diverted',durable:true,land:true });
  });
}

test('a campaign built from the previous 476 data restores its ownership, law and opening records',
  async function ({ page },testInfo) {
    await openGame(page,testInfo);
    // Construct an old campaign with the exact public base-branch data deltas.
    // This is a schema regression, not an owner-supplied historical save corpus.
    await page.evaluate(function (before) {
      const bm = FBDATA.bookmarks['476'];
      window.iberiaCurrentDefinition = JSON.parse(JSON.stringify(bm));
      bm.provinces = bm.provinces.map(function (p) {
        return before.provinceOverrides.find(function (row) { return row.id === p.id; }) || p;
      });
      bm.realms = bm.realms.filter(function (r) { return before.realmIdsToOmit.indexOf(r.id) < 0; });
      bm.realms.find(function (r) { return r.id === 'aquitaine'; }).governingIdentity.legalIdentityId = before.visigothicLegalIdentityId;
      bm.stories = bm.stories.filter(function (id) { return before.storyIdsToOmit.indexOf(id) < 0; });
      before.institutionIdsToOmit.forEach(function (id) { delete bm.localInstitutions[id]; });
      FB.startProgression.noteTier(3);
    },previous);
    const full = page.locator('#btn-choose-beginning');
    if (await full.isVisible()) await full.click();
    else await page.getByRole('button',{ name:'New Game',exact:true }).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('IBERIALegacy-476-curialis_476-ravenna-m-Marcus-standard-0-roman.nicene');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{ name:'Begin Your Story',exact:true }).click();
    await page.getByRole('button',{ name:'Begin',exact:true }).click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    const result = await page.evaluate(function (before) {
      FB.game.setPaused(true);
      const saved = JSON.parse(FB.save.serialize());
      const old = JSON.stringify([saved.state.owner,saved.state.holder,saved.state.population,saved.state.bookmarkSetup,
        saved.state.authority.governments,saved.state.stories]);
      FBDATA.bookmarks['476'] = window.iberiaCurrentDefinition;
      FBDATA.localInstitutions = FBDATA.bookmarks['476'].localInstitutions;
      FB.save.restore(saved);
      const s = FB.state, modern = JSON.parse(FB.save.serialize());
      const retained = old === JSON.stringify([modern.state.owner,modern.state.holder,modern.state.population,modern.state.bookmarkSetup,
        modern.state.authority.governments,modern.state.stories]);
      const institutions = JSON.stringify(s.localInstitutions), rng = FB.getRngState();
      FB.save.restore(modern);
      return { retained:retained,owner:FB.state.owner.alava,
        oldLaw:FB.political.governingIdentity(FB.state,'aquitaine').legalIdentityId,
        noNewRealms:before.realmIdsToOmit.every(function (id) { return !FB.state.realms[id]; }),
        noNewRails:before.storyIdsToOmit.every(function (id) { return !FB.state.stories[id]; }),
        stable:institutions === JSON.stringify(FB.state.localInstitutions) && rng === FB.getRngState(),
        warnings:FB.save.lastRestoreWarnings.length,valid:FB.save.v4.validatePlatform(modern.state) };
    },previous);
    expect(result).toEqual({ retained:true,owner:'aquitaine',oldLaw:'gothic_custom',noNewRealms:true,noNewRails:true,stable:true,warnings:0,valid:true });
  });

test('ten years in Iberia keep conserved communities, valid courts and bounded campaigns through restore',
  async function ({ page },testInfo) {
    test.setTimeout(180000);
    await start(page,testInfo);
    await page.evaluate(function () {
      FB.game.observe = true;
      delete FB.state.stories.curialis_track_476;
      FB.state.player.provinceId = 'merida';
      FB.state.chars[FB.state.player.charId].homeProvinceId = 'merida';
    });
    for (let year = 0; year < 10; year++) {
      await page.evaluate(function () { for (let day = 0; day < 360; day++) FB.game.passDay({ deferUi:true }); });
      if (year === 4) await page.evaluate(function () { FB.save.restore(JSON.parse(FB.save.serialize())); });
    }
    const result = await page.evaluate(function () {
      const s = FB.state, ids = FBDATA.bookmarkRegions476.gaul_iberia.storyIds;
      const before = JSON.stringify([s.owner,s.holder,s.population,s.stories,s.bookmarkSetup]);
      const bounded = ids.every(function (id) {
        const rec = s.stories[id], duration = FBDATA.storyCampaigns[id].durationDays;
        return rec.phase === 'pending' || rec.phase === 'resolved' && !!rec.result ||
          rec.phase === 'started' && rec.deadline > s.turn && rec.deadline <= s.turn + duration && !!FB.ordinaryWarById(s,rec.warId);
      });
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { year:FB.state.date.year,bounded:!!bounded,
        durable:before === JSON.stringify([FB.state.owner,FB.state.holder,FB.state.population,FB.state.stories,FB.state.bookmarkSetup]),
        rights:new Set(FB.state.authority.rights.map(function (row) { return row.id; })).size === FB.state.authority.rights.length,
        valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state),
        religion:FB.validateReligionInstitutionState(FB.state),
        population:FB.validatePopulationCommunities(FB.state),
        communities:['lugo','merida','sevilla','toledo','tarragona','alava','pamplona','santander'].every(function (id) {
          return !!(FB.state.realms[FB.state.owner[id]] && FB.state.realms[FB.state.holder[id]] && FB.countyCulture(FB.state,id) &&
            FB.countyReligion(FB.state,id) && FB.world.sitesByProv[id].list[0].authored);
        }) };
    });
    expect(result.year).toBeGreaterThanOrEqual(486);
    expect(result).toMatchObject({ bounded:true,durable:true,rights:true,valid:true,religion:true,population:[],communities:true });
  });

for (const id of ['867','1066']) {
  test(id + ' excludes Iberian late antique incidents and campaign records',async function ({ page },testInfo) {
    await openGame(page,testInfo);
    const result = await page.evaluate(function (id) {
      return new Promise(function (resolve) {
        const before = JSON.stringify(FB.bookmark(id));
        FB.activateBookmark(id,null,function (error) {
          if (error) { resolve({ error:error.message }); return; }
          FB.game.pending = { seed:'IBERIA-ISOLATION' }; FB.game.startObserve(); FB.game.setPaused(true);
          resolve({ same:before === JSON.stringify(FB.bookmark(id)),
            events:FBDATA.events.filter(function (ev) { return ev.pack === 'iberia_full_476' && FB.eventPeriodEnabled(FB.state,ev); }).length,
            rails:FBDATA.bookmarkRegions476.gaul_iberia.storyIds.some(function (story) { return !!FB.state.stories[story]; }),
            institutions:FB.localInstitutionList(FB.state).length });
        });
      });
    },id);
    expect(result).toEqual({ same:true,events:0,rails:false,institutions:0 });
  });
}
