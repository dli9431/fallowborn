'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { useReleasedStartRules } = require('../support/game/released-starts');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html', 'data/starts_claimants_1066.js', 'data/story_households_1066.js',
  'data/starts.js', 'data/bookmarks.js', 'data/bookmark_1066_inhabited.js', 'data/government_rollout.js',
  'data/travel.js', 'data/events_travel.js', 'data/technology.js', 'data/actions.js',
  'js/starts.js', 'js/mods.js', 'js/world.js', 'js/main.js', 'js/stories.js', 'js/story_household.js',
  'js/model.js', 'js/actions.js', 'js/travel.js', 'js/treasury.js', 'js/wars.js', 'js/armies.js',
  'js/save.js', 'js/save_v4.js', 'js/ui_misc.js', 'js/ui_panels.js', 'js/ui_modals.js']);
const ID = 'thegn_track_1066';
const COURTS = [
  { id:'harold_1066', name:'Harold Godwinson', label:'Harold Godwinson of England', realm:'england_1066', county:'london', age:44, culture:'english', tier:6, liege:null },
  { id:'william_1066', name:'William the Bastard', label:'William of Normandy', realm:'normandy', county:'rouen', age:38, culture:'norman', tier:5, liege:'france' },
  { id:'harald_1066', name:'Harald Hardrada', label:'Harald Hardrada of Norway', realm:'norway_1066', county:'trondheim', age:51, culture:'norse', tier:6, liege:null }
];

async function startCourt(page, info, court) {
  await useReleasedStartRules(page);
  await openGame(page, info);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#bookmarklist [data-bookmark="1066"]').click();
  await expect(page.getByRole('button', { name:court.label, exact:true })).toBeVisible();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('COURT-1066-' + court.id + '-' + court.county + '-m-' + court.name.replace(/ /g, '_'));
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#cg-name')).toHaveValue(court.name);
  await expect(page.locator('#cg-name')).toHaveAttribute('readonly', '');
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
}

for (const court of COURTS) {
  test(court.id + ' adopts the real court through the picker and code, preserving its realm and save', async function ({ page }, info) {
    await startCourt(page, info, court);
    expect(await page.evaluate(function (def) {
      const s = FB.state, me = s.chars[s.player.charId], p = s.player;
      const territory = FB.campaignBookmark(s).provinces.filter(function (r) { return r.realm === def.realm; })
        .map(function (r) { return r.id; }).sort();
      const actual = Object.keys(s.owner).filter(function (id) { return s.owner[id] === 'player'; }).sort();
      const unique = Object.values(s.chars).filter(function (c) { return c.name === def.name && !c.dead; }).length;
      const facts = { name:me.name, age:FB.ageOf(me,s.date.year), faith:me.religion, culture:me.culture,
        tier:p.tier, liege:p.liege, realm:p.realmId, source:s.start.rulerRealmId, unique,
        noDuplicate:!s.realms[def.realm], territory:JSON.stringify(territory) === JSON.stringify(actual),
        mapped:FB.startRealmId(s, def.realm), form:FB.political.government(s,{ kind:'realm',id:'player' }).formId,
        noHousehold:!s.stories || !s.stories.thegn_track_1066 };
      const saved = JSON.parse(FB.save.serialize());
      function snapshot(state) {
        const c = state.chars[state.player.charId];
        return [state.owner,state.holder,state.player.gold,state.player.liege,c.id,c.spouseId,c.childrenIds,state.realms.player];
      }
      const before = JSON.stringify(snapshot(saved.state));
      FB.activateBookmark('867'); FB.save.restore(saved);
      facts.retained = before === JSON.stringify(snapshot(FB.state));
      return facts;
    }, court)).toMatchObject({ name:court.name, age:court.age, faith:'catholic', culture:court.culture,
      tier:court.tier, liege:court.liege, source:court.realm, unique:1, noDuplicate:true,
      territory:true, mapped:'player', form:'territorial', noHousehold:true, retained:true });
  });
}

