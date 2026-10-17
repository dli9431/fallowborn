'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { useReleasedStartRules } = require('../support/game/released-starts');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['index.html','data/starts_york_wessex_867.js','data/story_households_867.js',
  'data/starts.js','data/bookmarks.js','data/bookmark_867_expansion.js','data/communal_revisions.js',
  'data/government_rollout.js','data/islamic_rollout.js','data/actions.js','data/technology.js',
  'js/starts.js','js/main.js','js/world.js','js/mods.js','js/stories.js','js/story_household.js',
  'js/model.js','js/actions.js','js/treasury.js','js/wars.js','js/armies.js',
  'js/save.js','js/save_v4.js','js/ui_misc.js','js/ui_panels.js','js/ui_modals.js']);

const ID = 'york_household_track_867';

async function setup(page, info) {
  await useReleasedStartRules(page);
  await openGame(page, info);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
}

async function code(page, value) {
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(value);
  await page.locator('#ng-seed').press('Enter');
}

async function finishCreation(page) {
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
}

test('the starts validate on every offering revision without changing the released world', async function ({ page }, info) {
  await openGame(page, info);
  const result = await page.evaluate(function () {
    const starts = FBDATA.startScenarios_york_wessex_867;
    const before = JSON.stringify(FBDATA.bookmarks['867']), rng = FB.getRngState(), uid = FB.getUidCounter();
    const errors = FB.mods.validate({ name:'York and Wessex declarations',
      startScenarios:JSON.parse(JSON.stringify(starts)),
      storyInstances:JSON.parse(JSON.stringify(FBDATA.householdTracks_867)) });
    const revisions = FB.bookmarkRevisions('867',FBDATA.bookmarks['867']).map(function (bm) {
      return { id:bm.revision, faults:FB.validateBookmark(bm) };
    });
    return { errors, revisions, ids:starts.map(function (sc) { return sc.id; }),
      tracks:starts.map(function (sc) { return FB.startStoryTracks(sc,sc.fixedProvinceId); }),
      away:FB.startTracks(starts[1],'winchester'), world:FB.bookmark('867','baseline').stories || [],
      pure:before === JSON.stringify(FBDATA.bookmarks['867']) && rng === FB.getRngState() && uid === FB.getUidCounter(),
      halfdan:FBDATA.startScenarios.some(function (sc) { return sc.id === 'halfdan_york_867'; }) };
  });
  expect(result.errors).toEqual([]);
  for (const revision of result.revisions) expect(revision.faults,revision.id).toEqual([]);
  expect(result).toMatchObject({ ids:['aethelred_wessex_867','york_household_867'],
    tracks:[[],[ID]], away:[], world:[], pure:true, halfdan:false });
});

test('the picker groups York as Story and Æthelred as Historical and adopts his existing court', async function ({ page }, info) {
  await setup(page, info);
  await page.locator('#bookmarklist [data-bookmark="867"]').click();
  await expect(page.locator('#scenariolist .scen-group')).toHaveText(['Historical starts','Story starts','Open starts']);
  await expect(page.locator('[data-scenario="york_household_867"] .scenario-story')).toHaveText('Story start: begins in York.');
  const court = page.locator('[data-scenario="aethelred_wessex_867"]');
  await expect(court.locator('.scenario-story')).toHaveCount(0);
  await court.click();
  await expect(page.locator('#cg-name')).toHaveValue('Æthelred I');
  await expect(page.locator('#cg-name')).toHaveAttribute('readonly','');
  await finishCreation(page);
  expect(await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    const expected = FB.campaignBookmark(s).provinces.filter(function (p) { return p.realm === 'wessex'; }).map(function (p) { return p.id; }).sort();
    const actual = Object.keys(s.owner).filter(function (id) { return s.owner[id] === 'player'; }).sort();
    const facts = { name:me.name, age:FB.ageOf(me,s.date.year), culture:me.culture, religion:me.religion,
      home:s.player.provinceId, tier:s.player.tier, source:s.start.rulerRealmId,
      mapped:FB.startRealmId(s,'wessex'), noDuplicate:!s.realms.wessex,
      unique:Object.values(s.chars).filter(function (c) { return !c.dead && c.name === 'Æthelred I'; }).length,
      territory:JSON.stringify(expected) === JSON.stringify(actual),
      noYorkStory:!s.stories || !s.stories.york_household_track_867 };
    function snapshot(state) {
      const c = state.chars[state.player.charId];
      return [state.owner,state.holder,state.player.gold,c.id,c.spouseId,c.childrenIds,state.realms.player];
    }
    const saved = JSON.parse(FB.save.serialize()), before = JSON.stringify(snapshot(saved.state));
    FB.activateBookmark('1066'); FB.save.restore(saved);
    facts.retained = before === JSON.stringify(snapshot(FB.state));
    return facts;
  })).toEqual({ name:'Æthelred I', age:20, culture:'english', religion:'catholic', home:'winchester',
    tier:6, source:'wessex', mapped:'player', noDuplicate:true, unique:1, territory:true, noYorkStory:true, retained:true });
});

