'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const source = require('../fixtures/fiscal-read-reuse/source');
const journey = require('../fixtures/fiscal-read-reuse/journey');
const audit = require('../fixtures/residual-read-audit/probe');
const guard = require('../fixtures/fiscal-read-reuse/guard');

dependsOnRuntime(__filename,['js/government_aristocracy.js','js/lordships.js','js/world.js','js/model.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/mobile_guard.js','js/justice.js',
  'js/governments.js','js/government_recognition.js','js/politics.js','js/systems.js',
  'js/authority.js','js/actions.js','js/treasury.js','js/save.js','js/save_v4.js','js/mods.js','js/main.js',
  'js/bookmark_setup.js','js/starts.js','js/home_authority.js','js/day_phases.js','js/ecclesiastical_strategies.js']);

for (const start of journey.starts) {
  test('fiscal and office read reuse preserves ordinary and staged boundary days for '+start.scenario,async function ({page},info) {
    const outputs = [], counts = [], diagnostics = [];
    for (const mode of ['reference','candidate','diagnostic']) {
      const reference = mode === 'reference', diagnostic = mode === 'diagnostic';
      await source.route(page,reference,diagnostic);
      await journey.begin(page,info,start);
      if (diagnostic) {
        await page.evaluate(audit.install);
        await page.evaluate(guard.observe);
        await page.evaluate(function (body) { window.__guardFacts = (0,eval)('('+body+')'); },guard.facts.toString());
      }
      const result = await page.evaluate(async function () {
        window.fiscalReadCounts = {builds:0,requests:0,leaders:0,slots:0,officeEntries:0,fiscalReads:0};
        async function hash(text) {
          const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
          return Array.from(new Uint8Array(bytes)).map(function (n) { return n.toString(16).padStart(2,'0'); }).join('');
        }
        const states = [], phases = [], p = window.__residualReadAudit;
        async function snapshot(phase) {
          const s = FB.state;
          states.push({phase:phase,date:JSON.parse(JSON.stringify(s.date)),turn:s.turn,
            state:await hash(JSON.stringify(s)),save:await hash(FB.save.serialize()),
            data:await hash(JSON.stringify(FBDATA)),rng:FB.getRngState(),uid:FB.getUidCounter(),
            signature:FB.mods.sig(),fingerprint:FB.mods.fingerprint(FB.campaignBookmark(s))});
        }
        await snapshot('opening');
        for (const phase of ['ordinary','season','year']) {
          const s = FB.state;
          if (phase !== 'ordinary') {
            const season = phase === 'year' ? 3 : s.date.season;
            s.turn += (season-s.date.season)*90+90-s.date.day;
            s.date.season = season; s.date.day = 90;
          }
          const turn = s.turn;
          const before = p && window.__guardFacts();
          if (p) { p.reset(); window.__guardReadCounts = {calls:0,inMobileRead:0,guarded:0,predicates:0,rows:0}; }
          const started = performance.now();
          FB.game.passDay({deferUi:true});
          const instrumentedMs = performance.now()-started;
          if (p) phases.push({phase:phase,days:s.turn-turn,instrumentedMs:instrumentedMs,before:before,
            after:window.__guardFacts(),guards:window.__guardReadCounts,report:p.snapshot()});
          if (s.turn !== turn+1) throw new Error('Unexpected day advancement');
          await snapshot(phase);
        }
        if (p) { window.__stopGuardRead(); p.stop(); }
        return {states:states,counts:window.fiscalReadCounts,phases:phases,
          identity:{version:FB.VERSION,start:JSON.parse(JSON.stringify(FB.state.start)),userAgent:navigator.userAgent}};
      });
      outputs.push(result.states);
      if (diagnostic) diagnostics.push(result);
      else counts.push(result.counts);
    }
    expect(outputs[1]).toEqual(outputs[0]);
    expect(outputs[2]).toEqual(outputs[1]);
    expect(counts[1].requests).toBe(counts[0].requests);
    // Compare native readers; diagnostic wrappers exercise the override fallback separately.
    expect(counts[1].officeEntries).toBeLessThanOrEqual(counts[0].officeEntries);
    expect(counts[0].slots).toBeGreaterThan(0);
    expect(counts[1].slots).toBeLessThanOrEqual(counts[0].slots);
    if (start.bookmark === '476') expect(counts[1].builds).toBeLessThan(counts[0].builds);
    else expect(counts[1].fiscalReads).toBe(0);
    if (start.bookmark !== '1096') expect(counts[1].leaders).toBeLessThan(counts[0].leaders);
    await info.attach('read-reuse-counts',{body:JSON.stringify({start:start,reference:counts[0],candidate:counts[1]}),contentType:'application/json'});
    for (const row of diagnostics[0].phases) {
      expect(row.days).toBe(1);
      expect(row.report.cadences[row.phase].days).toBe(1);
      expect(row.report.total.mobileFilterArrays).toBe(0);
      expect(row.report.total.mobileSlots).toBeLessThanOrEqual(row.report.total.mobileEntries*row.before.counts.governments);
      expect(row.guards.inMobileRead).toBeLessThanOrEqual(row.guards.calls);
      expect(row.guards.predicates).toBeLessThanOrEqual(row.guards.calls);
      expect(row.before.bytes.state).toBeGreaterThan(row.before.bytes.governments);
    }
    expect(await page.evaluate(function () { return !window.__residualReadAudit && !window.__stopGuardRead; })).toBe(true);
    await info.attach('guard-boundary-counts',{body:JSON.stringify({start:start,browser:page.context().browser().version(),
      diagnostics:diagnostics}),contentType:'application/json'});
  });
}

