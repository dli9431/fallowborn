'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/story_instances.js',
  'data/story_courts_476.js',
  'data/systems.js', 'data/eras.js', 'data/ambitions.js', 'data/economy.js', 'data/cultures.js',
  'data/papacy.js', 'data/tournaments.js', 'data/technology.js',
  'data/events_agency.js', 'data/events_artifacts.js', 'data/events_common.js',
  'data/events_communities.js', 'data/events_council.js', 'data/events_intrigue.js',
  'data/events_lifepaths.js', 'data/events_noble.js', 'data/events_parliament.js',
  'data/events_paths.js', 'data/events_peasant.js', 'data/events_politics.js',
  'data/events_settlements.js', 'data/events_tournament.js', 'data/events_travel.js',
  'data/events_tutorial.js', 'data/events_war.js', 'data/events_world.js',
  'js/events.js', 'js/world.js', 'js/ambitions.js', 'js/economy.js', 'js/model.js',
  'js/papacy.js', 'js/tournaments.js', 'js/save.js', 'js/mods.js', 'js/main.js',
  'js/ui_modals.js', 'js/ui_tournaments.js', 'js/story_courts.js',
  'js/fiscal.js', 'js/lordships.js', 'js/settlement.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { startParityGame } = require('../support/game/parity');
const { startGames, bookGames } = require('../support/game/tournaments');

for (const bookmark of ['867', '1066']) {
  test(bookmark + ' retains every original event, ambition defaults and papal seeds', async function ({ page }, testInfo) {
    await startParityGame(page, testInfo, {
      bookmark:bookmark, code:'PERIOD-' + bookmark + '-farmer-london-m-Period'
    });
    const result = await page.evaluate(function () {
      const s = FB.state, papacy = FB.ensurePapacy(s);
      return {
        excluded:FBDATA.events.filter(function (ev) {
          const pack = FBDATA.eventPacks[ev.pack];
          return pack && pack.eras.indexOf(s.start.era) >= 0 && !FB.eventPeriodEnabled(s, ev);
        }).map(function (ev) { return ev.id; }),
        established:Object.keys(s.historicalAmbitions).sort(),
        counts:papacy.regnalNameCounts,
        authority:papacy.obediences[papacy.romanObedience].authority
      };
    });
    expect(result.excluded).toEqual([]);
    expect(result.established).toEqual(bookmark === '867' ? [] : ['england', 'normandy', 'norway']);
    expect(result.counts).toEqual(bookmark === '867' ? {
      John:8, Benedict:3, Gregory:4, Leo:4, Stephen:5, Nicholas:1,
      Adrian:1, Alexander:0, Clement:2, Innocent:1, Urban:1,
      Paschal:1, Eugene:2, Victor:2, Lucius:1
    } : {
      John:19, Benedict:9, Gregory:6, Leo:9, Stephen:9, Nicholas:2,
      Adrian:1, Alexander:2, Clement:2, Innocent:2, Urban:1,
      Paschal:1, Eugene:2, Victor:2, Lucius:2
    });
    expect(result.authority).toBe(bookmark === '867' ? 65 : 55);
  });
}

