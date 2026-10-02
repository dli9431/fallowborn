'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/climate.js', 'data/geographies.js', 'data/bookmarks.js',
  'data/bookmark_476.js', 'data/counties.js', 'data/tournaments.js',
  'data/events_common.js', 'data/events_noble.js', 'data/events_paths.js',
  'data/events_peasant.js',
  'js/climate.js', 'js/world.js', 'js/events.js', 'js/armies.js',
  'js/logistics.js', 'js/tournaments.js', 'js/ui_tournaments.js',
  'js/mods.js', 'js/ui_panels.js', 'js/ui_modals.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

/* Climate zones (docs/designs/time.md, Calendar and local seasons): the
   calendar is global, each county's zone maps it to a local season kind,
   and engine rules read the kind's properties. europe_regional keeps the
   long-standing seasons everywhere; a southern zone moves them half a
   year. */

const KINDS = ['spring', 'summer', 'autumn', 'winter'];

/* The calendar indices each shipped event's trigger listed before its
   conversion to seasonKinds. */
const FORMER_SEASON_TRIGGERS = {
  winter_fever:[3], harsh_winter:[3], child_festival:[1],
  child_winter_tales:[3], famine_relief:[3], smith_bridge_irons:[1, 2],
  cooper_vintage_casks:[2], spring_sowing:[0], summer_storm:[1], harvest:[2],
  lean_winter:[3], serf_seed_grain_requisition:[2, 3], tax_collector:[2],
  village_festival:[1], wolves:[3], good_ox_year:[2], mill_will_not_turn:[1, 2],
  after_reapers:[2], swarm_in_eaves:[0, 1], ford_in_flood:[0],
  gentry_rent_arrears:[2]
};

async function activate(page, id) {
  return page.evaluate(function (bookmarkId) {
    return new Promise(function (resolve) {
      FB.activateBookmark(bookmarkId, null, function (error) {
        resolve(error ? String(error.message) : null);
      });
    });
  }, id);
}

test('shipped climate data is valid and every core bookmark keeps the calendar seasons',
  async function ({ page }, testInfo) {
    test.setTimeout(180 * 1000);
    await openGame(page, testInfo);
    const data = await page.evaluate(function () {
      return {
        faults:FB.validateClimateData(),
        geographyFaults:FB.validateGeography('europe_regional'),
        climate:FBDATA.geographies.europe_regional.climate,
        defaultZone:FBDATA.defaultClimateZone,
        southern:FBDATA.climateZones.southern_temperate.seasons,
        flags:Object.keys(FBDATA.seasonKinds).map(function (id) {
          const kind = FBDATA.seasonKinds[id];
          return [id, !!kind.hardship, !!kind.fairWeather];
        })
      };
    });
    expect(data.faults).toEqual([]);
    expect(data.geographyFaults).toEqual([]);
    expect(data.climate).toEqual({ zone:'northern_temperate', provinces:{} });
    expect(data.defaultZone).toBe('northern_temperate');
    expect(data.southern).toEqual(['autumn', 'winter', 'spring', 'summer']);
    expect(data.flags).toEqual([
      ['spring', false, true], ['summer', false, true],
      ['autumn', false, false], ['winter', true, false]
    ]);

    for (const id of ['867', '1066', '476']) {
      expect(await activate(page, id)).toBe(null);
      const parity = await page.evaluate(function (kinds) {
        const mismatches = [];
        FB.world.provs.forEach(function (pr) {
          if (FB.climateZoneOf(pr.id) !== 'northern_temperate') {
            mismatches.push(pr.id + ' zone ' + FB.climateZoneOf(pr.id));
          }
          for (let season = 0; season < 4; season++) {
            const state = { date:{ year:900, season:season, day:1 } };
            if (FB.localSeason(state, pr.id) !== kinds[season] ||
                FB.localSeasonHas(state, pr.id, 'hardship') !== (season === 3) ||
                FB.seasonKindHasAt(pr.id, season, 'fairWeather') !== (season < 2)) {
              mismatches.push(pr.id + ' season ' + season);
            }
          }
        });
        return { count:FB.world.provs.length, mismatches:mismatches.slice(0, 5) };
      }, KINDS);
      expect(parity.count).toBeGreaterThan(100);
      expect(parity.mismatches).toEqual([]);
    }
  });

