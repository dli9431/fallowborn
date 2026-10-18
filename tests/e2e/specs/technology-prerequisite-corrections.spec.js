'use strict';
const fs = require('fs');
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { beginBookmark, restoreBookmark } = require('../support/game/bookmark-acceptance');
const { releasedCatalogue } = require('../support/released-catalogue');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'data/technology.js', 'data/technology_civic_military.js',
  'data/map_data.js', 'data/buildings_civic_military.js', 'data/units.js',
  'data/bookmarks.js', 'data/geographies.js', 'data/eras.js',
  'js/technology.js', 'js/actions.js', 'js/fortifications.js', 'js/lordships.js',
  'js/mods.js', 'js/main.js', 'js/save.js', 'js/world.js', 'js/settlement.js',
  'js/ui_modals.js', 'js/i18n.js', 'js/treasury.js'
]);

async function stageSovereign(page) {
  await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    s.player.tier = 4; s.player.provs = [pid]; s.player.gold = 10000;
    s.owner[pid] = s.holder[pid] = 'player'; s.dev[pid] = 8;
    FB.foundPlayerRealm(s);
    s.realms.player.liege = null;
    FB.rememberSettlementSites(s, pid);
    s.buildings[pid] = [];
    FB.invalidateBuildingIndex(s, pid); FB.invalidateFortIndex();
    s.realmTech.player = { completed:[], exposed:[], active:[], progress:{},
      reserve:0, priorities:{}, historicalSeeded:1 };
    FB.invalidateTechBonuses();
  });
}

test('the bounded catalogue retains numeric effects, chronology, grants and fort contracts',
  async function ({ page }, info) {
    await openGame(page, info);
    const r = await page.evaluate(function () {
      const ids = ['annual_fairs','siege_engineering','ringworks','castle_towers',
        'stone_castles','concentric_defenses','fortified_gates','postal_relays',
        'capitularies','mint_assay','physicians','hospitals'];
      return {
        errors:FB.validateTechnologyData(), buildingErrors:FB.validateBuildingData(FBDATA.buildings, true),
        records:ids.map(function (id) {
          const d = FBDATA.tech[id];
          return [id, d.cost, d.history.attested, d.history.adoption.default, d.fx, d.capabilities];
        }),
        fairs:FBDATA.tech.annual_fairs.req, siege:FBDATA.tech.siege_engineering.req,
        grants:[FBDATA.tech.annual_fairs.unlocks, FBDATA.tech.siege_engineering.unlocks],
        fort:FB.fortificationBuildingId(), levels:FBDATA.fortLevels,
        coreCaps:{ siege:FBDATA.techCaps.siege, trade:FBDATA.techCaps.trade },
        presentations:{
          guild:FBDATA.buildings.guildhall.name,
          range:FBDATA.buildings.archery_butts.desc,
          foundry:FBDATA.buildings.foundry.desc,
          towers:FBDATA.tech.castle_towers.desc,
          postal:FBDATA.tech.postal_relays.desc,
          hospitals:FBDATA.tech.hospitals.desc
        },
        scriptOrder:Array.from(document.scripts).map(function (script) {
          return script.getAttribute('src');
        }).filter(Boolean)
      };
    });
    expect(r.errors).toEqual([]); expect(r.buildingErrors).toEqual([]);
    expect(r.records).toEqual([
      ['annual_fairs',100,[850,1150],[980,1170],{trade:0.015},[]],
      ['siege_engineering',50,[650,1100],[850,1120],{siege:0.04},[]],
      ['ringworks',50,[500,950],[700,960],{levy:0.015},[]],
      ['castle_towers',50,[750,1100],[900,1120],{battle:0.005},[]],
      ['stone_castles',100,[850,1150],[980,1170],{siege:0.03},[]],
      ['concentric_defenses',150,[1050,1300],[1180,1320],{siege:0.04},[]],
      ['fortified_gates',100,[850,1200],[1010,1230],{},[]],
      ['postal_relays',50,[700,1150],[900,1170],{movement:0.02},[]],
      ['capitularies',50,[650,900],[760,920],{levy:0.01},[]],
      ['mint_assay',100,[800,1150],[940,1170],{finance:0.015},['assayed_coinage']],
      ['physicians',50,[700,1100],[850,1130],{health:0.003},[]],
      ['hospitals',50,[650,1100],[800,1120],{health:0.002,populationCrisisProtection:0.03},[]]
    ]);
    expect(r.fairs).toEqual(['urban_markets']); expect(r.siege).toEqual(['geometry']);
    expect(r.grants).toEqual([['rule:annual_fairs'],['rule:siege_engineers']]);
    expect(r.fort).toBe('walls'); expect(r.coreCaps).toEqual({siege:0.35,trade:0.30});
    expect(r.levels).toEqual({
      1:{name:'Ringwork',requiresTech:['ringworks'],cost:120,seasons:2,upkeep:2,garrison:40,siegeDelay:1,defense:0.05,prestige:10,work:60},
      2:{name:'Towered Stronghold',requiresTech:['castle_towers'],cost:220,seasons:3,upkeep:4,garrison:80,siegeDelay:2,defense:0.10,prestige:25,work:120},
      3:{name:'Stone Castle',requiresTech:['stone_castles'],cost:400,seasons:5,upkeep:8,garrison:140,siegeDelay:3,defense:0.15,prestige:60,work:220},
      4:{name:'Concentric Fortress',requiresTech:['concentric_defenses','fortified_gates'],cost:750,seasons:8,upkeep:14,garrison:220,siegeDelay:4,defense:0.20,prestige:150,work:400}
    });
    expect(r.presentations.guild).toEqual({default:'Chartered Guildhall',italian:'Guild Hall'});
    expect(r.presentations.range).toContain('specialized military range');
    expect(r.presentations.foundry).toContain('Ordinary smithing');
    expect(r.presentations.towers).toContain('not the first flanking tower');
    expect(r.presentations.postal).toContain('no operating postal network');
    expect(r.presentations.hospitals).toContain('Earlier charitable guesthouses');
    for (const file of ['data/technology_civic_military.js','data/buildings_civic_military.js']) {
      expect(r.scriptOrder.indexOf(file)).toBeGreaterThan(r.scriptOrder.indexOf('data/technology.js'));
      expect(r.scriptOrder.indexOf(file)).toBeLessThan(r.scriptOrder.indexOf('data/bookmarks.js'));
    }
  });