async function startConstituency(page,info) {
  await source.route(page,false);
  await journey.begin(page,info,journey.starts[0]);
  await page.addScriptTag({path:path.resolve(__dirname,'../fixtures/government-query-reuse/reference.js')});
}

test('guard eligibility preserves indexed identities, live reads, method overrides and recursive errors',async function ({page},info) {
  await source.route(page,false);
  await journey.begin(page,info,journey.starts[0]);
  const result = await page.evaluate(function () {
    const original = FB.characterGuarded, entries = window.__guardEntries, some = Array.prototype.some;
    const before = JSON.stringify(FB.state), save = FB.save.serialize(), data = JSON.stringify(FBDATA);
    const rng = FB.getRngState(), uid = FB.getUidCounter(), cases = [];
    function state(guards) {
      const governments = {};
      guards.forEach(function (g,i) { governments['party'+i] = {mobile:{guardedParty:g}}; });
      return {authority:{governments:governments}};
    }
    function party(status,ids) { return {status:status,characterIds:ids}; }
    function run(oracle,fn) {
      const trace = [];
      function read(s,cid) {
        return oracle ? entries(s).some(function (v) { return v.guard.status !== 'released' && v.guard.characterIds.indexOf(cid) >= 0; })
          : original(s,cid);
      }
      function outcome(s,cid) {
        try { return {value:read(s,cid)}; } catch(e) { return {name:e.name,message:e.message}; }
      }
      try { return {outputs:fn(read,outcome,trace),trace:trace}; }
      finally { Array.prototype.some = some; }
    }
    function check(label,fn) { cases.push({label:label,oracle:run(true,fn),native:run(false,fn)}); }
    check('empty, live status and exact members',function (read) {
      const g = party('guarded',['a','b']), s = state([g]), outputs = [read(state([]),'a')];
      for (const status of ['guarded','expired','interrupted','released']) {
        g.status = status;
        outputs.push(read(s,'a'),read(s,'b'),read(s,'missing'),read(s,{id:'a'}));
      }
      g.status = 'guarded'; g.characterIds = ['c']; outputs.push(read(s,'a'),read(s,'c'));
      return outputs;
    });
    check('identity index lifetime and root replacement',function (read) {
      const g = party('guarded',['a']), s = state([g]), outputs = [read(s,'a')];
      s.authority.governments.party0.mobile.guardedParty = party('released',['a']);
      outputs.push(read(s,'a'));
      g.status = 'released'; outputs.push(read(s,'a'));
      s.authority.governments.party1 = {mobile:{guardedParty:party('guarded',['b'])}};
      outputs.push(read(s,'b'));
      s.authority.governments = Object.assign({},s.authority.governments);
      outputs.push(read(s,'b'),read(s,'a'));
      return outputs;
    });
    check('holes, inherited rows and short circuit',function (read,outcome,trace) {
      const s = state([party('released',['a']),party('guarded',['b']),party('guarded',['c'])]), rows = entries(s);
      delete rows[0];
      const proto = Object.create(Array.prototype);
      Object.defineProperty(proto,'0',{get:function () { trace.push('inherited'); return {guard:party('guarded',['a'])}; }});
      Object.setPrototypeOf(rows,proto);
      Object.defineProperty(rows,'2',{get:function () { trace.push('late'); throw new Error('late guard'); }});
      return [outcome(s,'a'),outcome(s,'b'),outcome(s,'c')];
    });
    check('captured length with append and deletion',function (read,outcome,trace) {
      const s = state([party('released',[]),party('guarded',['b'])]), rows = entries(s);
      Object.defineProperty(rows[0].guard,'status',{get:function () {
        trace.push('status'); rows.push({guard:party('guarded',['c'])}); delete rows[1]; return 'released';
      }});
      return [outcome(s,'c'),outcome(s,'c')];
    });
    check('live later rows, ordered status and member method reads',function (read,outcome,trace) {
      const g = {}, s = state([g,party('released',[])]), rows = entries(s);
      Object.defineProperty(g,'status',{get:function () {
        trace.push('status'); rows[1] = {guard:party('guarded',['target'])}; return 'guarded';
      }});
      Object.defineProperty(g,'characterIds',{get:function () {
        trace.push('members'); const ids = [];
        ids.indexOf = function (cid) { trace.push(['indexOf',this === ids,cid]); return -1; };
        return ids;
      }});
      return [outcome(s,'target')];
    });
    check('overridden method getter receiver result and own call',function (read,outcome,trace) {
      const s = state([]), rows = entries(s);
      const method = function (predicate) { trace.push(['method',this === rows]); return predicate({guard:party('guarded',['a'])}) ? 'custom-result' : 0; };
      method.call = function () { throw new Error('method.call must not be read'); };
      Object.defineProperty(rows,'some',{get:function () { trace.push('some getter'); return method; }});
      return [outcome(s,'a'),outcome(s,'b')];
    });
    check('replaced prototype method on empty index',function (read,outcome,trace) {
      const s = state([]), rows = entries(s);
      Array.prototype.some = function () { trace.push(['prototype',this === rows]); return 'empty override'; };
      return [outcome(s,'a')];
    });
    check('native method getter edits before length capture',function (read,outcome,trace) {
      const s = state([]), rows = entries(s);
      Object.defineProperty(rows,'some',{get:function () { trace.push('get'); rows.push({guard:party('guarded',['a'])}); return some; }});
      return [outcome(s,'a')];
    });
    check('recursive states, thrown value and recovery',function (read,outcome,trace) {
      const g = {}, s = state([g]), nested = state([party('guarded',['nested'])]);
      let fail = true;
      Object.defineProperty(g,'status',{get:function () {
        trace.push(['nested',read(nested,'nested')]);
        if (fail) { fail = false; throw new Error('guard getter'); }
        return 'guarded';
      }});
      g.characterIds = ['a'];
      return [outcome(s,'a'),outcome(s,'a'),outcome(nested,'a')];
    });
    check('same-state recursion has independent traversal',function (read,outcome,trace) {
      const g = party('released',['a']), s = state([g,party('guarded',['b'])]);
      let nested = false;
      Object.defineProperty(g,'status',{get:function () {
        if (!nested) { nested = true; try { trace.push(['recursive',read(s,'b')]); } finally { nested = false; } }
        return 'released';
      }});
      return [outcome(s,'b')];
    });
    check('custom method exceptions and recovery',function (read,outcome) {
      const s = state([party('guarded',['a'])]), rows = entries(s);
      rows.some = function () { throw new Error('some override'); };
      const first = outcome(s,'a'); delete rows.some;
      return [first,outcome(s,'a')];
    });
    check('nonarray collection keeps native length conversion',function (read,outcome,trace) {
      const s = state([party('guarded',['a'])]), filter = Array.prototype.filter;
      try {
        Array.prototype.filter = function (predicate,receiver) {
          const rows = filter.call(this,predicate,receiver);
          return {0:rows[0],some:some,length:{valueOf:function () { trace.push('length'); return 1.9; }}};
        };
        entries(s);
      } finally { Array.prototype.filter = filter; }
      return [outcome(s,'a'),outcome(s,'missing')];
    });
    return {cases:cases,pure:before === JSON.stringify(FB.state) && save === FB.save.serialize() && data === JSON.stringify(FBDATA) &&
      rng === FB.getRngState() && uid === FB.getUidCounter() && original === FB.characterGuarded};
  });
  expect(result.pure).toBe(true);
  expect(result.cases).toHaveLength(12);
  for (const row of result.cases) expect(row.native,row.label).toEqual(row.oracle);
  expect(result.cases[1].native.outputs).toEqual([true,true,false,false,true,false]);
  expect(result.cases[5].native.outputs).toEqual([{value:'custom-result'},{value:0}]);
  await info.attach('guard-live-parity',{body:JSON.stringify(result),contentType:'application/json'});
});