for (const start of [
  { id:'aethelred_wessex_867', wrongPlace:'york', name:'Æthelred_I' },
  { id:'york_household_867', wrongPlace:'winchester', name:'Review' }
]) {
  test(start.id + ' rejects a different birthplace through code and direct creation', async function ({ page }, info) {
    await setup(page, info);
    await code(page,'YORK-867-' + start.id + '-' + start.wrongPlace + '-m-' + start.name);
    await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
    expect(await page.evaluate(function (input) {
      FB.activateBookmark('867');
      FB.game.pending = { scenario:FBDATA.startScenarios.find(function (sc) { return sc.id === input.id; }),
        seed:'YORK', bookmarkId:'867', provinceId:input.wrongPlace };
      return FB.game.start();
    },start)).toBe(false);
  });
}

for (const family of [
  { preset:'standard', culture:'english', faith:'catholic' },
  { preset:'established', culture:'norse', faith:'norse_pagan' }
]) {
  test('York preserves the ' + family.preset + ' family and its chosen resident community', async function ({ page }, info) {
    await setup(page, info);
    await code(page,'YORK-867-york_household_867-york-f-Review-' + family.preset + '-0-' + family.culture + '.' + family.faith);
    await finishCreation(page);
    expect(await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId], t = s.stories.york_household_track_867;
      const family = FB.householdMembers(s).filter(function (c) { return !c.dead; });
      return { phase:t.phase, home:s.player.provinceId, tier:s.player.tier, profession:me.profession,
        culture:me.culture, faith:me.religion, ownsCounties:s.player.provs.length,
        kin:family.length > 1, spouse:!!me.spouseId, jobs:Object.keys(t.jobs),
        familyIdentity:family.every(function (c) { return c.culture === me.culture && c.religion === me.religion; }) };
    })).toEqual({ phase:'household', home:'york', tier:1, profession:'craftsman', culture:family.culture,
      faith:family.faith, ownsCounties:0, kin:true, spouse:family.preset === 'established', jobs:[], familyIdentity:true });
  });
}

test('the voluntary repair order reserves real funds and pays for one action day only once', async function ({ page }, info) {
  await beginBookmark(page, info, '867', 'york_household_867');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'york_household_track_867', t = s.stories[id];
    FB.game.auto.all = false;
    function choose(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    choose('ask_repairs');
    const purse = s.player.gold, turn = s.turn, transfer = FB.treasuryTransfer, tick = FB.tickFocus, events = FB.pickDailyEvents;
    const reserved = []; let focused = 0, accepted;
    FB.treasuryTransfer = function (state,from,to,amount) {
      const applied = transfer(state,from,to,amount);
      if (applied && from === 'york' && to === null) reserved.push(amount);
      return applied;
    };
    FB.tickFocus = function (state) { focused++; return tick(state); };
    FB.pickDailyEvents = function () { return []; };
    try { accepted = choose('accept_repairs'); }
    finally { FB.treasuryTransfer = transfer; FB.tickFocus = tick; FB.pickDailyEvents = events; }
    const row = t.jobs.repairs, repeated = choose('accept_repairs');
    const record = JSON.stringify(t), saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    return { accepted, repeated, focused, reserved, days:s.turn-turn, gain:s.player.gold-purse,
      phase:t.phase, account:{ days:row.daysWorked, paid:row.paid, escrow:row.escrow, status:row.status },
      retained:record === JSON.stringify(FB.state.stories[id]) };
  })).toEqual({ accepted:true, repeated:false, focused:0, reserved:[2], days:1, gain:2, phase:'preparations',
    account:{ days:1, paid:2, escrow:0, status:'settled' }, retained:true });
});