test('ordinary research uses the relaxed prerequisites without granting specific engines or public rights',
  async function ({ page }, info) {
    await openGame(page, info); await startDeterministicGame(page); await stageSovereign(page);
    const r = await page.evaluate(function () {
      const s = FB.state, record = s.realmTech.player;
      const rights = JSON.stringify([s.authority,s.localInstitutions,s.player.guildMonopolies,s.buildings,s.armies]);
      const rng = FB.getRngState(), uid = FB.getUidCounter(), gold = s.player.gold;
      const locked = ['annual_fairs','siege_engineering'].map(function (id) {
        return FB.techCandidate(s, id).reqLocked;
      });
      record.completed = ['urban_markets','geometry'];
      const available = ['annual_fairs','siege_engineering'].map(function (id) {
        return FB.techCandidate(s, id).available;
      });
      const started = FB.selectTechProject(s, 'siege_engineering');
      FB.addResearch(s, FB.techCost(s, 'siege_engineering'));
      const fairStarted = FB.selectTechProject(s, 'annual_fairs');
      FB.addResearch(s, FB.techCost(s, 'annual_fairs'));
      return {locked:locked,available:available,started:started,fairStarted:fairStarted,
        completed:record.completed.slice().sort(), siege:FB.techBonus(s,'siege'), trade:FB.techBonus(s,'trade'),
        torsion:FB.hasTechUnlock(s,'rule:torsion_engines'),
        counterweight:FB.hasTechUnlock(s,'rule:counterweight_trebuchet'),
        gunpowder:FB.hasTechUnlock(s,'rule:siege_bombards'),
        unchanged:rights === JSON.stringify([s.authority,s.localInstitutions,s.player.guildMonopolies,s.buildings,s.armies]),
        pureFunds:gold === s.player.gold, pureIdentity:rng === FB.getRngState() && uid === FB.getUidCounter()};
    });
    expect(r).toEqual({locked:[true,true],available:[true,true],started:true,fairStarted:true,
      completed:['annual_fairs','geometry','siege_engineering','urban_markets'],
      siege:0.04,trade:0.015,torsion:false,counterweight:false,gunpowder:false,
      unchanged:true,pureFunds:true,pureIdentity:true});
  });

test('seed closure respects specific omissions and removes descendants only for genuine missing prerequisites',
  async function ({ page }, info) {
    await openGame(page, info); await startDeterministicGame(page);
    const r = await page.evaluate(function () {
      function seed(complete, omit) {
        const s = JSON.parse(JSON.stringify(FB.state));
        s.date.year = 476; s.realmTech = {};
        s.realms = {review:{id:'review',alive:true,capital:s.player.provinceId,
          techTraditions:['steppe'],techSeed:{complete:complete,omit:omit}}};
        FB.seedRealmTechnologies(s, true);
        return s.realmTech.review.completed;
      }
      return {
        fair:seed(['annual_fairs'],['merchant_guilds']),
        fairMissing:seed(['annual_fairs','toll_exemptions'],['urban_markets']),
        engine:seed(['siege_engineering','sapper_corps'],['torsion_artillery']),
        engineMissing:seed(['siege_engineering','sapper_corps','counterweight_trebuchet','incendiary_weapons'],['geometry']),
        genericMissing:seed(['sapper_corps','counterweight_trebuchet','incendiary_weapons'],['siege_engineering'])
      };
    });
    expect(r.fair).toEqual(expect.arrayContaining(['annual_fairs','urban_markets']));
    expect(r.fair).not.toContain('merchant_guilds');
    for (const id of ['annual_fairs','toll_exemptions','urban_markets']) expect(r.fairMissing).not.toContain(id);
    expect(r.engine).toEqual(expect.arrayContaining(['geometry','siege_engineering','sapper_corps']));
    expect(r.engine).not.toContain('torsion_artillery');
    for (const id of ['siege_engineering','sapper_corps','counterweight_trebuchet','incendiary_weapons']) {
      expect(r.engineMissing).not.toContain(id); expect(r.genericMissing).not.toContain(id);
    }
  });

