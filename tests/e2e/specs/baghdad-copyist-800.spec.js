'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { useReleasedStartRules } = require('../support/game/released-starts');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html', 'data/starts_courts_800.js', 'data/story_households_baghdad_800.js',
  'data/starts.js', 'data/bookmark_800.js', 'data/bookmark_800_expansion.js', 'data/bookmark_800_history.js',
  'data/government_rollout.js', 'data/islamic_rollout.js', 'data/actions.js', 'data/economy.js', 'data/technology.js', 'data/travel.js',
  'js/starts.js', 'js/main.js', 'js/world.js', 'js/model.js', 'js/stories.js', 'js/story_household.js',
  'js/actions.js', 'js/economy.js', 'js/treasury.js', 'js/travel.js', 'js/save.js', 'js/save_v4.js',
  'js/ui_misc.js', 'js/ui_panels.js', 'js/ui_modals.js']);

const ID = 'baghdad_copyist_track_800';

async function startCopyist(page, info, community) {
  await useReleasedStartRules(page);
  await openGame(page, info);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#bookmarklist [data-bookmark="800"]').click();
  await expect(page.locator('[data-scenario="baghdad_copyist_800"]')).toBeVisible();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('COPYIST-800-baghdad_copyist_800-baghdad-f-Review');
  await page.locator('#ng-seed').press('Enter');
  if (community === 'persian') await page.locator('input[name="cg-community"][value="1"]').check();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await page.evaluate(function () {
    FB.game.setPaused(true); FB.game.auto.all = false; FB.game.uiPrefs.hideTips = true;
    delete FB.state.player.flags.tutorial;
    // These jobs exercise the normal action-day loop, independently of random event selection.
    FB.pickDailyEvents = function () { return []; };
  });
}

async function choose(page, choice) {
  return page.evaluate(function (choice) {
    const s = FB.state, id = 'baghdad_copyist_track_800';
    return FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice));
  }, choice);
}

for (const culture of ['arabic','persian']) {
  test('the copyist retains the ' + culture + ' Sunni community and an apprentice household without extra privileges', async function ({ page }, info) {
    await startCopyist(page, info, culture);
    expect(await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId], sc = FBDATA.startScenarios_courts_800[0];
      return { review:FBDATA.reviewOpenStarts, home:s.player.provinceId, age:FB.ageOf(c,s.date.year),
        culture:c.culture, faith:c.religion, tier:s.player.tier, profession:c.career.profession,
        rank:c.career.rank, gold:s.player.gold, focus:s.player.focus, phase:s.stories.baghdad_copyist_track_800.phase,
        family:FB.householdMembers(s).length > 1, jobs:Object.keys(s.stories.baghdad_copyist_track_800.jobs).length,
        local:FB.startStoryTracks(sc,'baghdad'), remote:FB.startStoryTracks(sc,'raqqa'),
        manuscripts:FBDATA.careers.scholar.requiresTech, license:FBDATA.careers.scholar.license.toRank,
        estate:s.player.provs.length };
    })).toEqual({ review:false, home:'baghdad', age:24, culture, faith:'sunni', tier:1, profession:'scholar',
      rank:'apprentice', gold:12, focus:'scholarly_work', phase:'household', family:true, jobs:0,
      local:[ID], remote:[], manuscripts:'manuscript_codex', license:'journeyman', estate:0 });
  });
}

for (const choice of ['seek_study','decline_story']) {
  test(choice + ' closes the optional opening without paying, qualifying or changing the world', async function ({ page }, info) {
    await startCopyist(page, info);
    expect(await page.evaluate(function (choice) {
      const s = FB.state, id = 'baghdad_copyist_track_800';
      function snapshot() { return JSON.stringify([s.turn,s.player.gold,s.player.flags,s.chars,s.owner,s.realms]); }
      const before = snapshot();
      const applied = FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice));
      return { applied, same:before === snapshot(), phase:s.stories[id].phase, jobs:Object.keys(s.stories[id].jobs).length };
    }, choice)).toEqual({ applied:true, same:true, phase:choice === 'seek_study' ? 'study_intention' : 'declined', jobs:0 });
  });
}