test('fiscal index reuse validates same-read ledger edits and leaves eligibility live',async function ({page},info) {
  await startConstituency(page,info);
  const checks = await page.evaluate(function () {
    const A = FB.aristocracy, s = FB.state, rid = 'sasanian_476';
    const initial = JSON.stringify(s), catalogue = FBDATA, profiles = JSON.stringify(FBDATA.aristocraticProfiles);
    const results = [];
    function equal(label) {
      function outcome(read) { try { return {value:read(s,rid)}; } catch(e) { return {name:e.name,message:e.message}; } }
      if (JSON.stringify(outcome(A.constituency)) !== JSON.stringify(outcome(GOV_QUERY_REFERENCE))) throw new Error(label+' mismatch');
      results.push(label);
    }
    const cases = [
      ['same inputs',function () {}],
      ['appointment id in place',function (s,d,m,a) { a.id = 'changed-appointment'; }],
      ['right id in place',function (s,d,m,a,r) { r.id = 'changed-right'; }],
      ['requested right id',function (s,d,m) { m.rightIds[0] = 'changed-request'; }],
      ['requested appointment id',function (s,d,m) { m.appointmentId = 'changed-request'; }],
      ['reverse appointments',function (s) { s.authority.appointments.reverse(); }],
      ['reverse rights',function (s) { s.authority.rights.reverse(); }],
      ['replace appointment',function (s,d,m,a) { s.authority.appointments[s.authority.appointments.indexOf(a)] = Object.assign({},a,{status:'removed'}); }],
      ['duplicate first appointment',function (s,d,m,a) { s.authority.appointments.unshift(Object.assign({},a,{status:'removed'})); }],
      ['duplicate right row',function (s,d,m,a,r) { s.authority.rights.push(Object.assign({},r)); }],
      ['replace rights array',function (s) { s.authority.rights = s.authority.rights.slice(); }],
      ['sparse ledger',function (s,d,m,a,r) { delete s.authority.rights[s.authority.rights.indexOf(r)]; }],
      ['null row error',function (s,d,m,a,r) { s.authority.rights[s.authority.rights.indexOf(r)] = null; }],
      ['holder status',function (s,d,m,a) { a.status = 'removed'; }],
      ['right strength',function (s,d,m,a,r) { r.strength = 0; }],
      ['right beneficiary',function (s,d,m,a,r) { r.beneficiary = {kind:'character',id:'missing'}; }],
      ['age',function (s,d,m,a,r,c) { c.born = s.date.year; }],
      ['dynasty',function (s,d,m,a,r,c) { c.dyn = 'different'; }],
      ['custody',function (s,d,m,a,r,c) { c.captive = true; }],
      ['ownership',function (s,d,m) { s.holder[m.scope.id] = 'player'; }],
      ['profile policy',function () { A.profile(s,rid).minimumAge = 1000; }],
      ['catalogue replacement',function () { window.FBDATA = Object.assign({},FBDATA); }],
      ['custom filter',function (s) { s.authority.rights.filter = function (fn) { return Array.prototype.filter.call(this,fn).reverse(); }; }],
      ['custom slice is not consulted',function (s) { s.authority.rights.slice = function () { throw new Error('Unexpected slice'); }; }]
    ];
    try {
      for (const entry of cases) {
        Object.assign(s,JSON.parse(initial)); window.FBDATA = catalogue; FBDATA.aristocraticProfiles = JSON.parse(profiles);
        const d = A.state(s,rid), m = d.interests[0];
        const a = s.authority.appointments.find(function (a) { return a.id === m.appointmentId; });
        const r = s.authority.rights.find(function (r) { return r.id === m.rightIds[0]; });
        A.withFiscalRead(s,{},function () {
          equal(entry[0]+' before');
          entry[1](s,d,m,a,r,s.chars[a.holder.id]);
          equal(entry[0]+' after');
          let detached;
          try { detached = A.constituency(s,rid); } catch (e) { detached = []; }
          if (detached[0]) detached[0].principal = null;
          equal(entry[0]+' detached');
        });
      }
    } finally { Object.assign(s,JSON.parse(initial)); window.FBDATA = catalogue; FBDATA.aristocraticProfiles = JSON.parse(profiles); }
    return results.length;
  });
  expect(checks).toBe(72);
});