test('shipped events use season kinds that reproduce their former calendar seasons',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(function (former) {
      const s = FB.state, savedSeason = s.date.season;
      const legacy = [], faults = [], converted = {}, mismatches = [];
      FBDATA.events.forEach(function (ev) {
        if (!ev.trigger) return;
        if (ev.trigger.seasons !== undefined) legacy.push(ev.id);
        const fault = FB.seasonKindTriggerFault(ev.trigger);
        if (fault) faults.push(ev.id + ': ' + fault);
        if (ev.trigger.seasonKinds) converted[ev.id] = ev.trigger.seasonKinds.slice();
      });
      try {
        Object.keys(former).forEach(function (id) {
          const kinds = converted[id];
          if (!kinds) { mismatches.push(id + ' has no seasonKinds'); return; }
          for (let season = 0; season < 4; season++) {
            s.date.season = season;
            const now = FB.checkTrigger(s, { seasonKinds:kinds }, {});
            const before = FB.checkTrigger(s, { seasons:former[id] }, {});
            if (now !== before) mismatches.push(id + ' season ' + season);
          }
        });
      } finally {
        s.date.season = savedSeason;
      }
      return {
        legacy:legacy, faults:faults, mismatches:mismatches,
        convertedIds:Object.keys(converted).sort()
      };
    }, FORMER_SEASON_TRIGGERS);
    expect(result.legacy).toEqual([]);
    expect(result.faults).toEqual([]);
    expect(result.mismatches).toEqual([]);
    expect(result.convertedIds).toEqual(Object.keys(FORMER_SEASON_TRIGGERS).sort());
  });

test('a southern zone moves winter supply drain and event winters to the other calendar half',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, pid = s.player.provinceId;
      const climate = FBDATA.geographies.europe_regional.climate;
      const neighbor = FB.world.provs.filter(function (pr) {
        return pr.id !== pid && !pr.wasteland;
      })[0].id;
      const savedSeason = s.date.season;
      const army = { realm:'player', at:pid, units:{} };
      function sample() {
        const out = { drain:[], localWinter:[], legacyWinter:[], neighbor:[], kinds:[] };
        for (let season = 0; season < 4; season++) {
          s.date.season = season;
          out.drain.push(FB.armyProvisionUse(s, army, pid, 0));
          out.localWinter.push(FB.checkTrigger(s, { seasonKinds:['winter'] }, {}));
          out.legacyWinter.push(FB.checkTrigger(s, { seasons:[3] }, {}));
          out.neighbor.push(FB.localSeasonHas(s, neighbor, 'hardship'));
          out.kinds.push(FB.localSeason(s, pid));
        }
        return out;
      }
      try {
        const north = sample();
        climate.provinces[pid] = 'southern_temperate';
        const south = sample();
        return { pid:pid, north:north, south:south,
          zone:FB.climateZoneOf(pid), faults:FB.validateGeography('europe_regional') };
      } finally {
        delete climate.provinces[pid];
        s.date.season = savedSeason;
      }
    });
    const north = result.north, south = result.south;
    expect(north.kinds).toEqual(['spring', 'summer', 'autumn', 'winter']);
    expect(south.kinds).toEqual(['autumn', 'winter', 'spring', 'summer']);
    expect(result.zone).toBe('southern_temperate');
    expect(result.faults).toEqual([]);

    // northern: only calendar Winter drains extra; southern: only calendar Summer
    expect(north.drain[3]).toBeGreaterThan(north.drain[1]);
    expect(north.drain[0]).toBe(north.drain[1]);
    expect(south.drain[1]).toBeGreaterThan(south.drain[3]);
    expect(south.drain[1]).toBeCloseTo(north.drain[3], 10);
    expect(south.drain[3]).toBeCloseTo(north.drain[1], 10);

    expect(north.localWinter).toEqual([false, false, false, true]);
    expect(south.localWinter).toEqual([false, true, false, false]);
    // the legacy index trigger keeps reading the calendar
    expect(south.legacyWinter).toEqual([false, false, false, true]);
    // other counties keep their own zone
    expect(south.neighbor).toEqual([false, false, false, true]);
  });

test('scheduled games open in the venue’s local fair-weather seasons',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, pid = s.player.provinceId, id = s.player.charId;
      const T = FB.tournaments, climate = FBDATA.geographies.europe_regional.climate;
      const savedSeason = s.date.season;
      function seasons(turns) {
        const out = {};
        turns.forEach(function (turn) { out[T.date(s, turn).season] = true; });
        return Object.keys(out).map(Number).sort();
      }
      try {
        // from Summer the 60 to 180 day notice window spans late Summer and Autumn
        s.date.season = 1;
        const north = T.dates(s, id, pid);
        climate.provinces[pid] = 'southern_temperate';
        const south = T.dates(s, id, pid);
        return { north:seasons(north), south:seasons(south),
          shared:north.filter(function (turn) { return south.indexOf(turn) >= 0; }).length };
      } finally {
        delete climate.provinces[pid];
        s.date.season = savedSeason;
      }
    });
    // northern venue: calendar Spring and Summer; southern: Autumn and Winter
    expect(result.north).toContain(1);
    expect(result.north.every(function (season) { return season < 2; })).toBe(true);
    expect(result.south).toContain(2);
    expect(result.south.every(function (season) { return season >= 2; })).toBe(true);
    expect(result.shared).toBe(0);
  });