test('copying, checking and delivery reserve one fee and replace exactly three focus days', async function ({ page }, info) {
  await startCopyist(page, info);
  expect(await choose(page,'keep_copying')).toBe(true);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'baghdad_copyist_track_800', t = s.stories[id], turn = s.turn, gold = s.player.gold;
    const transfers = [], transfer = FB.treasuryTransfer, focus = FB.tickFocus;
    let focusDays = 0;
    FB.treasuryTransfer = function (state, from, to, amount) {
      const ok = transfer(state,from,to,amount);
      if (ok && from === 'abbasid' && to === null) transfers.push(amount);
      return ok;
    };
    FB.tickFocus = function (state) { focusDays++; return focus(state); };
    try {
      function choose(choice) { return FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice)); }
      const accepted = choose('accept_order'), first = JSON.parse(FB.save.serialize());
      const beforeCompare = { phase:t.phase, days:t.jobs.first_copy.daysWorked, escrow:t.jobs.first_copy.escrow, paid:t.jobs.first_copy.paid };
      const checked = choose('compare_copy'), beforeDelivery = t.phase;
      const delivery = choose('deliver_copy'), repeat = choose('deliver_copy');
      const row = JSON.parse(JSON.stringify(t.jobs.first_copy)), saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      const exact = JSON.stringify(row) === JSON.stringify(FB.state.stories[id].jobs.first_copy);
      FB.save.restore(first);
      return { accepted, beforeCompare, checked, beforeDelivery, delivery, repeat, focusDays, transfers,
        days:s.turn-turn, gain:s.player.gold-gold,
        account:{ days:row.daysWorked, paid:row.paid, refund:row.refunded, escrow:row.escrow, status:row.status },
        exact, pending:FB.state.stories[id].jobs.first_copy.daysWorked };
    } finally { FB.treasuryTransfer = transfer; FB.tickFocus = focus; }
  })).toEqual({ accepted:true, beforeCompare:{ phase:'checking',days:1,escrow:6,paid:0 },
    checked:true, beforeDelivery:'delivery', delivery:true, repeat:false, focusDays:0, transfers:[6], days:3, gain:6,
    account:{ days:3,paid:6,refund:0,escrow:0,status:'settled' }, exact:true, pending:1 });
});

test('practice uses a real unpaid action day and the shorter second order has its own single fee', async function ({ page }, info) {
  await startCopyist(page, info);
  await choose(page,'keep_copying'); await choose(page,'practice_first');
  const before = await page.evaluate(function () { return [FB.state.turn,FB.state.player.gold]; });
  expect(await choose(page,'compare_practice')).toBe(true);
  expect(await page.evaluate(function () {
    const s = FB.state;
    return [s.turn,s.player.gold,Object.keys(s.stories.baghdad_copyist_track_800.jobs).length];
  })).toEqual([before[0]+1,before[1],0]);
  await choose(page,'accept_order'); await choose(page,'compare_copy'); await choose(page,'deliver_copy');
  expect(await choose(page,'seek_another')).toBe(true);
  expect(await choose(page,'accept_later')).toBe(true);
  expect(await choose(page,'accept_later')).toBe(false);
  expect(await page.evaluate(function () {
    const s = FB.state, t = s.stories.baghdad_copyist_track_800;
    const saved = JSON.parse(FB.save.serialize()), before = JSON.stringify(t); FB.save.restore(saved);
    return { phase:t.phase, paid:Object.values(t.jobs).reduce(function (n,r) { return n+r.paid; },0),
      escrow:Object.values(t.jobs).reduce(function (n,r) { return n+r.escrow; },0),
      once:before === JSON.stringify(FB.state.stories.baghdad_copyist_track_800) };
  })).toEqual({ phase:'continued',paid:8,escrow:0,once:true });
});