test('the three facilities retain paid construction, troop quantities and existing knowledge gates',
  async function ({ page }, info) {
    await openGame(page, info); await startDeterministicGame(page); await stageSovereign(page);
    const r = await page.evaluate(function () {
      const s = FB.state, pid = s.player.provinceId, record = s.realmTech.player;
      const ids = ['guildhall','archery_butts','foundry'];
      const rights = JSON.stringify([s.authority,s.player.guildMonopolies,s.localInstitutions]);
      const blocked = ids.map(function (id) { return FB.canBuildAt(s,pid,0,id); });
      record.completed = ['guild_charters','crossbows','blast_furnace'];
      s.player.gold = 0;
      const unfunded = FB.build(s,pid,0,'guildhall');
      const empty = s.buildings[pid].length === 0 && s.player.gold === 0;
      s.player.gold = 10000;
      const purchases = ids.map(function (id) {
        const price = FB.buildCost(s,pid,id), gold = s.player.gold;
        const ai = FB.aiCanBuildAt(s,'player',pid,0,id);
        const built = FB.build(s,pid,0,id);
        return {id:id,built:built,paid:gold-s.player.gold,price:price,ai:ai};
      });
      return {blocked:blocked,unfunded:unfunded,empty:empty,purchases:purchases,
        retinue:FB.buildingBonusIn(s,pid,'retinue'),archers:FB.buildingBonusIn(s,pid,'archers'),
        upkeep:FB.buildingBonusIn(s,pid,'upkeep'),
        sameRights:rights === JSON.stringify([s.authority,s.player.guildMonopolies,s.localInstitutions]),
        prerequisites:ids.map(function (id) { return FBDATA.buildings[id].requiresTech; }),
        basePrices:ids.map(function (id) { return FBDATA.buildings[id].cost; }),
        orders:ids.map(function (id) { return FBDATA.buildings[id].aiBuildOrder || null; })};
    });
    expect(r.blocked).toEqual([false,false,false]);
    for (const p of r.purchases) {
      expect(p.built).toBe(true); expect(p.ai).toBe(true); expect(p.paid).toBe(p.price); expect(p.price).toBeGreaterThan(0);
    }
    expect(r).toMatchObject({unfunded:false,empty:true,retinue:45,archers:50,upkeep:5,sameRights:true,
      prerequisites:['guild_charters','crossbows','blast_furnace'],basePrices:[120,70,130],orders:[3,null,5]});
  });

for (const bookmark of ['867','1066']) {
  test(bookmark + ' keeps released world hashes and its starting knowledge without re-recording fixtures',
    async function ({ page }, info) {
      await beginBookmark(page, info, bookmark, 'farmer');
      const fixture = JSON.parse(fs.readFileSync(path.resolve(__dirname,'../fixtures/released-catalogue.json'),'utf8'));
      const released = await page.evaluate(releasedCatalogue, fixture.selection);
      for (const key of ['bookmark/867/baseline','bookmark/1066/baseline','geography/europe_regional']) {
        expect(released.hashes[key]).toBe(fixture.hashes[key]);
      }
      const r = await page.evaluate(function () {
        function snapshot() {
          const s = JSON.parse(JSON.stringify(FB.state)); s.realmTech = {};
          FB.seedRealmTechnologies(s,true);
          const out = {};
          Object.keys(s.realmTech).sort().forEach(function (rid) {
            out[rid] = {completed:s.realmTech[rid].completed.slice().sort(),exposed:s.realmTech[rid].exposed.slice().sort()};
          });
          return out;
        }
        const corrected = snapshot();
        const fair = FBDATA.tech.annual_fairs.req, siege = FBDATA.tech.siege_engineering.req;
        let original;
        try {
          FBDATA.tech.annual_fairs.req = ['merchant_guilds'];
          FBDATA.tech.siege_engineering.req = ['torsion_artillery','geometry'];
          original = snapshot();
        } finally {
          FBDATA.tech.annual_fairs.req = fair; FBDATA.tech.siege_engineering.req = siege;
        }
        return {corrected:corrected,original:original,realms:Object.keys(corrected).length};
      });
      expect(r.realms).toBeGreaterThan(10); expect(r.corrected).toEqual(r.original);
    });
}