for (const cause of ['funds','patron','control','war','captivity']) {
  test('changed ' + cause + ' invalidates the repair review without charging or creating work', async function ({ page }, info) {
    await beginBookmark(page, info, '867', 'york_household_867');
    expect(await page.evaluate(function (cause) {
      const s = FB.state, id = 'york_household_track_867';
      FB.stories.apply(s,id,'ask_repairs',FB.stories.quote(s,id,'ask_repairs'));
      const q = FB.stories.quote(s,id,'accept_repairs');
      if (cause === 'funds') s.realms.york.treasury.gold = 0;
      if (cause === 'patron') FB.stories.ruler(s,'york').dead = true;
      if (cause === 'control') FB.transferProvince(s,'york','northumbria');
      if (cause === 'war') FB.registerOrdinaryWar(s,'northumbria',{ enemy:'york', target:'york' });
      if (cause === 'captivity') s.player.flags.in_prison = true;
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const applied = FB.stories.apply(s,id,'accept_repairs',q);
      return { reviewed:q.allowed, applied, noJob:!s.stories[id].jobs.repairs,
        pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter() };
    },cause)).toEqual({ reviewed:true, applied:false, noJob:true, pure:true });
  });
}

test('ordinary craft income advances work while choosing focus and gifts do not', async function ({ page }, info) {
  await beginBookmark(page, info, '867', 'york_household_867');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'york_household_track_867', t = s.stories[id], gold = s.player.gold, turn = s.turn;
    const selected = FB.stories.apply(s,id,'ordinary_work',FB.stories.quote(s,id,'ordinary_work'));
    const selectedOnly = t.phase === 'ordinary_work' && s.player.gold === gold && s.turn === turn;
    s.player.gold += 100;
    FB.stories.get(id).day(s,t);
    const gift = t.phase, before = s.player.gold;
    FB.tickFocus(s);
    return { selected, selectedOnly, gift, phase:t.phase, earned:s.player.gold > before, focus:s.player.focus,
      noContract:Object.keys(t.jobs).length === 0 };
  })).toEqual({ selected:true, selectedOnly:true, gift:'ordinary_work', phase:'preparations', earned:true,
    focus:'craft_work', noContract:true });
});

test('peaceful preparations charge only the reviewed private expense and keep public history independent', async function ({ page }, info) {
  await beginBookmark(page, info, '867', 'york_household_867');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'york_household_track_867';
    function choose(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    function publicSnapshot(state) {
      return JSON.stringify([state.owner,state.holder,state.wars,state.realms.york.ruler,
        state.realms.york.treasury.gold,state.realms.northumbria.ruler]);
    }
    const publicFacts = publicSnapshot(s);
    choose('ask_repairs'); choose('decline_repairs');
    s.player.gold = 1;
    const poor = choose('buy_supplies');
    s.player.gold = 10;
    const q = FB.stories.quote(s,id,'buy_supplies'); s.player.gold++;
    const stale = FB.stories.apply(s,id,'buy_supplies',q), before = s.player.gold;
    const bought = choose('buy_supplies'), expense = before-s.player.gold, repeat = choose('buy_supplies');
    const stayed = choose('stay'), rec = JSON.stringify(s.stories[id]), saved = JSON.parse(FB.save.serialize());
    FB.activateBookmark('1066'); FB.save.restore(saved);
    const r = FB.state;
    return { poor, stale, bought, expense, repeat, stayed, phase:r.stories[id].phase,
      receipts:Object.keys(r.stories[id].householdReceipts).length,
      publicKept:publicFacts === publicSnapshot(r),
      retained:rec === JSON.stringify(r.stories[id]), noContract:!r.stories[id].jobs.repairs };
  })).toEqual({ poor:false, stale:false, bought:true, expense:2, repeat:false, stayed:true, phase:'stayed',
    receipts:0, publicKept:true, retained:true, noContract:true });
});

test('actual changed control invalidates an earlier review and records the current occurrence once', async function ({ page }, info) {
  await beginBookmark(page, info, '867', 'york_household_867');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'york_household_track_867', t = s.stories[id], story = FB.stories.get(id);
    FB.transferProvince(s,'york','northumbria'); story.day(s,t);
    const phase = t.phase, q = FB.stories.quote(s,id,'acknowledge_rule');
    FB.transferProvince(s,'york','wessex'); story.day(s,t);
    const stale = FB.stories.apply(s,id,'acknowledge_rule',q), gold = s.player.gold;
    const accepted = FB.stories.apply(s,id,'acknowledge_rule',FB.stories.quote(s,id,'acknowledge_rule'));
    const repeated = FB.stories.apply(s,id,'acknowledge_rule',q), count = Object.keys(t.householdReceipts).length;
    FB.stories.apply(s,id,'stay',FB.stories.quote(s,id,'stay'));
    const rec = JSON.stringify(t), saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
    return { phase, stale, accepted, repeated, count, goldKept:s.player.gold === gold,
      finished:t.phase, retained:rec === JSON.stringify(FB.state.stories[id]) };
  })).toEqual({ phase:'changed_rule', stale:false, accepted:true, repeated:false, count:1,
    goldKept:true, finished:'stayed', retained:true });
});