for (const cause of ['funds','patron','control']) {
  test('a changed ' + cause + ' rejects a stale commission review without mutation', async function ({ page }, info) {
    await startCopyist(page, info); await choose(page,'keep_copying');
    expect(await page.evaluate(function (cause) {
      const s = FB.state, id = 'baghdad_copyist_track_800', q = FB.stories.quote(s,id,'accept_order');
      if (cause === 'funds') s.realms.abbasid.treasury.gold = 0;
      if (cause === 'patron') FB.stories.ruler(s,'abbasid').dead = true;
      if (cause === 'control') FB.transferProvince(s,'baghdad','byzantium');
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const applied = FB.stories.apply(s,id,'accept_order',q);
      FB.stories.quote(s,id,'accept_order');
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      FB.stories.get(id).day(s,s.stories[id]);
      return { reviewed:q.allowed, applied, pure, phase:s.stories[id].phase, jobs:Object.keys(s.stories[id].jobs).length };
    }, cause)).toEqual({ reviewed:true,applied:false,pure:true,
      phase:cause === 'funds' ? 'unavailable' : 'changed_court', jobs:0 });
  });
}

for (const cause of ['departure','patron','control','expiry','successor','death']) {
  test('unfinished work after ' + cause + ' pays its completed fraction and refunds the balance once', async function ({ page }, info) {
    await startCopyist(page, info); await choose(page,'keep_copying'); await choose(page,'accept_order');
    expect(await page.evaluate(function (cause) {
      const s = FB.state, id = 'baghdad_copyist_track_800', t = s.stories[id], story = FB.stories.get(id);
      if (cause === 'departure') s.player.provinceId = 'raqqa';
      if (cause === 'patron') s.chars[t.jobPatrons.first_copy].dead = true;
      if (cause === 'control') FB.transferProvince(s,'baghdad','byzantium');
      if (cause === 'expiry') { s.turn = t.jobs.first_copy.expiresTurn; s.date.day += 10; }
      if (cause === 'successor') s.player.charId = FB.householdMembers(s).find(function (c) { return !c.dead && c.id !== t.actorId; }).id;
      if (cause === 'death') s.chars[t.actorId].dead = true;
      story.day(s,t);
      const row = t.jobs.first_copy, once = JSON.stringify(row);
      story.day(s,t);
      return { phase:t.phase, paid:row.paid, refunded:row.refunded, escrow:row.escrow,
        conserved:row.paid+row.refunded+row.escrow === 6, once:once === JSON.stringify(row),
        work:FB.stories.quote(s,id,'compare_copy').allowed };
    }, cause)).toEqual({ phase:cause === 'departure' ? 'remote' : cause === 'successor' || cause === 'death' ? 'interrupted' : cause === 'expiry' ? 'closed_order' : 'changed_court',
      paid:2,refunded:4,escrow:0,conserved:true,once:true,work:false });
  });
}

test('an actual personal journey closes the local order at departure while relatives stay home', async function ({ page }, info) {
  await startCopyist(page, info); await choose(page,'keep_copying'); await choose(page,'accept_order');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'baghdad_copyist_track_800', t = s.stories[id];
    const family = FB.householdMembers(s).map(function (c) { return c.id; });
    s.player.gold = 1000;
    const q = FB.travelSiteSnapshot(s,'study_constantinople');
    const went = !!q && FB.travelStart(s,q.purpose,q.destinationId,q.destinationRealm);
    FB.stories.get(id).day(s,t);
    return { went, phase:t.phase, origin:s.player.travel && s.player.travel.homeId,
      home:s.player.provinceId, paid:t.jobs.first_copy.paid, refund:t.jobs.first_copy.refunded,
      kin:family.filter(function (cid) { return cid !== s.player.charId; }).every(function (cid) {
        return FB.characterResidence(s,s.chars[cid]) === 'baghdad';
      }) };
  })).toEqual({ went:true,phase:'remote',origin:'baghdad',home:'baghdad',paid:2,refund:4,kin:true });
});