test('native fiscal scopes revalidate edits from an intervening reader and restore after exceptions',async function ({page},info) {
  await startConstituency(page,info);
  const results = await page.evaluate(function () {
    const s = FB.state, A = FB.aristocracy, rid = 'sasanian_476', initial = JSON.stringify(s);
    const withRead = A.withFiscalRead, bonus = FB.buildingBonusAt, rows = [];
    function run(reference,edit) {
      Object.assign(s,JSON.parse(initial)); FB.governments.invalidate(); FB.rebuildRulerIndex(s);
      const m = A.state(s,rid).interests[0], right = s.authority.rights.find(function (r) { return r.id === m.rightIds[0]; });
      let changed = false;
      window.fiscalReadCounts = {builds:0,requests:0};
      if (reference) A.withFiscalRead = function (state,context,read) { return read(); };
      FB.buildingBonusAt = function (state,pid,slot,name) {
        if (!changed && name === 'tax') { changed = true; edit(right); }
        return bonus.apply(this,arguments);
      };
      try {
        const projection = FB.settlementFiscalProjection(s,m.scope.id,0);
        return {projection:projection,state:JSON.stringify(s),counts:window.fiscalReadCounts};
      } finally { FB.buildingBonusAt = bonus; A.withFiscalRead = withRead; }
    }
    try {
      for (const edit of [function () {},function (r) { r.id = 'changed-during-projection'; },function (r) { r.strength = 0; }]) {
        const reference = run(true,edit), candidate = run(false,edit);
        if (JSON.stringify(reference.projection) !== JSON.stringify(candidate.projection) || reference.state !== candidate.state) throw new Error('Intervening reader mismatch');
        rows.push([reference.counts,candidate.counts]);
      }
      Object.assign(s,JSON.parse(initial));
      const m = A.state(s,rid).interests[0];
      FB.buildingBonusAt = function () { throw new Error('projection error'); };
      let failed = false;
      try { FB.settlementFiscalProjection(s,m.scope.id,0); } catch(e) { failed = e.message === 'projection error'; }
      if (!failed) throw new Error('Missing projection failure');
      FB.buildingBonusAt = bonus;
      window.fiscalReadCounts = {builds:0,requests:0};
      A.constituency(s,rid); A.constituency(s,rid);
      const outside = Object.assign({},fiscalReadCounts);
      window.fiscalReadCounts = {builds:0,requests:0};
      FB.settlementFiscalProjection(s,m.scope.id,0);
      FB.settlementFiscalProjection(s,m.scope.id,0);
      rows.push({outside:outside,projections:window.fiscalReadCounts});
    } finally { Object.assign(s,JSON.parse(initial)); FB.buildingBonusAt = bonus; A.withFiscalRead = withRead; }
    return rows;
  });
  expect(results[0]).toEqual([{builds:2,requests:2},{builds:1,requests:2}]);
  expect(results[1]).toEqual([{builds:2,requests:2},{builds:2,requests:2}]);
  // An inactive right can cause additional nested live constituency reads.
  // Result parity above is exact; reuse must not suppress those readers.
  expect(results[2][0].requests).toBeGreaterThanOrEqual(2);
  expect(results[2][1].requests).toBeGreaterThanOrEqual(2);
  expect(results[2][1].builds).toBeLessThan(results[2][1].requests);
  expect(results[3].outside).toEqual({builds:2,requests:2});
  expect(results[3].projections.builds).toBeGreaterThanOrEqual(2);
  expect(results[3].projections.builds).toBeLessThan(results[3].projections.requests);
  await info.attach('intervening-reader-counts',{body:JSON.stringify(results),contentType:'application/json'});
});