test('the four starts validate on all offering revisions and only the York household carries its track', async function ({ page }, info) {
  await openGame(page, info);
  const result = await page.evaluate(function () {
    const starts = FBDATA.startScenarios_claimants_1066;
    return { ids:starts.map(function (r) { return r.id; }),
      errors:FB.mods.validate({ name:'Court declarations', startScenarios:JSON.parse(JSON.stringify(starts)) }),
      revisions:FB.bookmarkRevisions('1066',FBDATA.bookmarks['1066']).map(function (bm) {
        return { id:bm.revision, faults:FB.validateBookmark(bm) };
      }), tracks:starts.map(function (sc) { return FB.startTracks(sc,sc.fixedProvinceId); }),
      away:FB.startTracks(starts[3],'london'), world:FB.bookmark('1066').stories || [] };
  });
  expect(result.ids).toEqual(['harold_1066','william_1066','harald_1066','thegn_household_1066']);
  expect(result.errors).toEqual([]);
  for (const revision of result.revisions) expect(revision.faults, revision.id).toEqual([]);
  expect(result.tracks).toEqual([[],[],[],[ID]]);
  expect(result.away).toEqual([]);
  expect(result.world).toEqual([]);
  await beginBookmark(page, info, '1066', 'thegn_household_1066');
  expect(await page.evaluate(function () {
    const s = FB.state;
    return { phase:s.stories.thegn_track_1066.phase, home:s.player.provinceId, tier:s.player.tier,
      career:s.chars[s.player.charId].profession, owned:s.player.provs.length };
  })).toMatchObject({ phase:'household', home:'york', tier:2, owned:0 });
});

test('a ruler code and direct creation both reject a different birthplace', async function ({ page }, info) {
  await useReleasedStartRules(page);
  await openGame(page, info);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('COURT-1066-harold_1066-york-m-Harold_Godwinson');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
  expect(await page.evaluate(function () {
    FB.activateBookmark('1066');
    FB.game.pending = { scenario:FBDATA.startScenarios.find(function (sc) { return sc.id === 'harold_1066'; }),
      seed:'COURT', bookmarkId:'1066', provinceId:'york' };
    return FB.game.start();
  })).toBe(false);
});

test('the household priority selects actual ordinary work without an opening wage', async function ({ page }, info) {
  await beginBookmark(page, info, '1066', 'thegn_household_1066');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'thegn_track_1066', gold = s.player.gold, turn = s.turn;
    const selected = FB.stories.apply(s,id,'keep_house',FB.stories.quote(s,id,'keep_house'));
    return { selected, focus:s.player.focus, noWage:s.player.gold === gold, noDay:s.turn === turn, phase:s.stories[id].phase };
  })).toEqual({ selected:true, focus:'manage_manor', noWage:true, noDay:true, phase:'offer' });
});

test('civilian work escrows and pays once, spends two action days and replaces focus income', async function ({ page }, info) {
  await beginBookmark(page, info, '1066', 'thegn_household_1066');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'thegn_track_1066', t = s.stories[id];
    FB.game.auto.all = false;
    function choose(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    choose('ask_work');
    const purse = s.player.gold, turn = s.turn;
    const transfer = FB.treasuryTransfer, transfers = [];
    FB.treasuryTransfer = function (state, from, to, amount) {
      const result = transfer(state,from,to,amount);
      if (result && from === 'england_1066' && to === null) transfers.push(amount);
      return result;
    };
    const events = FB.pickDailyEvents;
    FB.pickDailyEvents = function () { return []; };
    const original = FB.tickFocus; let focused = 0;
    FB.tickFocus = function (state) { focused++; return original(state); };
    const accepted = choose('accept'), escrow = t.jobs.local_accounts.escrow;
    const checkpoint = JSON.parse(FB.save.serialize());
    const shift = choose('shift'), row = JSON.parse(JSON.stringify(t.jobs.local_accounts)), repeated = choose('shift');
    FB.tickFocus = original;
    FB.treasuryTransfer = transfer; FB.pickDailyEvents = events;
    const record = JSON.stringify(t), saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
    const retained = record === JSON.stringify(FB.state.stories[id]);
    FB.save.restore(checkpoint);
    return { accepted, escrow, shift, repeated, focused, days:s.turn-turn, gain:s.player.gold-purse,
      transfers, row:{ days:row.daysWorked, paid:row.paid, escrow:row.escrow, status:row.status },
      retained, pending:FB.state.stories[id].jobs.local_accounts.daysWorked };
  })).toEqual({ accepted:true, escrow:4, shift:true, repeated:false, focused:0, days:2, gain:4,
    transfers:[4], row:{ days:2, paid:4, escrow:0, status:'settled' }, retained:true, pending:1 });
});