test('476 packs explicitly declare membership and reject medieval direct and queued stories without RNG', async function ({ page }, testInfo) {
  await startParityGame(page, testInfo, {
    bookmark:'476', code:'PERIOD-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian'
  });
  const result = await page.evaluate(function () {
    const s = FB.state;
    const untagged = FBDATA.events.filter(function (ev) {
      return !ev.pack || !FBDATA.eventPacks[ev.pack] || !Array.isArray(FBDATA.eventPacks[ev.pack].eras);
    }).map(function (ev) { return ev.id; });
    const rng = FB.getRngState(), uid = FB.getUidCounter(), before = JSON.stringify(s);
    const blocked = ['guild_entry', 'old_custom_stakes', 'child_lineage_arms', 'historic_raid', 'artifact_rumor'].map(function (id) {
      const ev = FB.eventById(id);
      return !FB.eventPeriodEnabled(s, ev) && FB.queueEvent(s, id, {}) === null &&
        !FB.eventOptionStatus(s, ev, ev.options[0], {}).visible &&
        FB.resolveEventOption(s, ev, ev.options[0], {}) === false;
    });
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const shared = ['harvest', 'winter_fever', 'soldier_command_scouts', 'first_muster', 'manor_forfeit', 'annulment_plea', 'guild_monopoly_petition'].map(function (id) {
      return FB.eventPeriodEnabled(s, FB.eventById(id));
    });
    s.eventQueue = [{ id:'guild_entry', ctx:{} }]; s.slotDays = [];
    const queued = FB.pickDailyEvents(s).map(function (ev) { return ev.id; });
    return { untagged:untagged, blocked:blocked, shared:shared, pure:pure, queued:queued };
  });
  expect(result).toEqual({ untagged:[], blocked:[true,true,true,true,true],
    shared:[true,true,true,true,true,true,true], pure:true, queued:[] });
});

test('pack windows and event overrides enter and leave the random pool across years and restore', async function ({ page }, testInfo) {
  await openGame(page, testInfo); await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const s = FB.state, year = s.date.year;
    FBDATA.eventPacks.e2e_window = { eras:['early_medieval'], yearMin:year + 1, yearMax:year + 1 };
    const event = { id:'e2e_period_window', pack:'e2e_window', trigger:{ minAge:0 },
      title:'Window', text:'Window', options:[{ label:'Continue', effects:{ gold:3 } }] };
    const override = Object.assign({}, event, { id:'e2e_period_override', yearMin:year, yearMax:year });
    FBDATA.events = FBDATA.events.map(function (ev) {
      return Object.assign({}, ev, { trigger:{ never:true } });
    }).concat([event, override]);
    FB.invalidateEventIndex();
    function pick(state) {
      state.eventQueue = []; state.slotDays = [state.date.day];
      return FB.pickDailyEvents(state).map(function (ev) { return ev.id; });
    }
    const before = pick(s);
    const queuedBefore = FB.queueEvent(s, event.id, {});
    s.date.year++; // Same era, next live year, without an activation or manual invalidation.
    const inside = pick(s);
    const ctx = FB.eventContextFor(s, event, {});
    const saved = FB.save.parseExport(FB.save.exportState());
    FB.save.restore(saved);
    const afterRestore = pick(FB.state);
    FB.state.date.year++;
    const expired = pick(FB.state);
    const rng = FB.getRngState(), gold = FB.state.player.gold;
    const resolved = FB.resolveEventOption(FB.state, event, event.options[0], ctx);
    const stalePure = gold === FB.state.player.gold && rng === FB.getRngState();
    const expiredSaved = FB.save.parseExport(FB.save.exportState());
    FB.save.restore(expiredSaved);
    return { before:before, queuedBefore:queuedBefore, inside:inside, afterRestore:afterRestore,
      expired:expired, expiredRestore:pick(FB.state), resolved:resolved, stalePure:stalePure };
  });
  expect(result).toEqual({ before:['e2e_period_override'], queuedBefore:null,
    inside:['e2e_period_window'], afterRestore:['e2e_period_window'],
    expired:[], expiredRestore:[], resolved:false, stalePure:true });
});

test('a real annual tick refreshes a warmed event window', async function ({ page }, testInfo) {
  await openGame(page, testInfo); await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const s = FB.state, year = s.date.year;
    FBDATA.events.push({ id:'e2e_annual_window', eras:['early_medieval'], yearMin:year + 1,
      yearMax:year + 1, trigger:{ never:true }, options:[] });
    FB.invalidateEventIndex();
    function present() { return FB.eventYearPool(s).some(function (ev) { return ev.id === 'e2e_annual_window'; }); }
    const answers = [present()];
    FB.game.setPaused(true); FB.game.auto.all = true; FB.game.auto.style = 'first';
    s.eventQueue = []; s.slotDays = []; s.date.season = 3; s.date.day = 90;
    FB.game.passDay(); answers.push(present());
    s.eventQueue = []; s.slotDays = []; s.date.season = 3; s.date.day = 90;
    FB.game.passDay(); answers.push(present());
    return { answers:answers, year:s.date.year };
  });
  expect(result.answers).toEqual([false,true,false]);
  expect(result.year).toBe(869);
});

