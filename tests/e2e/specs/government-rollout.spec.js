'use strict';
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {startHistoricalGame} = require('../support/game/historical-start');
const {advanceBookmark,restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {injectBrowserHarness} = require('../support/game/browser-harness');
const consumers = require('../fixtures/government-rollout.json');
const proofMod = require('../fixtures/government-rollout-mod.json');

dependsOnRuntime(__filename,[
  'index.html','data/government_rollout.js','data/bookmarks.js','data/bookmark_493.js',
  'data/bookmark_493_world.js','data/bookmark_711.js','data/bookmark_711_terrain.js',
  'data/geography_expansion.js','data/bookmark_476_wider_identities.js',
  'data/bookmark_800.js','data/bookmark_800_history.js','data/bookmark_800_expansion.js','data/bookmark_1204.js',
  'data/bookmark_867_expansion.js',
  'data/bookmark_476.js','data/bookmark_476_outer.js','data/bookmark_476_wider.js',
  'data/bookmark_1066_inhabited.js',
  'data/political_institutions.js','data/aristocratic_courts.js','data/assembly_polities.js',
  'data/mobile_confederations.js','data/civic_profiles.js','data/ecclesiastical_profiles.js',
  'data/papacy.js','data/eras.js','data/systems.js','data/starts.js','data/lexicons.js',
  'js/world.js','js/main.js','js/save.js','js/save_v4.js','js/mods.js','js/bookmark_setup.js',
  'js/governments.js','js/government_selection.js','js/government_recognition.js',
  'js/government_administration.js','js/government_ecclesiastical.js','js/ecclesiastical_validation.js',
  'js/ecclesiastical_strategies.js','js/government_support.js','js/government_lineage.js',
  'js/government_assembly.js','js/government_aristocracy.js','js/mobile_confederations.js',
  'js/government_elective.js','js/government_civic.js','js/civic_validation.js',
  'js/authority.js','js/model.js','js/station.js','js/progression.js','js/systems.js',
  'js/religion.js','js/papacy.js','js/institutions.js','js/treasury.js','js/lordships.js',
  'js/government_levy.js','js/government_revenue.js','js/government_continuity.js',
  'js/crazygames.js','data/distribution_crazygames.js'
]);

function journey(row) {
  return {bookmark:row.bookmark,code:'GOVROLLOUT-' + row.bookmark + '-' + row.scenario +
    '-' + row.province + '-m-Review-established'};
}

// Each fixture selects its declared government revision, including retained
// worlds. Dedicated date specifications cover expanded regional journeys.
async function startGovernmentRevision(page,info,row,flag) {
  await page.addInitScript(function (row) {
    document.addEventListener('DOMContentLoaded',function () {
      FBDATA.bookmarks[row.bookmark].revision = row.revision;
    },{once:true});
  },row);
  await startHistoricalGame(page,info,journey(row),flag);
}

// The legacy start is isolated here; ordinary journeys keep their current revision.
async function startBaseline(page,info,row) {
  await openGame(page,info);
  await page.evaluate(function (id) {
    FBDATA.bookmarks[id].revision = 'baseline';
    FB.startProgression.noteTier(3);
  },row.bookmark);
  const choose = page.locator('#btn-choose-beginning');
  if (await choose.isVisible()) await choose.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(journey(row).code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function (row) {
    FB.game.setPaused(true);
    FBDATA.bookmarks[row.bookmark].revision = row.revision;
  },row);
}

test('dated assignments retain complete baseline worlds and validate every strategy',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (rows) {
    return rows.map(function (row) {
      const raw = FBDATA.bookmarks[row.bookmark], current = FB.bookmark(row.bookmark,row.revision),
        baseline = FB.bookmark(row.bookmark,'baseline'), era = FBDATA.eras[current.era];
      const changed = row.changed.map(function (c) { return c.realm; });
      return {id:row.bookmark,revision:current.revision || 'baseline',
        faults:FB.validateBookmark(raw),
        forms:row.forms.every(function (form) { return current.realms.some(function (r) {
          return (r.government || era.defaultGovernment) === form;
        }); }),
        baseline:JSON.stringify(baseline.realms) === JSON.stringify(raw.realms),
        untouched:!changed.length || baseline.realms.every(function (r) {
          return changed.indexOf(r.id) >= 0 || JSON.stringify(r) === JSON.stringify(current.realms.find(function (n) { return n.id === r.id; }));
        }),
        geography:!changed.length || current.geography === (row.geography || baseline.geography),
        stories:!changed.length || JSON.stringify(current.stories) === JSON.stringify(baseline.stories),
        opening:!changed.length || JSON.stringify(current.opening) === JSON.stringify(baseline.opening),
        oldForms:row.changed.every(function (c) {
          const r = baseline.realms.find(function (r) { return r.id === c.realm; });
          return (r.government || era.defaultGovernment) === 'territorial';
        }),
        assigned:row.changed.every(function (c) {
          const r = current.realms.find(function (r) { return r.id === c.realm; });
          return r.government === c.form && (r.administrationProfileId || r.ecclesiastical.profileId) === c.profile;
        })};
    });
  },consumers);
  expect(result).toEqual(consumers.map(function (row) {
    return {id:row.bookmark,revision:row.revision,faults:[],forms:true,baseline:true,
      untouched:true,geography:true,stories:true,opening:true,oldForms:true,assigned:true};
  }));
});