test('the Land panel shows the county’s local season and zone',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, pid = s.player.provinceId;
      const climate = FBDATA.geographies.europe_regional.climate;
      const savedSeason = s.date.season;
      function fact() {
        FB.ui.selectProvince(pid);
        const rows = document.querySelectorAll('#tab-prov .land-kv');
        for (let i = 0; i < rows.length; i++) {
          const key = rows[i].querySelector('span');
          if (key && key.textContent.trim() === 'Local season') {
            return rows[i].querySelector('b').textContent.trim();
          }
        }
        return null;
      }
      try {
        s.date.season = 3;
        const north = fact();
        climate.provinces[pid] = 'southern_temperate';
        const south = fact();
        return { north:north, south:south, calendar:FB.seasonName(s.date.season) };
      } finally {
        delete climate.provinces[pid];
        s.date.season = savedSeason;
        FB.ui.selectProvince(pid);
      }
    });
    expect(result.north).toBe('Winter (Northern temperate)');
    expect(result.south).toBe('Summer (Southern temperate)');
    expect(result.calendar).toBe('Winter');
  });

test('mods add season kinds and zones, and invalid climate data is rejected',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      function rejected(mod) {
        try { FB.mods.apply(mod); return ''; }
        catch (error) { return error.message; }
      }
      const badZone = rejected({ climateZones:{
        broken:{ name:'Broken', seasons:['spring', 'summer', 'monsoon', 'winter'] } } });
      const shortZone = rejected({ climateZones:{
        short:{ name:'Short', seasons:['spring', 'summer'] } } });
      const badEvent = rejected({ events:[{ id:'e2e_monsoon_event', title:'Rain',
        text:'Rain.', trigger:{ seasonKinds:['monsoon'] }, options:[{ label:'Wait.' }] }] });
      const badGeography = rejected({ geographies:{ e2e_isle:{
        bounds:{ lonMin:120, lonMax:150, latMin:-46, latMax:-28 },
        land:[[125, -44, 145, -44, 145, -30, 125, -30]], gridWidth:900,
        provinces:[{ id:'e2e_bay', x:135, y:-35, terrain:'farmland' }],
        climate:{ zone:'nowhere', provinces:{} } } } });
      const unchanged = !FBDATA.climateZones.broken && !FBDATA.climateZones.short;

      FB.mods.apply({
        seasonKinds:{ e2e_wet:{ name:'Wet season', hardship:true },
          e2e_dry:{ name:'Dry season', fairWeather:true } },
        climateZones:{ e2e_savanna:{ name:'Savanna',
          seasons:['e2e_dry', 'e2e_wet', 'e2e_wet', 'e2e_dry'] } },
        geographies:{ e2e_isle:{
          bounds:{ lonMin:120, lonMax:150, latMin:-46, latMax:-28 },
          land:[[125, -44, 145, -44, 145, -30, 125, -30]], gridWidth:900,
          provinces:[{ id:'e2e_bay', x:135, y:-35, terrain:'farmland' },
            { id:'e2e_cape', x:140, y:-40, terrain:'hills' }],
          climate:{ zone:'southern_temperate', provinces:{ e2e_bay:'e2e_savanna' } } } },
        events:[{ id:'e2e_wet_event', title:'Rain', text:'Rain.',
          trigger:{ seasonKinds:['e2e_wet'], never:true }, options:[{ label:'Wait.' }] }]
      });
      const saved = FB.activeGeography;
      try {
        FB.activeGeography = FBDATA.geographies.e2e_isle;
        const out = { bay:[], cape:[] };
        for (let season = 0; season < 4; season++) {
          out.bay.push([FB.seasonKindAt('e2e_bay', season),
            FB.seasonKindHasAt('e2e_bay', season, 'hardship')]);
          out.cape.push(FB.seasonKindAt('e2e_cape', season));
        }
        return {
          badZone:badZone, shortZone:shortZone, badEvent:badEvent,
          badGeography:badGeography, unchanged:unchanged, seasons:out,
          faults:FB.validateClimateData(), geographyFaults:FB.validateGeography('e2e_isle'),
          name:FB.seasonKindName(FB.state, 'e2e_wet')
        };
      } finally {
        FB.activeGeography = saved;
      }
    });
    expect(result.badZone).toContain('needs four known season kinds');
    expect(result.shortZone).toContain('needs four known season kinds');
    expect(result.badEvent).toContain('unknown season kind monsoon');
    expect(result.badGeography).toContain('unknown zone nowhere');
    expect(result.unchanged).toBe(true);
    expect(result.faults).toEqual([]);
    expect(result.geographyFaults).toEqual([]);
    expect(result.seasons.bay).toEqual([
      ['e2e_dry', false], ['e2e_wet', true], ['e2e_wet', true], ['e2e_dry', false]
    ]);
    expect(result.seasons.cape).toEqual(['autumn', 'winter', 'spring', 'summer']);
    expect(result.name).toBe('Wet season');
  });
