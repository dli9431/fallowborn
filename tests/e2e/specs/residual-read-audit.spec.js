'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const probe = require('../fixtures/residual-read-audit/probe');
const sources = probe.paths.map(function (file) { return fs.readFileSync(path.resolve(__dirname,'../../..',file),'utf8'); });

dependsOnRuntime(__filename, ['js/model.js','js/world.js','js/government_aristocracy.js','js/government_recognition.js',
  'js/mobile_command.js','js/mobile_guard.js','js/justice.js',
  'js/religion.js','js/religious_institutions.js','js/papacy.js','js/lordships.js','js/wars.js',
  'js/government_selection.js','js/mobile_confederations.js','js/governments.js','js/government_support.js',
  'js/government_ecclesiastical.js','js/ecclesiastical_strategies.js','js/authority.js','js/actions.js',
  'js/treasury.js','js/lordships.js','js/main.js','js/politics.js','js/systems.js','js/save.js','js/save_v4.js','js/mods.js']);

const starts = [
  {bookmark:'476', scenario:'mobile_household_476', code:'MEASURE-476-mobile_household_476-cherson-m-Measure'},
  {bookmark:'476', scenario:'peroz_sasanian_476', code:'MEASURE-476-peroz_sasanian_476-baghdad-m-Peroz'},
  {bookmark:'1096', scenario:'yaghi_siyan_1096', code:'MEASURE-1096-yaghi_siyan_1096-antioch-m-YaghiSiyan'},
  {bookmark:'1096', scenario:'bohemond_1096', code:'MEASURE-1096-bohemond_1096-taranto-m-Bohemond'},
  {bookmark:'1204', scenario:'muhammad_1204', code:'MEASURE-1204-muhammad_1204-gurganj_district-m-Muhammad_II'}
];

async function route(page,enabled) {
  for (let i = 0; i < probe.paths.length; i++) {
    const file = probe.paths[i];
    await page.unroute('**/' + file);
    if (enabled) await page.route('**/' + file,function (request) {
      return request.fulfill({contentType:'application/javascript',body:probe.instrument(file,sources[i])});
    });
  }
}