for (const row of consumers) {
  test(row.bookmark + ' dated government journey saves and replays one natural season',async function ({page},info) {
    test.skip(info.project.name !== 'chromium-served','One bounded natural journey per date.');
    test.setTimeout(240000);
    await startGovernmentRevision(page,info,row);
    await injectBrowserHarness(page);
    await advanceBookmark(page,45);
    const source = await page.evaluate(function () { return FB.save.serialize(); });
    expect(Buffer.byteLength(source,'utf8')).toBeLessThanOrEqual(6 * 1024 * 1024);
    const midpoint = await facts(page);
    await restoreBookmark(page,source);
    expect(await facts(page)).toEqual(midpoint);
    await advanceBookmark(page,45);
    const finish = await facts(page);
    await restoreBookmark(page,source);
    await advanceBookmark(page,45);
    expect(await facts(page)).toEqual(finish);
    expect(await page.evaluate(function (row) {
      return row.changed.filter(function (c) { return c.mode; }).every(function (c) {
        const periods = {};
        return FB.publicOfficeRows(FB.state,c.realm).every(function (appointment) {
          const period = Math.floor(appointment.startTurn / 90);
          periods[period] = (periods[period] || 0) + 1;
          return periods[period] <= 1;
        });
      });
    },row)).toBe(true);
  });
}