test('office world reuse preserves empty, null-state, override and retained revision boundaries',async function ({page},info) {
  await source.route(page,false);
  await journey.begin(page,info,journey.starts[0]);
  const result = await page.evaluate(function () {
    const s = FB.state, active = FB.activeBookmark, definitions = FB.localInstitutionDefinitions;
    const campaign = FB.campaignBookmark, bookmark = FB.bookmark, originalRevision = s.start.revision;
    window.fiscalReadCounts = {worlds:0};
    function prior(state) {
      const local = FB.localInstitutionDefinitions(state);
      return {local:local,bookmark:state ? FB.campaignBookmark(state) : FB.activeBookmark};
    }
    function outcome(fn,state) { try { return {value:fn(state)}; } catch(e) { return {name:e.name,message:e.message}; } }
    const checks = [];
    function check(label,state) {
      const a = outcome(FB.localInstitutionOfficeInputs,state), b = outcome(prior,state);
      if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(label+' world mismatch');
      checks.push(label);
    }
    try {
      fiscalReadCounts.worlds = 0; FB.localInstitutionOfficeInputs(s); const nativeCalls = fiscalReadCounts.worlds;
      fiscalReadCounts.worlds = 0; prior(s); const priorCalls = fiscalReadCounts.worlds;
      check('native',s);
      FB.activeBookmark = {id:'different-active',localInstitutions:{}};
      check('null uses current state for definitions',null);
      check('undefined uses current state for definitions',undefined);
      check('empty explicit table',{});
      s.start.revision = 'missing-revision'; check('invalid retained revision',s); s.start.revision = originalRevision;
      FB.localInstitutionDefinitions = function () { return {}; }; check('replaced definitions',s);
      FB.localInstitutionDefinitions = definitions;
      FB.campaignBookmark = function () { return {id:'override',localInstitutions:{}}; }; check('replaced campaign',s);
      let order = [];
      FB.localInstitutionDefinitions = function () { order.push('definitions'); return {}; };
      FB.campaignBookmark = function () { order.push('bookmark'); return {}; };
      FB.localInstitutionOfficeInputs(s); const ordering = order.slice();
      FB.localInstitutionDefinitions = definitions; FB.campaignBookmark = campaign;
      const raw = FBDATA.bookmarks[s.start.id], old = raw.localInstitutions;
      try { raw.localInstitutions = {}; check('in-place authoring table edit',s); }
      finally { if (old === undefined) delete raw.localInstitutions; else raw.localInstitutions = old; }
      const data = FBDATA;
      try { window.FBDATA = Object.assign({},data,{bookmarks:Object.assign({},data.bookmarks)}); check('detached catalogue',s); }
      finally { window.FBDATA = data; }
      let sequence = 0;
      FB.bookmark = function () { return {id:String(++sequence),localInstitutions:{}}; };
      const replaced = FB.localInstitutionOfficeInputs(s); sequence = 0;
      if (JSON.stringify(replaced) !== JSON.stringify(prior(s))) throw new Error('Replaced bookmark lookup order');
      checks.push('replaced bookmark lookup');
      return {nativeCalls:nativeCalls,priorCalls:priorCalls,checks:checks.length,ordering:ordering};
    } finally { FB.activeBookmark = active; FB.localInstitutionDefinitions = definitions; FB.campaignBookmark = campaign; FB.bookmark = bookmark; s.start.revision = originalRevision; }
  });
  expect(result).toEqual({nativeCalls:1,priorCalls:2,checks:10,ordering:['definitions','bookmark']});
});