async function begin(page,info,start) {
  await openGame(page,info);
  await page.evaluate(function (start) {
    const scenario = FBDATA.startScenarios.find(function (row) { return row.id === start.scenario; });
    if (!scenario) throw new Error('Missing audit start');
    scenario.hidden = false;
    const bookmark = [FB.bookmark(start.bookmark)].concat(FB.bookmarkRevisions(start.bookmark)).find(function (row) {
      return (!row.starts || row.starts.indexOf(start.scenario) >= 0) &&
        row.provinces.some(function (p) { return FB.startProvinceAllowed(scenario,row,p.id); });
    });
    if (!bookmark) throw new Error('No compatible audit opening');
    FBDATA.bookmarks[start.bookmark].hidden = false;
    FBDATA.bookmarks[start.bookmark].revision = bookmark.revision;
    FB.startProgression.noteTier(3);
  },start);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(start.code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await page.evaluate(function () {
    FB.game.setPaused(true);
    Object.assign(FB.game.auto,{minor:false,major:false,war:false,all:true,style:'first',hosts:'manual',
      hostResupply:true,buySupplies:true,forceSupplies:false,supplyTarget:75,build:false,research:false,researchMode:'cheapest'});
    FB.game.uiPrefs.hideTips = true; FB.game.uiPrefs.hideBeginnerHints = true;
    if (FB.ui.coachmarkReset) FB.ui.coachmarkReset();
    delete FB.state.player.flags.tutorial;
  });
}

for (const start of starts) {
  test('read audit preserves ordinary and staged boundary outputs for ' + start.scenario, async function ({page},info) {
    const outputs = [], evidence = [];
    for (const enabled of [false,true]) {
      await route(page,enabled);
      await begin(page,info,start);
      if (enabled) await page.evaluate(probe.install);
      const result = await page.evaluate(async function () {
        async function hash(text) {
          const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
          return Array.from(new Uint8Array(bytes)).map(function (n) { return n.toString(16).padStart(2,'0'); }).join('');
        }
        const p = window.__residualReadAudit, states = [], counts = [];
        try {
          for (const phase of ['ordinary','season','year']) {
            const s = FB.state;
            if (phase !== 'ordinary') {
              const season = phase === 'year' ? 3 : s.date.season;
              s.turn += (season - s.date.season) * 90 + 90 - s.date.day;
              s.date.season = season; s.date.day = 90;
            }
            if (p) p.reset();
            const turn = s.turn;
            FB.game.passDay({deferUi:true});
            if (s.turn !== turn + 1) throw new Error('Unexpected audit advancement');
            if (p) counts.push({phase:phase,report:p.snapshot()});
            states.push({phase:phase, turn:s.turn, date:JSON.parse(JSON.stringify(s.date)), state:await hash(JSON.stringify(s)),
              save:await hash(FB.save.serialize()),data:await hash(JSON.stringify(FBDATA)),
              rng:FB.getRngState(),uid:FB.getUidCounter(),signature:FB.mods.sig(),
              fingerprint:FB.mods.fingerprint(FB.campaignBookmark(s))});
          }
        } finally { if (p) p.stop(); }
        return {states:states,counts:counts,stopped:!window.__residualReadAudit};
      });
      expect(result.stopped).toBe(true);
      outputs.push(result.states); evidence.push(result.counts);
    }
    expect(outputs[1]).toEqual(outputs[0]);
    for (const row of evidence[1]) {
      expect(row.report.total.officeEntries).toBeGreaterThan(0);
      expect(row.report.total.mobileEntries).toBeGreaterThan(0);
      expect(row.report.total.mobileFilterArrays).toBe(0);
    }
    await info.attach('read-audit-counts',{body:JSON.stringify({start:start,phases:evidence[1]}),contentType:'application/json'});
  });
}

test('read audit detects repeated index inputs, edits and cleanup without caching answers', async function ({page},info) {
  await route(page,true);
  await begin(page,info,starts[1]);
  await page.evaluate(probe.install);
  const result = await page.evaluate(function () {
    const s = FB.state, p = window.__residualReadAudit, A = FB.aristocracy;
    const officeReader = FB.localInstitutionOfficeInputs, active = FB.mobile.active;
    const campaign = FB.campaignBookmark, leader = FB.mobile.leader;
    const before = JSON.stringify(s), data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const rid = Object.keys(s.authority.governments).find(function (id) { const row = A.state(s,id); return row && row.interests.length >= 2; });
    if (!rid) throw new Error('No indexed constituency');
    try {
      p.reset();
      p.query('control',s,function () { A.constituency(s,rid); A.constituency(s,rid); });
      const equal = p.snapshot();
      p.reset();
      const row = s.authority.rights[0], id = row.id;
      try {
        p.query('control',s,function () { A.constituency(s,rid); row.id = id + '_edited'; A.constituency(s,rid); });
      } finally { row.id = id; }
      const changed = p.snapshot();
      p.reset(); FB.religiousOffices(s); const office = p.snapshot();
      p.reset();
      const appointments = s.authority.appointments.length, rights = s.authority.rights.length;
      A.withFiscalRead(s,{},function () {
        p.query('fiscal-control',s,function () { A.constituency(s,rid); A.constituency(s,rid); });
      });
      const fiscal = p.snapshot();
      p.reset();
      p.query('control',s,function () { FB.realmIdForRulerCharacter(s,s.chars[s.player.charId]); FB.realmIdForRulerCharacter(s,s.chars[s.player.charId]); });
      const mobile = p.snapshot();
      p.reset();
      try { p.query('error-control',s,function () { throw new Error('audit-sentinel'); }); }
      catch (error) { if (error.message !== 'audit-sentinel') throw error; }
      const error = p.snapshot();
      try {
        FB.localInstitutionOfficeInputs = function () { throw new Error('office-sentinel'); };
        try { FB.religiousOffices(s); throw new Error('Missing office error'); }
        catch (e) { if (e.message !== 'office-sentinel') throw e; }
      } finally { FB.localInstitutionOfficeInputs = officeReader; }
      p.reset();
      try {
        FB.mobile.active = function () { throw new Error('mobile-sentinel'); };
        try { FB.realmIdForRulerCharacter(s,s.player.charId); throw new Error('Missing mobile error'); }
        catch (e) { if (e.message !== 'mobile-sentinel') throw e; }
      } finally { FB.mobile.active = active; }
      p.reset();
      return {equal:equal,changed:changed,office:office,fiscal:fiscal,appointments:appointments,rights:rights,mobile:mobile,error:error,
        nativeReaders:campaign === FB.campaignBookmark && leader === FB.mobile.leader,
        pure:before === JSON.stringify(s) && data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    } finally { p.stop(); }
  });
  expect(result.equal.scopes.control.equivalentIndexRepeats).toBe(1);
  expect(result.changed.scopes.control.equivalentIndexRepeats).toBe(0);
  expect(result.changed.scopes.control.changedIndexInputs).toBe(1);
  expect(result.office.total.officeWorldReads).toBe(1);
  expect(result.office.total.officeWorldRepeats).toBe(0);
  expect(result.equal.total.indexCalls).toBe(2);
  expect(result.equal.total.indexBuilds).toBe(2);
  expect(result.equal.total.indexValidations).toBe(0);
  expect(result.fiscal.total.indexCalls).toBe(2);
  expect(result.fiscal.total.indexBuildAttempts).toBe(1);
  expect(result.fiscal.total.indexBuilds).toBe(1);
  expect(result.fiscal.total.indexValidations).toBe(1);
  expect(result.fiscal.total.indexReuses).toBe(1);
  expect(result.fiscal.scopes['fiscal-control'].ownedIndexCalls).toBe(0);
  expect(result.fiscal.scopes.constituency.ownedIndexCalls).toBe(2);
  expect(result.fiscal.scopes['fiscal-control'].indexCalls).toBe(2);
  expect(result.fiscal.total.appointmentSlots).toBe(result.appointments);
  expect(result.fiscal.total.rightSlots).toBe(result.rights);
  expect(result.fiscal.total.appointmentRows).toBe(result.appointments);
  expect(result.fiscal.total.rightRows).toBe(result.rights);
  expect(result.fiscal.total.appointmentValidationSlots).toBe(result.appointments);
  expect(result.fiscal.total.rightValidationSlots).toBe(result.rights);
  expect(result.fiscal.total.appointmentValidationRows).toBe(result.appointments);
  expect(result.fiscal.total.rightValidationRows).toBe(result.rights);
  expect(result.mobile.scopes.control.repeatedCharacterQueries).toBeGreaterThan(0);
  expect(result.error.scopes['error-control'].errors).toBe(1);
  expect(result.pure).toBe(true);
  expect(result.nativeReaders).toBe(true);
  expect(await page.evaluate(function () { return !window.__residualReadAudit; })).toBe(true);
  await info.attach('read-audit-controls',{body:JSON.stringify(result),contentType:'application/json'});
});

test('read audit separates mature ledger validation from repeated mobile scans', async function ({page},info) {
  await route(page,true);
  await begin(page,info,starts[0]);
  await page.addScriptTag({path:path.resolve(__dirname,'../fixtures/government-query-reuse/probe.js')});
  await page.evaluate(probe.install);
  const result = await page.evaluate(function () {
    const s = FB.state, p = window.__residualReadAudit, A = FB.aristocracy, rid = 'sasanian_476';
    const rows = [];
    try {
      for (const history of [0,256]) {
        if (history) GOV_QUERY.history(s,rid,history);
        const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
        p.reset();
        A.withFiscalRead(s,{},function () { A.constituency(s,rid); A.constituency(s,rid); });
        FB.realmIdForRulerCharacter(s,s.player.charId);
        FB.realmIdForRulerCharacter(s,s.player.charId);
        rows.push({history:history,appointments:s.authority.appointments.length,rights:s.authority.rights.length,
          governments:Object.keys(s.authority.governments).length,report:p.snapshot()});
        if (before !== JSON.stringify(s) || rng !== FB.getRngState() || uid !== FB.getUidCounter()) throw new Error('Impure mature read');
      }
    } finally { p.stop(); }
    return rows;
  });
  for (const row of result) {
    const c = row.report.total;
    expect(c.indexCalls).toBe(2);
    expect(c.indexBuilds).toBe(1);
    expect(c.indexValidations).toBe(1);
    expect(c.indexReuses).toBe(1);
    expect(c.appointmentRows).toBe(row.appointments);
    expect(c.rightRows).toBe(row.rights);
    expect(c.appointmentValidationRows).toBe(row.appointments);
    expect(c.rightValidationRows).toBe(row.rights);
    expect(c.mobileEntries).toBe(2);
    expect(c.mobileFilterArrays).toBe(0);
    expect(c.mobileSlots).toBe(2 * row.governments);
  }
  expect(result[1].appointments - result[0].appointments).toBe(256);
  expect(result[1].rights - result[0].rights).toBe(256);
  expect(result[1].report.total.mobileSlots).toBe(result[0].report.total.mobileSlots);
  await info.attach('mature-read-counts',{body:JSON.stringify(result),contentType:'application/json'});
});

test('read audit rejects missing and duplicate source markers', function () {
  for (let i = 0; i < probe.paths.length; i++) {
    const file = probe.paths[i], source = sources[i];
    expect(function () { probe.instrument(file,''); }).toThrow('Read audit source marker changed: ' + file);
    expect(function () { probe.instrument(file,source + '\n' + source); }).toThrow('Read audit source marker changed: ' + file);
  }
});

test('mobile boundary audit records guard reads and complete owner sizes', async function ({page},info) {
  await route(page,true);
  await begin(page,info,starts[0]);
  await page.evaluate(probe.install);
  const result = await page.evaluate(function () {
    const s = FB.state, p = window.__residualReadAudit, M = FB.mobile;
    const guard = FB.characterGuarded, leader = M.leader, campaign = FB.campaignBookmark;
    const enter = p.enterMobile, leave = p.leaveMobile;
    let depth = 0, guards;
    function facts() {
      const authority = s.authority || {}, governments = authority.governments || {};
      const mobile = Object.keys(governments).filter(function (id) { return governments[id].mobile; }).map(function (id) {
        const row = governments[id].mobile;
        return {realm:id,form:governments[id].formId,leader:row.leaderId,status:row.status,
          members:row.members.length,command:row.command || null,guard:row.guardedParty || null};
      });
      const owners = {state:s,characters:s.chars,realms:s.realms,governments:governments,
        appointments:authority.appointments || [],rights:authority.rights || [],
        migrations:authority.migrations || [],institutions:s.localInstitutions || {},
        armies:s.armies || [],captives:s.intrigue && s.intrigue.captives || []};
      const sizes = {};
      for (const name of Object.keys(owners)) sizes[name] = new TextEncoder().encode(JSON.stringify(owners[name])).length;
      return {turn:s.turn,date:JSON.parse(JSON.stringify(s.date)),rng:FB.getRngState(),uid:FB.getUidCounter(),
        characters:Object.keys(s.chars).length,livingCharacters:Object.keys(s.chars).filter(function (id) { return !s.chars[id].dead; }).length,
        realms:Object.keys(s.realms).length,governments:Object.keys(governments).length,mobile:JSON.parse(JSON.stringify(mobile)),
        appointments:owners.appointments.length,rights:owners.rights.length,migrations:owners.migrations.length,
        institutions:Object.keys(owners.institutions).length,armies:owners.armies.length,captives:owners.captives.length,bytes:sizes};
    }
    // Observe the probe's frames, without replacing the native leader identity.
    p.enterMobile = function () { const frame = enter.apply(this,arguments); depth++; return frame; };
    p.leaveMobile = function () { try { return leave.apply(this,arguments); } finally { depth--; } };
    FB.characterGuarded = function () {
      guards.calls++;
      if (depth) guards.inMobileRead++;
      const value = guard.apply(this,arguments);
      if (value) guards.guarded++;
      return value;
    };
    const phases = [];
    try {
      const identity = {version:FB.VERSION,start:JSON.parse(JSON.stringify(s.start)),
        signature:FB.mods.sig(),fingerprint:FB.mods.fingerprint(FB.campaignBookmark(s)),userAgent:navigator.userAgent};
      for (const phase of ['ordinary','season','year']) {
        if (phase !== 'ordinary') {
          const season = phase === 'year' ? 3 : s.date.season;
          s.turn += (season-s.date.season)*90+90-s.date.day;
          s.date.season = season; s.date.day = 90;
        }
        const before = facts();
        guards = {calls:0,inMobileRead:0,guarded:0}; p.reset();
        const start = performance.now();
        FB.game.passDay({deferUi:true});
        const instrumentedMs = performance.now()-start;
        phases.push({phase:phase,days:s.turn-before.turn,instrumentedMs:instrumentedMs,
          before:before,after:facts(),guards:guards,report:p.snapshot()});
      }
      return {identity:identity,phases:phases,nativeReaders:leader === M.leader && campaign === FB.campaignBookmark,depth:depth};
    } finally {
      FB.characterGuarded = guard; p.enterMobile = enter; p.leaveMobile = leave; p.stop();
    }
  });
  result.browser = page.context().browser().version();
  expect(result.nativeReaders).toBe(true);
  expect(result.depth).toBe(0);
  for (const row of result.phases) {
    expect(row.days).toBe(1);
    expect(row.report.cadences[row.phase].days).toBe(1);
    expect(row.report.total.mobileFilterArrays).toBe(0);
    // Inside a simulated day the coalition rows are listed once instead of scanned per read.
    expect(row.report.total.mobileSlots).toBeLessThanOrEqual(row.report.total.mobileEntries * row.before.governments);
    expect(row.guards.calls).toBeGreaterThan(0);
    expect(row.guards.inMobileRead).toBeGreaterThan(0);
    expect(row.guards.inMobileRead).toBeLessThanOrEqual(row.guards.calls);
    expect(row.before.bytes.state).toBeGreaterThan(row.before.bytes.governments);
    expect(row.after.bytes.rights).toBeGreaterThan(0);
    expect(row.instrumentedMs).toBeGreaterThanOrEqual(0);
  }
  expect(await page.evaluate(function () { return !window.__residualReadAudit; })).toBe(true);
  await info.attach('mobile-boundary-owners',{body:JSON.stringify(result),contentType:'application/json'});
});

test('Muhammad autumn audit preserves staged days and attributes native read owners', async function ({page},info) {
  const office = require('../fixtures/religious-office-tables/lookup-probe');
  const structure = require('../fixtures/office-lookup-probe/structure');
  const parity = [], samples = [];
  for (const enabled of [false,true]) {
    for (let i = 0; i < probe.paths.length; i++) {
      const file = probe.paths[i];
      await page.unroute('**/' + file);
      if (enabled) {
        let body = probe.instrument(file,sources[i]);
        if (file === 'js/model.js') body = structure.instrument(office.instrument(body));
        await page.route('**/' + file,function (request) {
          return request.fulfill({contentType:'application/javascript',body:body});
        });
      }
    }
    await begin(page,info,starts[4]);
    if (enabled) {
      await page.evaluate(probe.install);
      await page.evaluate(office.install);
      await page.evaluate(structure.install);
    }
    const result = await page.evaluate(async function () {
      async function hash(text) {
        const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
        return Array.from(new Uint8Array(bytes)).map(function (n) { return n.toString(16).padStart(2,'0'); }).join('');
      }
      const s = FB.state, p = window.__residualReadAudit, o = window.__officeLookupProbe;
      const scans = window.__officeStructureProbe, fiscal = FB.aristocracy.withFiscalRead;
      const leader = FB.mobile.leader, campaign = FB.campaignBookmark;
      const outputs = [], readings = [];
      let fiscalScopes = 0;
      function facts() {
        const a = s.authority || {}, governments = a.governments || {};
        const owners = {state:s,characters:s.chars,realms:s.realms,governments:governments,
          appointments:a.appointments || [],rights:a.rights || [],recognitions:a.recognitions || [],
          institutions:s.localInstitutions || {},armies:s.armies || [],
          migrations:a.migrations || [],captives:s.intrigue && s.intrigue.captives || []};
        const bytes = {};
        for (const name of Object.keys(owners)) bytes[name] = new TextEncoder().encode(JSON.stringify(owners[name])).length;
        const bookmark = FB.campaignBookmark(s), local = FB.localInstitutionDefinitions(s);
        return {turn:s.turn,date:JSON.parse(JSON.stringify(s.date)),rng:FB.getRngState(),uid:FB.getUidCounter(),
          characters:Object.keys(s.chars).length,livingCharacters:Object.keys(s.chars).filter(function (id) { return !s.chars[id].dead; }).length,
          realms:Object.keys(s.realms).length,governments:Object.keys(governments).length,
          mobile:JSON.parse(JSON.stringify(Object.keys(governments).filter(function (id) { return governments[id].mobile; }).map(function (id) {
            const row = governments[id].mobile;
            return {realm:id,leader:row.leaderId,status:row.status,members:row.members.length,
              command:row.command || null,guard:row.guardedParty || null};
          }))),appointments:owners.appointments.length,rights:owners.rights.length,recognitions:owners.recognitions.length,
          institutions:Object.keys(owners.institutions).length,armies:owners.armies.length,migrations:owners.migrations.length,
          captives:owners.captives.length,activeWars:Object.keys(s.wars || {}).filter(function (id) {
            return s.wars[id] && s.wars[id].status === 'active';
          }).length,
          localDefinitions:Object.keys(local).length,openingRealms:bookmark.realms.length,
          openingProvinces:bookmark.provinces.length,openingHeadKeys:Object.keys(bookmark.religiousHeads || {}).length,bytes:bytes};
      }
      if (p) FB.aristocracy.withFiscalRead = function () { fiscalScopes++; return fiscal.apply(this,arguments); };
      try {
        const identity = {version:FB.VERSION,start:JSON.parse(JSON.stringify(s.start)),seed:s.seed,
          signature:FB.mods.sig(),fingerprint:FB.mods.fingerprint(FB.campaignBookmark(s)),userAgent:navigator.userAgent};
        // Stage dates directly; the intervening days and campaign growth are not simulated.
        for (const stage of [{name:'autumn-entry',season:1,day:90},{name:'autumn-ordinary',season:2,day:45},
          {name:'autumn-exit',season:2,day:90}]) {
          s.turn += (stage.season-s.date.season)*90+stage.day-s.date.day;
          s.date.season = stage.season; s.date.day = stage.day;
          const before = facts();
          if (p) { p.reset(); o.reset(); scans.reset(); fiscalScopes = 0; }
          const started = performance.now();
          FB.game.passDay({deferUi:true});
          const diagnosticMs = performance.now()-started;
          if (p) readings.push({stage:stage.name,diagnosticMs:diagnosticMs,fiscalScopes:fiscalScopes,
            residual:p.snapshot(),office:o.snapshot(),structure:scans.snapshot()});
          const offices = FB.religiousOffices(s), holders = {};
          for (const id of Object.keys(offices)) {
            const holder = FB.religiousOfficeSnapshot(s,id,offices); holders[id] = holder && holder.id || null;
          }
          outputs.push({stage:stage.name,before:before,after:facts(),state:await hash(JSON.stringify(s)),
            save:await hash(FB.save.serialize()),catalogue:await hash(JSON.stringify(FBDATA)),
            offices:await hash(JSON.stringify(offices)),holders:await hash(JSON.stringify(holders)),officeCount:Object.keys(offices).length});
        }
        return {identity:identity,outputs:outputs,readings:readings,nativeReaders:leader === FB.mobile.leader && campaign === FB.campaignBookmark};
      } finally {
        FB.aristocracy.withFiscalRead = fiscal;
        if (scans) scans.stop();
        if (o) o.stop();
        if (p) p.stop();
      }
    });
    expect(result.nativeReaders).toBe(true);
    expect(await page.evaluate(function () {
      return !window.__residualReadAudit && !window.__officeLookupProbe && !window.__officeStructureProbe;
    })).toBe(true);
    parity.push(result.outputs);
    if (enabled) samples.push(result);
  }
  expect(parity[1]).toEqual(parity[0]);
  expect(parity[1].map(function (row) { return row.after.date; })).toEqual([
    {year:1204,season:2,day:1},{year:1204,season:2,day:46},{year:1204,season:3,day:1}
  ]);
  for (let i = 0; i < samples[0].readings.length; i++) {
    const row = samples[0].readings[i], facts = parity[1][i], c = row.residual.total;
    expect(facts.after.turn).toBe(facts.before.turn+1);
    expect(c.officeEntries).toBe(row.office.keyBuilds);
    expect(c.officeWorldReads).toBe(c.officeEntries);
    expect(c.officeWorldRepeats).toBe(0);
    expect(c.mobileSlots).toBeLessThanOrEqual(c.mobileEntries*facts.before.governments);
    expect(c.mobileFilterArrays).toBe(0);
    expect(row.office.keyBuilds).toBe(row.office.hits+row.office.misses);
    expect(row.structure.tableBuilds).toBe(row.office.misses);
    expect(row.structure.localComparisonRows).toBeGreaterThan(0);
    expect(row.fiscalScopes).toBe(0);
    expect(c.indexCalls).toBe(0);
  }
  await info.attach('muhammad-autumn-owners',{body:JSON.stringify({start:starts[4],browser:page.context().browser().version(),
    parity:parity,samples:samples}),contentType:'application/json'});
});