for (const row of consumers.filter(function (row) { return row.changed.length; })) {
  for (const flag of [false,true]) test(row.bookmark + ' direct holders and dated profiles, CrazyGames ' + flag,
    async function ({page},info) {
      await startGovernmentRevision(page,info,row,flag);
      const result = await page.evaluate(function (row) {
        const s = FB.state, before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
        const profiles = row.changed.map(function (c) {
          const rid = c.realm, rec = s.authority.governments[rid], publicProfile = FB.administrationProfile(s,rid);
          const detail = {realm:rid,form:FB.governments.forRealm(s,rid).id,
            profile:rec.administrationProfileId || rec.ecclesiastical.profileId,
            direct:FB.realmHeldCounties(s,rid).length > 0 &&
              FB.realmHeldCounties(s,rid).every(function (pid) { return s.holder[pid] === rid; }),
            feudal:FB.systemEnabled(s,'feudal_service',{realm:rid})};
          if (publicProfile) {
            FB.publicOfficeRows(s,rid); FB.publicOfficeBudget(s,rid);
            FB.governmentRecognition.members(s,rid); FB.governmentRecognition.candidates(s,rid);
            FB.governmentRecognition.accessionQuote(s,rid,'death');
            Object.assign(detail,{mode:publicProfile.accession.mode,minor:publicProfile.accession.allowMinor,
              officers:publicProfile.accession.officeCandidates,service:publicProfile.finance.serviceShare,
              public:FB.systemEnabled(s,'public_offices',{realm:rid})});
          } else {
            const E = FB.ecclesiasticalGovernment, incumbent = E.incumbent(s,rid), law = FB.papalElectionLaw(s);
            E.decision(s,rid,'revenue'); E.review(s,rid,'appoint',{candidateId:s.player.charId});
            Object.assign(detail,{law:law.id,oneIncumbent:incumbent.id === s.papacy.obediences[s.papacy.romanObedience].claimantId,
              duplicate:!rec.selection && !FB.governments.support.row(s,rid),
              vacancyLevy:E.profile(s,rid).interim.indexOf('levy') >= 0});
          }
          return detail;
        });
        return {revision:s.start.revision,profiles:profiles,
          pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
      },row);
      expect(result).toEqual({revision:row.revision,pure:true,profiles:row.changed.map(function (c) {
        const detail = {realm:c.realm,form:c.form,profile:c.profile,direct:true,feudal:false};
        return c.mode ? Object.assign(detail,{mode:c.mode,minor:c.minor,officers:c.officers,service:c.service,public:true})
          : Object.assign(detail,{law:c.law,oneIncumbent:true,duplicate:true,vacancyLevy:c.vacancyLevy});
      })});
    });

  test(row.bookmark + ' schema 1 lives keep baseline government across current-world activation',async function ({page},info) {
    await startBaseline(page,info,row);
    const legacy = await page.evaluate(function () {
      const data = JSON.parse(FB.save.serialize());
      data.platformSchema = 1; delete data.state.start.revision;
      return JSON.stringify(data);
    });
    const before = await facts(page);
    await page.evaluate(function (id) {
      return new Promise(function (resolve,reject) {
        FB.activateBookmark(id,null,function (error) { if (error) reject(error); else resolve(); });
      });
    },row.bookmark);
    await page.evaluate(function (id) {
      return new Promise(function (resolve,reject) {
        FB.activateBookmark(id,null,function (error) { if (error) reject(error); else resolve(); });
      });
    },row.bookmark === '1066' ? '867' : '1066');
    await restoreBookmark(page,legacy);
    expect(await facts(page)).toEqual(before);
    expect(await page.evaluate(function (row) {
      const s = FB.state, data = JSON.parse(FB.save.serialize());
      return {revision:s.start.revision,schema:data.platformSchema,
        old:row.changed.every(function (c) {
          return FB.governments.forRealm(s,c.realm).id === 'territorial' &&
            !FB.administrationProfile(s,c.realm) && !FB.ecclesiasticalGovernment.row(s,c.realm);
        })};
    },row)).toEqual({revision:'baseline',schema:2,old:true});
  });
}

for (const row of consumers) for (const consumer of row.changed.filter(function (c) { return c.mode; })) {
  test(consumer.profile + ' public commissions conserve receipts and reject stale, duplicate and malformed records',async function ({page},info) {
    await startGovernmentRevision(page,info,row);
    const result = await page.evaluate(function (rid) {
      const s = FB.state, c = s.chars[s.player.charId], profile = FB.administrationProfile(s,rid);
      const pid = FB.realmHeldCounties(s,rid).find(function (id) { return FB.publicCountyIncome(s,rid,id) > 0; });
      if (!pid) throw new Error('Missing productive public source');
      s.player.provinceId = pid; s.player.liege = rid; s.player.travel = null;
      s.player.prestige = 1000; s.player.gold = 1000; c.unfree = false; c.born = s.date.year - 24;
      FB.SKILLS.forEach(function (skill) { c.skills[skill] = 20; });
      s.realms[rid].treasury.gold = 1000;
      const actor = {kind:'realm',id:rid}, input = {institutionId:rid,officeId:profile.governor,
        holderId:c.id,provinceId:pid,scope:{kind:'county',id:pid}};
      const q = FB.publicAppointmentQuote(s,actor,input), land = JSON.stringify([s.owner,s.holder,s.player.holdings]);
      s.realms[rid].treasury.gold--;
      const before = JSON.stringify(s), stale = !FB.publicAppoint(s,q) && before === JSON.stringify(s);
      const fresh = FB.publicAppointmentQuote(s,actor,input), appointment = FB.publicAppoint(s,fresh);
      if (!appointment) throw new Error(fresh.reason);
      const duplicate = !FB.publicAppoint(s,fresh);
      const total = s.player.gold + s.realms[rid].treasury.gold;
      s.turn += 90; FB.publicOfficeSettle(s,null,1,false);
      const paid = JSON.stringify([s.player.gold,s.realms[rid].treasury,s.authority.appointments]);
      FB.publicOfficeSettle(s,null,1,false);
      const once = paid === JSON.stringify([s.player.gold,s.realms[rid].treasury,s.authority.appointments]);
      const conserved = Math.abs(total - s.player.gold - s.realms[rid].treasury.gold) < 0.000001;
      const data = JSON.parse(FB.save.serialize()), saved = JSON.stringify(data.state.authority);
      FB.save.restore(data);
      const restored = saved === JSON.stringify(FB.state.authority) && data.uid === FB.getUidCounter() &&
        (data.rng >>> 0) === (FB.getRngState() >>> 0);
      const adopted = FB.state;
      const bad = JSON.parse(JSON.stringify(data));
      bad.state.authority.governments[rid].administrationProfileId = 'missing_profile';
      let rejected = false;
      try { FB.save.restore(bad); } catch (error) { rejected = FB.state === adopted; }
      return {stale:stale,duplicate:duplicate,once:once,conserved:conserved,restored:restored,rejected:rejected,
        property:land === JSON.stringify([FB.state.owner,FB.state.holder,FB.state.player.holdings])};
    },consumer.realm);
    expect(result).toEqual({stale:true,duplicate:true,once:true,conserved:true,restored:true,rejected:true,property:true});
  });
}

for (const row of consumers) for (const consumer of row.changed.filter(function (c) { return c.law; })) {
  test(consumer.profile + ' vacancy retains the canonical election, property and public money',async function ({page},info) {
    await startGovernmentRevision(page,info,row);
    const result = await page.evaluate(function (rid) {
      const s = FB.state,E = FB.ecclesiasticalGovernment,incumbent = E.incumbent(s,rid);
      const property = JSON.stringify([s.owner,s.holder,s.player]),cash = s.realms[rid].treasury.gold;
      FB.killChar(s,incumbent);
      const election = JSON.stringify(s.papacy.elections),college = JSON.stringify(s.papacy.obediences);
      E.tick(s,rid); E.tick(s,rid);
      return {vacant:E.incumbent(s,rid) === null,election:!!s.papacy.elections[s.papacy.romanObedience],
        once:election === JSON.stringify(s.papacy.elections) && college === JSON.stringify(s.papacy.obediences),
        property:property === JSON.stringify([s.owner,s.holder,s.player]),cash:cash === s.realms[rid].treasury.gold,
        revenue:E.decision(s,rid,'revenue').allowed,levy:E.decision(s,rid,'levy').allowed};
    },consumer.realm);
    expect(result).toEqual({vacant:true,election:true,once:true,property:true,cash:true,revenue:true,levy:consumer.vacancyLevy});
  });
}

test('JSON import supplies a different public-service constitution with exact-profile restore',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function (fixture) {
    const mod = JSON.parse(JSON.stringify(fixture)), b = JSON.parse(JSON.stringify(FBDATA.bookmarks['867']));
    b.revisions[b.revision].realms = b.revisions[b.revision].realms.map(function (r) {
      return r.id === 'byzantium' ? Object.assign({},r,{government:'river_service_rollout',administrationProfileId:'river_service_rollout'}) : r;
    });
    mod.bookmarks = {'867':b};
    return FB.mods.store(JSON.stringify(mod));
  },proofMod)).not.toBe(false);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady &&
    !!FBDATA.governmentForms.river_service_rollout; });
  await page.evaluate(function () {
    return new Promise(function (resolve,reject) {
      FB.activateBookmark('867',null,function (error) {
        if (error) { reject(error); return; }
        FB.game.pending = {seed:'GOVERNMENT-MOD'};
        FB.game.startObserve(); FB.game.setPaused(true); resolve();
      });
    });
  });
  const result = await page.evaluate(function () {
    const s = FB.state, p = FB.administrationProfile(s,'byzantium'), data = JSON.parse(FB.save.serialize());
    const ledger = JSON.stringify(data.state.authority);
    FB.save.restore(data);
    return {form:FB.governments.forRealm(FB.state,'byzantium').id,
      finance:p.finance,age:p.accession.minimumAge,term:p.termDays,fee:p.appointmentCost,
      baseline:FB.bookmark('867','baseline').realms.find(function (r) { return r.id === 'byzantium'; }).government || 'territorial',
      restored:ledger === JSON.stringify(FB.state.authority) && data.uid === FB.getUidCounter() &&
        (data.rng >>> 0) === (FB.getRngState() >>> 0)};
  });
  expect(result).toEqual({form:'river_service_rollout',finance:{kind:'revenue_service',share:0.2,salary:0,serviceShare:0.35,remittance:1},
    age:18,term:360,fee:3,baseline:'territorial',restored:true});
  const transaction = await page.evaluate(function () {
    const s = FB.state,rid = 'byzantium',p = FB.administrationProfile(s,rid);
    const pid = FB.realmHeldCounties(s,rid).find(function (id) { return FB.publicCountyIncome(s,rid,id) > 0; });
    const c = FB.makeCharacter(s,{id:'river_receiver',name:'River receiver',sex:'f',culture:'greek',religion:'orthodox',
      born:s.date.year - 30,station:2,homeProvinceId:pid});
    s.chars[c.id] = c; c.homeProvinceId = pid;
    FB.SKILLS.forEach(function (skill) { c.skills[skill] = 20; });
    s.realms[rid].treasury.gold = 1000;
    const review = FB.publicAppointmentQuote(s,{kind:'realm',id:rid},
      {institutionId:rid,officeId:p.governor,holderId:c.id,provinceId:pid,scope:{kind:'county',id:pid}});
    const gold = s.realms[rid].treasury.gold,appointment = FB.publicAppoint(s,review);
    if (!appointment) throw new Error(review.reason);
    const record = s.authority.appointments.find(function (r) { return r.id === appointment.id; });
    const fee = gold - s.realms[rid].treasury.gold;
    const purse = (c.gold || 0) + s.realms[rid].treasury.gold;
    s.turn += 90; FB.publicOfficeSettle(s,null,1,false);
    const last = record.publicTerms.last;
    const paid = JSON.stringify([c.gold,s.realms[rid].treasury.gold,record.publicTerms]);
    FB.publicOfficeSettle(s,null,1,false);
    return {fee:fee,term:record.endTurn - record.startTurn,kind:record.publicTerms.kind,
      paid:last.paid > 0 && Math.abs(last.paid - last.gross * 0.2) < 0.000001,
      conserved:Math.abs(purse - (c.gold || 0) - s.realms[rid].treasury.gold) < 0.000001,
      once:paid === JSON.stringify([c.gold,s.realms[rid].treasury.gold,record.publicTerms])};
  });
  expect(transaction).toEqual({fee:3,term:360,kind:'revenue_service',paid:true,conserved:true,once:true});
});

test('fresh revision rejects missing forms and unregistered strategies before mutation',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    const before = JSON.stringify(FBDATA.bookmarks), rng = FB.getRngState(), uid = FB.getUidCounter();
    const missing = JSON.parse(JSON.stringify(FBDATA.bookmarks['867']));
    missing.revisions[missing.revision].realms[0].government = 'missing_rollout_form';
    const unknown = FB.validateBookmark(missing);
    const broken = JSON.parse(JSON.stringify(FBDATA.governmentForms.administrative_monarchy));
    broken.succession = 'unregistered_rollout_succession';
    const rejected = FB.mods.store(JSON.stringify({name:'Invalid constitution',governmentForms:{invalid_rollout:broken}})) === false;
    return {unknown:unknown.some(function (line) { return /government/.test(line); }),rejected:rejected,
      pure:before === JSON.stringify(FBDATA.bookmarks) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result).toEqual({unknown:true,rejected:true,pure:true});
});