for (const cause of ['funds','patron','control']) {
  test('a changed ' + cause + ' invalidates a reviewed civilian job without charging', async function ({ page }, info) {
    await beginBookmark(page, info, '1066', 'thegn_household_1066');
    expect(await page.evaluate(function (cause) {
      const s = FB.state, id = 'thegn_track_1066';
      FB.stories.apply(s,id,'ask_work',FB.stories.quote(s,id,'ask_work'));
      const q = FB.stories.quote(s,id,'accept');
      if (cause === 'funds') s.realms.england_1066.treasury.gold = 0;
      if (cause === 'patron') FB.stories.ruler(s,'england_1066').dead = true;
      if (cause === 'control') FB.transferProvince(s,'york','norway_1066');
      const before = JSON.stringify(s);
      const applied = FB.stories.apply(s,id,'accept',q);
      return { reviewed:q.allowed, applied, pure:before === JSON.stringify(s), noJob:!s.stories[id].jobs.local_accounts };
    }, cause)).toEqual({ reviewed:true, applied:false, pure:true, noJob:true });
  });
}

test('peaceful autumn windows skip obsolete reviews and do not start wars or change ownership', async function ({ page }, info) {
  await beginBookmark(page, info, '1066', 'thegn_household_1066');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'thegn_track_1066', t = s.stories[id], story = FB.stories.get(id);
    function day(n) { s.date.season = 2; s.date.day = n; s.turn = 180+n-1; story.day(s,t); return t.phase; }
    function choose(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    const world = JSON.stringify([s.owner,s.wars,s.realms.england_1066.ruler]);
    choose('ask_work'); choose('decline');
    const phases = [day(7),day(8)]; choose('review');
    phases.push(day(20)); choose('continue'); phases.push(day(25)); choose('stay');
    phases.push(day(28)); choose('remain'); phases.push(day(44)); choose('wait'); phases.push(day(61));
    return { phases, worldKept:world === JSON.stringify([s.owner,s.wars,s.realms.england_1066.ruler]),
      receiptCount:Object.keys(t.householdReceipts).length };
  })).toEqual({ phases:['summer','autumn_accounts','northern_quiet','northern_review','looking_south','southern_review','peaceful'],
    worldKept:true, receiptCount:0 });
});

test('a late review opens the current window and war context buys only private supplies', async function ({ page }, info) {
  await beginBookmark(page, info, '1066', 'thegn_household_1066');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'thegn_track_1066', t = s.stories[id], story = FB.stories.get(id);
    s.date.season = 2; s.date.day = 20; s.turn = 199;
    FB.registerOrdinaryWar(s,'norway_1066',{ enemy:'england_1066', target:'york' });
    story.day(s,t); story.day(s,t);
    const phase = t.phase, world = JSON.stringify([s.owner,s.wars]), purse = s.player.gold;
    const paid = FB.stories.apply(s,id,'buy_stores',FB.stories.quote(s,id,'buy_stores'));
    const repeat = FB.stories.apply(s,id,'buy_stores',FB.stories.quote(s,id,'buy_stores'));
    const expense = purse-s.player.gold;
    s.date.day = 44; s.turn = 223; story.day(s,t);
    return { phase, paid, repeat, expense, late:t.phase, worldKept:world === JSON.stringify([s.owner,s.wars]) };
  })).toEqual({ phase:'northern_pressure', paid:true, repeat:false, expense:3, late:'southern_review', worldKept:true });
});