test('foundation dates use start year and legacy lists explicitly override dates', async function ({ page }, testInfo) {
  await openGame(page, testInfo); await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    function defaults(startYear, liveYear) {
      const s = Object.assign({}, FB.state, { start:{ id:'period_fixture', year:startYear },
        date:{ year:liveYear }, historicalAmbitions:{} });
      FB.ensureHistoricalAmbitions(s);
      return Object.keys(s.historicalAmbitions).sort();
    }
    const dates = [871,872,910,911,926,927,1129,1130].map(function (year) { return defaults(year,year); });
    const longCampaign = defaults(867,1200);
    const normandy = FBDATA.historicalAmbitions[0];
    normandy.established = [];
    const emptyOverride = defaults(1200,1200);
    normandy.established = ['period_fixture'];
    const explicitOverride = defaults(476,476);
    return { dates:dates, longCampaign:longCampaign, emptyOverride:emptyOverride, explicitOverride:explicitOverride };
  });
  expect(result.dates).toEqual([[],['norway'],['norway'],['normandy','norway'],
    ['normandy','norway'],['england','normandy','norway'],['england','normandy','norway'],
    ['england','normandy','norway','sicily']]);
  expect(result.longCampaign).toEqual([]);
  expect(result.emptyOverride).toEqual(['england','norway','sicily']);
  expect(result.explicitOverride).toEqual(['normandy']);
});

test('careers follow stamped era and live dates while saved careers remain recorded', async function ({ page }, testInfo) {
  await openGame(page, testInfo); await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const base = FB.state, c = base.chars[base.player.charId];
    const s = Object.assign({}, base, { start:{ id:'period_fixture', era:'late_antique', year:500 } });
    const civic = FB.careerChoices(s,c).some(function (choice) { return choice.id === 'civic_clerk'; });
    FBDATA.careers.civic_clerk.yearMin = base.date.year;
    FBDATA.careers.civic_clerk.yearMax = base.date.year;
    const accepted = FB.setCareer(s,c,'civic_clerk');
    s.date = Object.assign({}, base.date, { year:base.date.year + 1 });
    const expired = FB.setCareer(s,c,'civic_clerk');
    const hidden = !FB.careerChoices(s,c).some(function (choice) { return choice.id === 'civic_clerk'; });
    return { civic:civic, accepted:accepted, expired:expired, hidden:hidden,
      retained:FB.careerOf(s,c).profession };
  });
  expect(result).toEqual({ civic:true, accepted:true, expired:false, hidden:true, retained:'civic_clerk' });
});