for (const start of [journey.starts[0],journey.starts[4],
  {scenario:'harbor command',fixture:'harbor'},{scenario:'dune command',fixture:'dune'}]) {
  test('mobile ruler reuse preserves live eligibility, complete scans and replaced leader readers in '+start.scenario,async function ({page},info) {
    const outputs = [], counts = [];
    for (const reference of [true,false]) {
      await source.route(page,reference ? 'filter' : false);
      if (start.fixture) {
        await openGame(page,info);
        if (reference) {
          await page.evaluate(function () { FB.ui.showMods(); });
          await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/mobile-command-'+start.fixture+'.json'));
          await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
          await prepareGameContent(page);
        }
        await beginBookmarkFromTitle(page,start.fixture+'_world',start.fixture+'_household');
      } else await journey.begin(page,info,start);
      const result = await page.evaluate(function () {
        const s = FB.state, M = FB.mobile, initial = JSON.stringify(s), native = M.leader, outputs = [];
        const active = M.active, custody = FB.justiceCustodyOf, guarded = FB.characterGuarded, filter = Array.prototype.filter;
        const data = JSON.stringify(FBDATA), save = FB.save.serialize(), rng = FB.getRngState(), uid = FB.getUidCounter();
        const rid = Object.keys(s.authority.governments).find(function (id) { return M.active(s,id) && M.leader(s,id); });
        if (!rid) throw new Error('No eligible mobile leader');
        const cid = M.leader(s,rid).id;
        function read(label,value) {
          const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
          let result;
          try { result = {realm:FB.realmIdForRulerCharacter(s,value) || null}; } catch(e) { result = {name:e.name,message:e.message}; }
          if (before !== JSON.stringify(s) || rng !== FB.getRngState() || uid !== FB.getUidCounter()) throw new Error('Impure '+label);
          outputs.push({label:label,result:result});
        }
        window.fiscalReadCounts = {leaders:0,slots:0};
        for (const field of [null,'dead','captive','imprisoned','exiled','prisonerOf']) {
          Object.assign(s,JSON.parse(initial)); FB.governments.invalidate(); FB.rebuildRulerIndex(s);
          if (field) s.chars[cid][field] = field === 'prisonerOf' ? 'captor' : true;
          read(field || 'active',cid); read((field || 'active')+' object',s.chars[cid]);
        }
        Object.assign(s,JSON.parse(initial));
        const row = M.row(s,rid);
        if (row.command) {
          row.command.leaderGeneration++; read('stale command',cid); row.command.leaderGeneration--;
          row.command.status = 'recalled'; read('recalled command',cid);
          Object.assign(s,JSON.parse(initial));
          const member = M.row(s,rid).members.find(function (m) { return m.principal.id === cid; });
          member.allegiance = false; read('withheld command membership',cid);
          Object.assign(s,JSON.parse(initial));
          const issuer = M.row(s,rid).command.issuer;
          if (issuer) { issuer.generation = (issuer.generation || 0) + 1; read('stale issuer',cid); }
        }
        read('unknown','unknown-character');
        Object.assign(s,JSON.parse(initial));
        try {
          FB.justiceCustodyOf = function (state,id) { return id === cid ? {captiveId:cid} : custody(state,id); };
          read('custody reader',cid);
        } finally { FB.justiceCustodyOf = custody; }
        try {
          FB.characterGuarded = function (state,id) { return id === cid || guarded && guarded(state,id); };
          read('guard reader',cid);
        } finally { FB.characterGuarded = guarded; }
        try {
          FB.justiceCustodyOf = function (state,id) {
            if (id === cid) M.leader = function () { return null; };
            return custody(state,id);
          };
          read('leader replaced during eligibility',cid);
        } finally { FB.justiceCustodyOf = custody; M.leader = native; }
        const nativeCounts = Object.assign({},fiscalReadCounts);
        let replacements = 0;
        M.leader = function (state,id) { replacements++; return native(state,id); };
        read('replaced reader',cid);
        const replacedCalls = replacements;
        M.leader = function () { throw new Error('leader failure'); };
        read('reader error',cid);
        M.leader = native;
        read('restored',cid);
        const ids = Object.keys(s.authority.governments).filter(function (id) {
          return s.authority.governments[id].mobile && active(s,id);
        });
        let trace = [], recursing = false;
        try {
          M.active = function (state,id) { trace.push(['active',id]); return active(state,id); };
          M.leader = function (state,id) { trace.push(['leader',id]); return {id:'filter-target'}; };
          read('first of all matches','filter-target');
          outputs.push({label:'complete ordered scan',trace:trace});
          trace = [];
          M.active = function (state,id) {
            trace.push(['active',id]);
            if (id === ids[ids.length - 1]) throw new Error('last row failure');
            return active(state,id);
          };
          read('late scan error','filter-target');
          outputs.push({label:'late error order',trace:trace});
          M.active = active;
          M.leader = function (state,id) {
            if (!recursing) {
              recursing = true;
              try { read('recursive miss','recursive-miss'); } finally { recursing = false; }
            }
            return native(state,id);
          };
          read('recursive reader',cid);
          M.leader = function () { return {id:'filter-target'}; };
          let customCalls = 0;
          const allIds = Object.keys(s.authority.governments);
          Array.prototype.filter = function (callback,receiver) {
            const matches = filter.call(this,callback,receiver);
            if (this.length === allIds.length && this.every(function (id,i) { return id === allIds[i]; })) {
              customCalls++; return matches.reverse();
            }
            return matches;
          };
          read('replaced filter','filter-target');
          outputs.push({label:'filter override calls',calls:customCalls});
        } finally { M.active = active; M.leader = native; Array.prototype.filter = filter; }
        Object.assign(s,JSON.parse(initial));
        if (save !== FB.save.serialize() || data !== JSON.stringify(FBDATA) || rng !== FB.getRngState() || uid !== FB.getUidCounter())
          throw new Error('Mobile reads changed save, catalogue or counters');
        return {outputs:outputs,counts:nativeCounts,replacedCalls:replacedCalls,command:!!row.command};
      });
      outputs.push({outputs:result.outputs,replacedCalls:result.replacedCalls}); counts.push(result.counts);
    }
    expect(outputs[1]).toEqual(outputs[0]);
    expect(counts[1].slots).toBe(counts[0].slots);
    expect(counts[1].leaders).toBe(counts[0].leaders);
    if (start.fixture) expect(outputs[1].outputs.some(function (row) { return row.label === 'stale command'; })).toBe(true);
    expect(outputs[1].outputs.find(function (row) { return row.label === 'late scan error'; }).result)
      .toEqual({name:'Error',message:'last row failure'});
    expect(outputs[1].outputs.find(function (row) { return row.label === 'filter override calls'; }).calls).toBe(1);
  });
}