for (const order of [['norway_1066','normandy'],['normandy','norway_1066']]) {
  test('actual control is recorded once when the invading court order is ' + order.join(' then '), async function ({ page }, info) {
    await beginBookmark(page, info, '1066', 'thegn_household_1066');
    expect(await page.evaluate(function (order) {
      const s = FB.state, id = 'thegn_track_1066', t = s.stories[id], story = FB.stories.get(id);
      FB.transferProvince(s,'york',order[0]); story.day(s,t);
      const q = FB.stories.quote(s,id,'acknowledge');
      FB.transferProvince(s,'york',order[1]); story.day(s,t);
      const stale = FB.stories.apply(s,id,'acknowledge',q), gold = s.player.gold;
      const accepted = FB.stories.apply(s,id,'acknowledge',FB.stories.quote(s,id,'acknowledge'));
      const closed = JSON.stringify(t), saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      return { stale, accepted, phase:t.phase, goldKept:s.player.gold === gold,
        receiptCount:Object.keys(t.householdReceipts).length, retained:closed === JSON.stringify(FB.state.stories[id]) };
    }, order)).toEqual({ stale:false, accepted:true, phase:'changed_ruler', goldKept:true, receiptCount:1, retained:true });
  });
}

test('the London journey uses ordinary pricing, leaves relatives home and ends on actual return', async function ({ page }, info) {
  await beginBookmark(page, info, '1066', 'thegn_household_1066');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'thegn_track_1066', t = s.stories[id], story = FB.stories.get(id);
    s.date.season = 2; s.date.day = 28; s.turn = 207; story.day(s,t);
    const family = FB.householdMembers(s).map(function (c) { return c.id; });
    s.player.gold = 0;
    const poor = FB.stories.quote(s,id,'go').allowed;
    s.player.gold = 1000;
    const q = FB.stories.quote(s,id,'go'), before = s.player.gold;
    const went = FB.stories.apply(s,id,'go',q), journey = s.player.travel;
    const facts = { went, poor, paidExact:before-s.player.gold === q.facts.terms.cost, phase:t.phase,
      destination:journey.destinationId, home:s.player.provinceId,
      familyKept:JSON.stringify(family) === JSON.stringify(FB.householdMembers(s).map(function (c) { return c.id; })) };
    const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
    facts.retained = JSON.stringify(journey) === JSON.stringify(FB.state.player.travel);
    // Stage the return-completion boundary; the travel owner retains route simulation.
    const restored = FB.state, rec = restored.stories[id];
    rec.phase = 'returning'; rec.revision++;
    delete restored.player.travel;
    story.day(restored,rec); facts.returned = rec.phase;
    return facts;
  })).toMatchObject({ went:true, poor:false, paidExact:true, phase:'journey', destination:'london', home:'york', familyKept:true, retained:true, returned:'returned' });
});

test('protagonist interruption reconciles unfinished work once and does not bind an heir', async function ({ page }, info) {
  await beginBookmark(page, info, '1066', 'thegn_household_1066');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'thegn_track_1066', t = s.stories[id], story = FB.stories.get(id);
    FB.game.auto.all = false;
    function choose(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    choose('ask_work'); choose('accept');
    const actor = t.actorId, heir = FB.householdMembers(s).find(function (c) { return !c.dead && c.id !== actor; });
    s.player.charId = heir.id; story.day(s,t);
    const account = JSON.stringify(t.jobs.local_accounts); story.day(s,t);
    return { phase:t.phase, actorKept:t.actorId === actor, paid:t.jobs.local_accounts.paid,
      refund:t.jobs.local_accounts.refunded, escrow:t.jobs.local_accounts.escrow,
      once:account === JSON.stringify(t.jobs.local_accounts), repeat:choose('shift') };
  })).toEqual({ phase:'interrupted', actorKept:true, paid:2, refund:2, escrow:0, once:true, repeat:false });
});