test('eligible events cannot acquire unavailable careers or discard a civilian backup on rejection', async function ({ page }, testInfo) {
  await openGame(page, testInfo); await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, c = s.chars[p.charId], year = s.date.year;
    const career = FB.careerOf(s,c);
    career.experience = 17;
    c.careerHistory = { merchant:{ profession:'merchant', rank:'master', experience:31,
      startedYear:year - 4, guildRank:'member', guildStanding:24, chosen:true } };
    // Retained campaign service must survive a failed permanent acquisition.
    p.professionBack = career.profession;
    p.profession = 'soldier';
    const event = { id:'e2e_career_acquisition', eras:[FB.campaignEra(s)],
      trigger:{ minAge:0 }, title:'Career offer', text:'Career offer',
      options:[{ label:'Accept', effects:{ profession:'e2e_period_career', gold:3 } }] };
    FBDATA.events.push(event);
    FB.invalidateEventIndex();
    function snapshot() {
      return JSON.stringify({ profession:p.profession, back:p.professionBack,
        career:c.career, history:c.careerHistory, guild:p.flags.guild_member || null });
    }
    const base = Object.assign({}, FBDATA.careers.farmer, { requiresTech:null });
    const trials = [
      { yearMin:year + 1 }, { yearMax:year - 1 }, { eras:['late_antique'] },
      { maleOnly:true }, { bookmarkIds:['missing_bookmark'] }
    ].map(function (gate) {
      FBDATA.careers.e2e_period_career = Object.assign({}, base, gate);
      const before = snapshot(), gold = p.gold;
      const receipt = FB.resolveEventOption(s,event,event.options[0],{});
      return { resolved:!!receipt, preserved:snapshot() === before, gold:p.gold - gold,
        professionImpact:receipt.impacts.some(function (row) { return row.type === 'profession'; }) };
    });
    FBDATA.careers.e2e_period_career = Object.assign({}, base, { yearMin:year, yearMax:year });
    const receipt = FB.resolveEventOption(s,event,event.options[0],{});
    return { trials:trials, accepted:!!receipt, profession:p.profession,
      recorded:c.career.profession, back:p.professionBack, rank:c.career.rank,
      archived:c.careerHistory[career.profession].experience };
  });
  expect(result.trials).toEqual(Array(5).fill({ resolved:true, preserved:true, gold:3, professionImpact:false }));
  expect(result.accepted).toBe(true);
  expect(result.profession).toBe('e2e_period_career');
  expect(result.recorded).toBe(result.profession);
  expect(result.back).toBeNull();
  expect(result.rank).toBe('journeyman');
  expect(result.archived).toBe(17);
});

test('campaign profession effects respect career periods and restore the unchanged civilian career', async function ({ page }, testInfo) {
  await openGame(page, testInfo); await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, c = s.chars[p.charId], year = s.date.year;
    FB.careerOf(s,c).experience = 23;
    const civilian = JSON.stringify(c.career), profession = p.profession;
    const base = Object.assign({}, FBDATA.careers.soldier, { requiresTech:null, maleOnly:false });
    const results = ['setFlag','setFlag2'].map(function (flagKey) {
      const fx = { profession:'e2e_period_service' };
      fx[flagKey] = 'on_campaign';
      const blocked = [{ yearMin:year + 1 }, { yearMax:year - 1 }, { eras:['late_antique'] }].map(function (gate) {
        FBDATA.careers.e2e_period_service = Object.assign({}, base, gate);
        const back = p.professionBack;
        const ledger = FB.applyEffects(s,fx,{});
        return p.profession === profession && p.professionBack === back &&
          JSON.stringify(c.career) === civilian &&
          !ledger.some(function (row) { return row.type === 'profession'; });
      });
      FBDATA.careers.e2e_period_service = Object.assign({}, base, { yearMin:year, yearMax:year });
      FB.applyEffects(s,fx,{});
      const accepted = p.profession === 'e2e_period_service' && p.professionBack === profession &&
        JSON.stringify(c.career) === civilian;
      // An acquired occupation remains restorable after its service window closes.
      FBDATA.careers.e2e_period_service.yearMax = year - 1;
      FB.applyEffects(s,{ restoreProfession:true, clearFlag:'on_campaign' },{});
      return { blocked:blocked, accepted:accepted, restored:p.profession === profession &&
        p.professionBack === null && JSON.stringify(c.career) === civilian };
    });
    // Lazy career creation must record the old profession before acquisition.
    delete c.career;
    c.careerHistory = {};
    FBDATA.careers.e2e_period_service = base;
    FB.applyEffects(s,{ profession:'e2e_period_service' },{});
    return { results:results, lazyArchived:c.careerHistory[profession].profession,
      lazyRecorded:c.career.profession, lazyMirror:p.profession };
  });
  expect(result.results).toEqual([
    { blocked:[true,true,true], accepted:true, restored:true },
    { blocked:[true,true,true], accepted:true, restored:true }
  ]);
  expect(result.lazyArchived).toBe('farmer');
  expect(result.lazyRecorded).toBe('e2e_period_service');
  expect(result.lazyMirror).toBe(result.lazyRecorded);
});