test('the opening expires from campaign day thirty even after a late decision', async function ({ page }, info) {
  await beginBookmark(page, info, '867', 'york_household_867');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'york_household_track_867', t = s.stories[id], story = FB.stories.get(id);
    s.turn = 29; s.date.day = 30;
    const late = FB.stories.apply(s,id,'ask_repairs',FB.stories.quote(s,id,'ask_repairs'));
    s.turn = 30; s.date.day = 31;
    const gold = s.player.gold, q = FB.stories.quote(s,id,'accept_repairs');
    story.day(s,t); const done = JSON.stringify(t); story.day(s,t);
    return { late, outdated:q.allowed, phase:t.phase, once:done === JSON.stringify(t), goldKept:s.player.gold === gold,
      noJob:!t.jobs.repairs, noReceipt:Object.keys(t.householdReceipts).length === 0 };
  })).toEqual({ late:true, outdated:false, phase:'window_closed', once:true, goldKept:true, noJob:true, noReceipt:true });
});

test('planning departure moves no family or property and completed plans stay complete', async function ({ page }, info) {
  await beginBookmark(page, info, '867', 'york_household_867');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'york_household_track_867', t = s.stories[id], story = FB.stories.get(id);
    const family = JSON.stringify(FB.householdMembers(s)), home = s.player.provinceId, gold = s.player.gold;
    function choose(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    const considered = choose('consider_road'), planned = choose('plan_departure'), done = JSON.stringify(t);
    FB.transferProvince(s,'york','wessex'); story.day(s,t);
    // Control cursors can update, but a terminal plan never reopens.
    return { considered, planned, phase:t.phase, decisionsKept:JSON.stringify(JSON.parse(done).decisions) === JSON.stringify(t.decisions),
      home:s.player.provinceId === home, noJourney:!s.player.travel, gold:s.player.gold === gold,
      family:family === JSON.stringify(FB.householdMembers(s)), receiptCount:Object.keys(t.householdReceipts).length };
  })).toEqual({ considered:true, planned:true, phase:'planned_departure', decisionsKept:true, home:true,
    noJourney:true, gold:true, family:true, receiptCount:0 });
});

test('death interrupts unfinished plans without passing the biography to an heir', async function ({ page }, info) {
  await beginBookmark(page, info, '867', 'york_household_867');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'york_household_track_867', t = s.stories[id], actor = t.actorId;
    const q = FB.stories.quote(s,id,'ask_repairs'), gold = s.player.gold;
    s.chars[actor].dead = true;
    const stale = FB.stories.apply(s,id,'ask_repairs',q);
    FB.stories.get(id).day(s,t);
    const record = JSON.stringify(t); FB.stories.get(id).day(s,t);
    return { stale, phase:t.phase, actor:t.actorId === actor, once:record === JSON.stringify(t),
      goldKept:s.player.gold === gold, noJob:!t.jobs.repairs };
  })).toEqual({ stale:false, phase:'interrupted', actor:true, once:true, goldKept:true, noJob:true });
});

for (const width of [1280,390]) {
  test('York supply reviews disclose the expense and Escape returns without charging at width ' + width, async function ({ page }, info) {
    await page.setViewportSize({ width,height:844 });
    await beginBookmark(page, info, '867', 'york_household_867');
    const gold = await page.evaluate(function () {
      const s = FB.state, id = 'york_household_track_867';
      FB.stories.apply(s,id,'ask_repairs',FB.stories.quote(s,id,'ask_repairs'));
      FB.stories.apply(s,id,'decline_repairs',FB.stories.quote(s,id,'decline_repairs'));
      FB.ui.showStorySheet(id);
      return s.player.gold;
    });
    await page.locator('[data-story-choice="buy_supplies"]').click();
    await expect(page.locator('#genmodal')).toContainText('Spend two private gold once');
    await expect(page.locator('#gm-story-confirm')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-story-choice="buy_supplies"]')).toBeVisible();
    expect(await page.evaluate(function () { return FB.state.player.gold; })).toBe(gold);
  });
}