test('matching restore resumes unfinished work once and never attaches a missing household record', async function ({ page }, info) {
  await startCopyist(page, info); await choose(page,'keep_copying'); await choose(page,'accept_order');
  const checkpoint = await page.evaluate(function () { return FB.save.serialize(); });
  await choose(page,'compare_copy'); await choose(page,'deliver_copy');
  await page.evaluate(function (text) { FB.save.restore(JSON.parse(text)); },checkpoint);
  expect(await choose(page,'compare_copy')).toBe(true);
  expect(await choose(page,'deliver_copy')).toBe(true);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'baghdad_copyist_track_800', saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    const paid = FB.state.stories[id].jobs.first_copy.paid, gold = FB.state.player.gold;
    const repeat = FB.stories.apply(FB.state,id,'deliver_copy',FB.stories.quote(FB.state,id,'deliver_copy'));
    const same = FB.state.player.gold === gold;
    delete saved.state.stories[id]; FB.save.restore(saved);
    return { paid,repeat,same,missing:!FB.state.stories[id] };
  })).toEqual({ paid:6,repeat:false,same:true,missing:true });
});

test('declining work, a later unfunded offer and a missed opening never create extra fees', async function ({ page }, info) {
  await startCopyist(page, info); await choose(page,'keep_copying');
  const checkpoint = await page.evaluate(function () { return FB.save.serialize(); });
  expect(await choose(page,'decline_order')).toBe(true);
  expect(await page.evaluate(function () {
    const s = FB.state;
    return { phase:s.stories.baghdad_copyist_track_800.phase,gold:s.player.gold,jobs:Object.keys(s.stories.baghdad_copyist_track_800.jobs).length };
  })).toEqual({ phase:'independent',gold:12,jobs:0 });
  await page.evaluate(function (text) { FB.save.restore(JSON.parse(text)); },checkpoint);
  await choose(page,'accept_order'); await choose(page,'compare_copy'); await choose(page,'deliver_copy');
  await choose(page,'seek_another');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'baghdad_copyist_track_800', t = s.stories[id], gold = s.player.gold;
    s.realms.abbasid.treasury.gold = 0; FB.stories.get(id).day(s,t);
    return { phase:t.phase,first:t.jobs.first_copy.paid,second:!!t.jobs.later_copy,same:gold === s.player.gold };
  })).toEqual({ phase:'independent',first:6,second:false,same:true });
  await page.evaluate(function (text) {
    FB.save.restore(JSON.parse(text)); const s = FB.state;
    s.date = { year:803,season:0,day:1 }; s.turn = 786;
    FB.stories.get('baghdad_copyist_track_800').day(s,s.stories.baghdad_copyist_track_800);
  },checkpoint);
  expect(await page.evaluate(function () {
    return { phase:FB.state.stories.baghdad_copyist_track_800.phase,gold:FB.state.player.gold };
  })).toEqual({ phase:'window_closed',gold:12 });
});

test('the shared copying review returns focus on cancel and confirms only the reserved first day', async function ({ page }, info) {
  await startCopyist(page, info); await choose(page,'keep_copying');
  await page.locator('[data-tab="actions"]').click();
  await page.evaluate(function () { FB.ui.refresh(); });
  const card = page.locator('[data-story-card="' + ID + '"]');
  const before = await page.evaluate(function () {
    return [FB.state.turn,FB.state.player.gold,FB.state.realms.abbasid.treasury.gold];
  });
  await card.click(); await page.locator('[data-story-choice="accept_order"]').click();
  await expect(page.getByText('Total reserved fee: 6 gold for 3 action days.',{ exact:true })).toBeVisible();
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  expect(await page.evaluate(function () {
    return [FB.state.turn,FB.state.player.gold,FB.state.realms.abbasid.treasury.gold];
  })).toEqual(before);
  await card.click(); await page.locator('[data-story-choice="accept_order"]').click();
  await page.locator('#gm-story-confirm').click();
  expect(await page.evaluate(function () {
    const t = FB.state.stories.baghdad_copyist_track_800;
    return { phase:t.phase,days:t.jobs.first_copy.daysWorked,paid:t.jobs.first_copy.paid,escrow:t.jobs.first_copy.escrow };
  })).toEqual({ phase:'checking',days:1,paid:0,escrow:6 });
});