test('year tables, papal institution milestones and tournament thresholds read authored dates', async function ({ page }, testInfo) {
  await openGame(page, testInfo); await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const rows = FBDATA.papacy.regnalSeeds;
    const seeds = [500,866,867,950,1065,1066,1200].map(function (year) {
      const row = FB.yearTableEntry(rows,year); return row && row.counts.John;
    });
    const milestones = Object.keys(FBDATA.papacy.institutions).map(function (id) {
      const from = FBDATA.papacy.institutions[id].from;
      return [FB.papalInstitutionActive({ date:{ year:from - 1 } },id),
        FB.papalInstitutionActive({ date:{ year:from } },id)];
    });
    const s = Object.assign({}, FB.state, { date:{ year:1050 } });
    const home = s.player.provinceId, sovereign = FB.topRealm(s,s.holder[home] || s.owner[home]);
    s.realmTech = Object.assign({},s.realmTech);
    s.realmTech[sovereign] = { completed:['cavalry_lances'] };
    FBDATA.tournaments.programmes.lists.yearMin = 1050;
    const changed = FB.tournaments.defaultProgramme(s,s.player.charId,{ provinceId:home });
    s.date.year = 1049;
    return { seeds:seeds, milestones:milestones, changed:changed,
      earlier:FB.tournaments.defaultProgramme(s,s.player.charId,{ provinceId:home }) };
  });
  expect(result.seeds).toEqual([null,7,8,8,8,19,19]);
  expect(result.milestones).toEqual([[false,true],[false,true],[false,true],[false,true],[false,true]]);
  expect(result.changed).toBe('lists'); expect(result.earlier).toBe('martial');
});

test('era name lists inherit, fall back by sex and use campaign identity after restore', async function ({ page }, testInfo) {
  await openGame(page, testInfo); await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const s = FB.state;
    FBDATA.cultures.frankish.nameEras = { late_antique:{ male:['Periodus'] } };
    FB.invalidateCultureData();
    s.cultures.e2e_period_child = { name:'Period child', parent:'frankish', nameEras:{ late_antique:{ female:['Perioda'] } } };
    FB.configureCultures(s);
    const trial = Object.assign({}, s, { start:{ id:'period_fixture', era:'late_antique', year:500 } });
    const names = [FB.randomName('e2e_period_child','m',null,trial), FB.randomName('e2e_period_child','f',null,trial)];
    const baseFallback = FB.cultureNamePool('frankish','f',trial);
    const medievalFallback = FB.cultureNamePool('e2e_period_child','m',s);
    const savedName = s.chars[s.player.charId].name;
    const saved = FB.save.parseExport(FB.save.exportState()); FB.save.restore(saved);
    return { names:names, baseFallback:baseFallback,
      expectedFemale:FBDATA.cultures.frankish.female, medievalFallback:medievalFallback,
      expectedMale:FBDATA.cultures.frankish.male,
      retained:FB.state.chars[FB.state.player.charId].name === savedName,
      generated:FB.cultureNamePool('e2e_period_child','f',Object.assign({},FB.state,{ start:trial.start })) };
  });
  expect(result.names).toEqual(['Periodus','Perioda']);
  expect(result.baseFallback).toEqual(result.expectedFemale);
  expect(result.medievalFallback).toEqual(result.expectedMale);
  expect(result.retained).toBe(true); expect(result.generated).toEqual(['Perioda']);
});