test('matching restore preserves old completed knowledge, partial research and existing property without seeding',
  async function ({ page }, info) {
    await openGame(page, info); await startDeterministicGame(page); await stageSovereign(page);
    const before = await page.evaluate(function () {
      const s = FB.state, pid = s.player.provinceId;
      s.realmTech.player = {completed:['geometry','torsion_artillery','urban_markets','merchant_guilds','annual_fairs'],
        exposed:['siege_engineering'],active:['siege_engineering'],progress:{siege_engineering:7.25},
        reserve:3.5,priorities:{postal_relays:1400},historicalSeeded:1};
      s.buildings[pid] = [{s:0,id:'guildhall'},{s:0,id:'foundry',ruined:true}];
      FB.invalidateBuildingIndex(s,pid);
      // A later current year must not install all historically adopted knowledge on load.
      s.date.year = 1300;
      return {record:JSON.stringify(s.realmTech.player),assets:JSON.stringify(s.buildings[pid]),save:FB.save.serialize()};
    });
    await restoreBookmark(page, before.save);
    const after = await page.evaluate(function () {
      const s = FB.state;
      return {record:JSON.stringify(s.realmTech.player),assets:JSON.stringify(s.buildings[s.player.provinceId]),
        candidate:FB.techCandidate(s,'siege_engineering').available,
        acquired:FB.hasTech(s,'siege_engineering')};
    });
    expect(after).toEqual({record:before.record,assets:before.assets,candidate:false,acquired:false});
  });

for (const sample of [
  {file:'civic-fair-catalogue.json',id:'annual_fairs',known:['written_law'],missing:[],cost:33,fx:'trade',amount:0.009},
  {file:'survey-siege-catalogue.json',id:'siege_engineering',known:['geometry','road_surveys'],missing:['geometry'],cost:47,fx:'siege',amount:0.013}
]) {
  test(sample.file + ' imports a different graph, validates purely and restores only with matching content',
    async function ({ page }, info) {
      await openGame(page,info);
      await page.evaluate(function () { FB.ui.showMods(); });
      await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/'+sample.file));
      await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
      await page.waitForFunction(function (input) {
        return window.FB && FB.game && FB.game.bootReady && FBDATA.tech[input.id].cost === input.cost;
      },sample);
      await startDeterministicGame(page); await stageSovereign(page);
      const before = await page.evaluate(function (input) {
        const s = FB.state, record = s.realmTech.player;
        const bad = {tech:{}}; bad.tech[input.id] = JSON.parse(JSON.stringify(FBDATA.tech[input.id]));
        bad.tech[input.id].req = ['review_missing_prerequisite'];
        const state = JSON.stringify(s), data = JSON.stringify(FBDATA.tech), rng = FB.getRngState(), uid = FB.getUidCounter();
        const errors = FB.mods.validate(bad);
        const pure = state === JSON.stringify(s) && data === JSON.stringify(FBDATA.tech) && rng === FB.getRngState() && uid === FB.getUidCounter();
        record.completed = input.missing;
        const locked = FB.techCandidate(s,input.id).reqLocked;
        record.completed = input.known;
        const available = FB.techCandidate(s,input.id).available;
        const started = FB.selectTechProject(s,input.id);
        FB.addResearch(s,FB.techCost(s,input.id));
        return {errors:errors,pure:pure,locked:locked,available:available,started:started,
          bonus:FB.techBonus(s,input.fx),record:JSON.stringify(record),save:FB.save.serialize()};
      },sample);
      expect(before.errors.join('\n')).toContain('review_missing_prerequisite'); expect(before.pure).toBe(true);
      expect(before).toMatchObject({locked:true,available:true,started:true,bonus:sample.amount});
      await restoreBookmark(page,before.save);
      expect(await page.evaluate(function () { return JSON.stringify(FB.state.realmTech.player); })).toBe(before.record);
      await page.evaluate(function (input) {
        const mods = JSON.parse(localStorage.getItem('fb_mods'));
        const mod = JSON.parse(mods[0]); mod.tech[input.id].cost++;
        localStorage.setItem('fb_mods',JSON.stringify([JSON.stringify(mod)]));
      },sample);
      await openGame(page,info);
      expect(await page.evaluate(function (text) {
        const state = FB.state, world = FB.world, rng = FB.getRngState(), uid = FB.getUidCounter();
        const rejected = FB.game.loadData(JSON.parse(text)) === false;
        return rejected && state === FB.state && world === FB.world && rng === FB.getRngState() && uid === FB.getUidCounter();
      },before.save)).toBe(true);
    });
}