test('fiscal index lifetimes end after returns, nested reads and errors',async function ({page},info) {
  await startConstituency(page,info);
  const result = await page.evaluate(function () {
    const s = FB.state, A = FB.aristocracy, rid = 'sasanian_476', context = {};
    window.fiscalReadCounts = {builds:0,requests:0};
    const before = JSON.stringify(s), data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    function pair() { A.constituency(s,rid); A.constituency(s,rid); }
    A.withFiscalRead(s,context,pair);
    const one = fiscalReadCounts.builds;
    A.withFiscalRead(s,context,pair);
    const two = fiscalReadCounts.builds;
    try { A.withFiscalRead(s,context,function () { pair(); throw new Error('read error'); }); } catch (e) { if (e.message !== 'read error') throw e; }
    const error = fiscalReadCounts.builds;
    pair();
    const outside = fiscalReadCounts.builds;
    A.withFiscalRead(s,context,function () {
      pair();
      A.withFiscalRead(s,{},pair,true);
      A.withFiscalRead(s,context,pair);
      A.withFiscalRead(s,context,pair,true);
    });
    const nested = fiscalReadCounts.builds;
    return {one:one,two:two,error:error,outside:outside,nested:nested,
      pure:before === JSON.stringify(s) && data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result).toEqual({one:1,two:2,error:3,outside:5,nested:8,pure:true});
});