test('invalid periods and dated tables reject mods before mutating any data', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const result = await page.evaluate(function () {
    const badPapal = JSON.parse(JSON.stringify(FBDATA.papacy));
    badPapal.regnalSeeds.reverse();
    const trials = [
      { events:[{ id:'e2e_bad', eras:['missing'], trigger:{never:true}, options:[] }] },
      { events:[{ id:'e2e_bad', yearMin:900, yearMax:800, trigger:{never:true}, options:[] }] },
      { eventPacks:{ e2e_bad:{ yearMin:500 } } },
      { eventPacks:{ e2e_bad:{ eras:['early_medieval'] } }, events:[{ id:'e2e_bad', pack:'missing', trigger:{never:true}, options:[] }] },
      { eventPacks:{ e2e_bad:{ eras:['early_medieval'], yearMax:1000 } }, events:[{ id:'e2e_bad', pack:'e2e_bad', yearMin:1100, trigger:{never:true}, options:[] }] },
      { careers:{ e2e_bad:{ role:'civic', eras:['missing'] } } },
      { cultures:{ frankish:{ nameEras:{ late_antique:{ male:[] } } } } },
      { papacy:badPapal }
    ];
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const rejected = trials.map(function (mod) {
      try { FB.mods.apply(mod); return false; } catch (error) { return !!error.message; }
    });
    return { rejected:rejected, pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result).toEqual({ rejected:[true,true,true,true,true,true,true,true], pure:true });
});

test('booking rejects an expired activity while funded editions retain their contests', async function ({ page }, testInfo) {
  const ids = await startGames(page,testInfo);
  const gameId = await bookGames(page,ids,false);
  const result = await page.evaluate(function (id) {
    const s = FB.state, e = FB.tournaments.get(s,id);
    const original = { programme:e.programme, contests:Object.keys(e.contests), funding:e.funding.total };
    const reviewed = FB.tournaments.quote(s,{hostId:s.player.charId,provinceId:s.player.provinceId,
      settlement:0,scale:'local',programme:'martial',startTurn:s.turn+90});
    FBDATA.tournaments.programmes.martial.yearMax = s.date.year - 1;
    const gold = s.player.gold, rng = FB.getRngState();
    const quote = FB.tournaments.quote(s,reviewed);
    const booked = FB.tournaments.book(s,reviewed);
    const retained = FB.tournaments.get(s,id);
    return { expired:quote.reasons.indexOf(FB.T('This programme is unavailable in the current period.')) >= 0,
      booked:booked, pure:s.player.gold === gold && FB.getRngState() === rng,
      unchanged:JSON.stringify(original) === JSON.stringify({programme:retained.programme,
        contests:Object.keys(retained.contests),funding:retained.funding.total}) };
  },gameId);
  expect(result).toEqual({expired:true,booked:false,pure:true,unchanged:true});
});

test('the hosting form shows only programmes in the authored period', async function ({ page }, testInfo) {
  await startGames(page,testInfo);
  await page.evaluate(function () { FB.ui.showHostGames(); });
  const values = async function () {
    return page.locator('#games-programmes option').evaluateAll(function (rows) {
      return rows.map(function (row) { return row.value; });
    });
  };
  expect(await values()).toEqual(['martial','mounted']);
  await page.evaluate(function () {
    FBDATA.tournaments.programmes.lists.yearMin = FB.state.date.year;
    FB.ui.showHostGames();
  });
  expect(await values()).toEqual(['martial','mounted','lists']);
});

test('the papal College label follows institution data in an unchanged campaign year', async function ({ page }, testInfo) {
  await openGame(page,testInfo); await startDeterministicGame(page);
  await page.evaluate(function () { FB.ui.showPapacy(); });
  await expect(page.locator('#gm-body')).toContainText('Cardinal electors');
  await page.evaluate(function () {
    FBDATA.papacy.institutions.college_offices.from = FB.state.date.year;
    FB.ui.showPapacy();
  });
  await expect(page.locator('#gm-body')).toContainText('College of Cardinals');
  await expect(page.locator('#gm-body')).not.toContainText('Cardinal electors');
});
