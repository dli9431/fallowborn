'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { useReleasedStartRules } = require('../support/game/released-starts');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/starts_clovis_493.js', 'data/starts.js', 'data/bookmark_493.js',
  'data/bookmark_493_world.js', 'data/bookmark_493_history.js', 'data/communal_revisions.js',
  'data/government_rollout.js', 'data/geographies.js', 'data/geography_expansion.js',
  'data/eras.js', 'data/systems.js', 'data/technology.js', 'data/cultures.js',
  'data/political_institutions.js', 'data/story_instances.js', 'data/story_campaigns.js',
  'data/story_household_effects_476_493.js', 'js/story_household_observer.js',
  'js/main.js', 'js/starts.js', 'js/world.js', 'js/model.js', 'js/station.js',
  'js/mods.js', 'js/stories.js', 'js/story_campaign.js', 'js/religion.js', 'js/systems.js',
  'js/authority.js', 'js/politics.js', 'js/governments.js', 'js/population.js', 'js/institutions.js',
  'js/treasury.js', 'js/wars.js', 'js/armies.js', 'js/save.js', 'js/save_v4.js',
  'js/ui_misc.js', 'js/ui_panels.js', 'js/ui_modals.js'
]);

const CODE = 'CLOVIS-493-clovis_493-laon-m-Clovis-standard-0-frankish.germanic_pagan';
const CAMPAIGNS = ['alamannic_campaign_493', 'burgundian_campaign_493', 'visigothic_campaign_493'];

async function fullStart(page) {
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
}

async function startClovis(page, info, revision, picker) {
  await useReleasedStartRules(page);
  await openGame(page, info);
  expect(await page.evaluate(function (revision) {
    // Explicit owner review in this fresh test context only.
    FBDATA.bookmarks['493'].hidden = false;
    FBDATA.bookmarks['493'].revision = revision || 'world_v2';
    FBDATA.startScenarios.find(function (sc) { return sc.id === 'clovis_493'; }).hidden = false;
    const adopt = FB.adoptStartingRealm;
    FB.adoptStartingRealm = function (s, sc) {
      const r = s.realms[sc.rulerRealmId], me = s.chars[s.player.charId];
      window.__clovisCourt = { rulerId:me.id, spouseId:me.spouseId,
        children:me.childrenIds.slice(), gold:r.treasury.gold,
        owners:JSON.parse(JSON.stringify(s.owner)), holders:JSON.parse(JSON.stringify(s.holder)),
        family:me.childrenIds.concat(me.spouseId ? [me.spouseId] : []).map(function (id) {
          const c = s.chars[id];
          return { id:c.id, name:c.name, born:c.born, fatherId:c.fatherId, motherId:c.motherId };
        }) };
      FB.adoptStartingRealm = adopt;
      return adopt(s, sc);
    };
    return FB.validateBookmark(FB.bookmark('493'));
  }, revision)).toEqual([]);
  await fullStart(page);
  if (picker) {
    await page.locator('#bookmarklist [data-bookmark="493"]').click();
    await expect(page.locator('#scenariolist')).toContainText('Historical');
    await page.locator('[data-scenario="clovis_493"]').click();
  } else {
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill(CODE);
    await page.locator('#ng-seed').press('Enter');
  }
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await expect(page.locator('#cg-name')).toHaveValue('Clovis');
  await expect(page.locator('#cg-name')).toHaveAttribute('readonly', '');
  await expect(page.locator('#cg-reroll')).toBeDisabled();
  await expect(page.locator('#cg-community')).toHaveClass(/hidden/);
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

for (const boundary of ['date','scenario']) {
  test('the hidden ' + boundary + ' rejects the Clovis picker, code and direct creation', async function ({ page }, info) {
    await useReleasedStartRules(page);
    await openGame(page, info);
    expect(await page.evaluate(function (boundary) {
      // Review-open scenarios still cannot bypass a hidden date. Separately,
      // accepting the date does not accept its hidden ruler scenario.
      FBDATA.reviewOpenStarts = boundary === 'date';
      if (boundary === 'scenario') FBDATA.bookmarks['493'].hidden = false;
      return { hidden:FB.bookmark('493').hidden, available:FB.bookmarkAvailable('493'),
        inspectable:FB.bookmarks(true).some(function (b) { return b.id === '493'; }),
        scenario:FBDATA.startScenarios.find(function (sc) { return sc.id === 'clovis_493'; }).hidden };
    }, boundary)).toEqual({ hidden:boundary === 'date', available:boundary === 'scenario', inspectable:true, scenario:true });
    await fullStart(page);
    if (boundary === 'date') await expect(page.locator('[data-bookmark="493"]')).toHaveCount(0);
    else {
      await page.locator('[data-bookmark="493"]').click();
      await expect(page.locator('[data-scenario="clovis_493"]')).toHaveCount(0);
    }
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill(CODE);
    await page.locator('#ng-seed').press('Enter');
    if (boundary === 'date') await expect(page.locator('#ng-seed-err')).toContainText('hidden for new campaigns');
    else await expect(page.locator('#ng-seed-err')).not.toBeEmpty();
    await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
    expect(await page.evaluate(function () {
      FB.game.pending = { bookmarkId:'493', seed:'CLOVIS', provinceId:'laon',
        scenario:FBDATA.startScenarios.find(function (sc) { return sc.id === 'clovis_493'; }) };
      const state = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
      return { start:FB.game.start(),
        pure:FB.state === state && FB.getRngState() === rng && FB.getUidCounter() === uid };
    })).toEqual({ start:false, pure:true });
    if (boundary === 'date') expect(await page.evaluate(function () { return FB.game.startObserve(); })).toBe(false);
  });
}

test('the ruler declaration validates on every compatible revision without altering worlds', async function ({ page }, info) {
  await openGame(page, info);
  const result = await page.evaluate(function () {
    const sc = FBDATA.startScenarios.find(function (r) { return r.id === 'clovis_493'; });
    const before = JSON.stringify(FBDATA.bookmarks), rng = FB.getRngState(), uid = FB.getUidCounter();
    const errors = FB.mods.validate({ name:'Frankish start', startScenarios:[JSON.parse(JSON.stringify(sc))] });
    return { errors:errors, revisions:FB.bookmarkRevisions('493').map(function (b) {
      return { id:b.revision, faults:FB.validateBookmark(b), offered:!b.starts || b.starts.indexOf(sc.id) >= 0,
        place:FB.startProvinceAllowed(sc,b,'laon'), away:FB.startProvinceAllowed(sc,b,'paris') };
    }), tracks:FB.startTracks(sc,'laon'),
    pure:before === JSON.stringify(FBDATA.bookmarks) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result.errors).toEqual([]);
  expect(result.tracks).toEqual([]);
  expect(result.pure).toBe(true);
  expect(result.revisions.map(function (r) { return r.id; })).toEqual(['baseline','world_v2','jewish_samaritan_v3']);
  for (const r of result.revisions) expect(r).toMatchObject({ faults:[], offered:true, place:true, away:false });
});

for (const revision of ['baseline','world_v2','jewish_samaritan_v3']) {
  test(revision + ' adopts one Clovis and the actual court, then restores a hidden save', async function ({ page }, info) {
    await startClovis(page, info, revision, revision === 'world_v2');
    expect(await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId], old = window.__clovisCourt;
      const expected = function (map) {
        return Object.keys(map).every(function (pid) {
          return s[map === old.owners ? 'owner' : 'holder'][pid] === (map[pid] === 'franks_493' ? 'player' : map[pid]);
        });
      };
      const family = old.family.every(function (c) {
        const now = s.chars[c.id];
        return now && now.name === c.name && now.born === c.born && now.fatherId === c.fatherId && now.motherId === c.motherId;
      });
      const children = me.childrenIds.map(function (id) { return s.chars[id]; });
      const facts = { name:me.name, id:me.id === old.rulerId, born:me.born, tier:s.player.tier,
        culture:me.culture, faith:me.religion, form:FB.political.government(s,{kind:'realm',id:'player'}).formId,
        location:s.player.provinceId, settlement:s.player.homeSettlement, source:s.start.rulerRealmId,
        unique:Object.values(s.chars).filter(function (c) { return c.name === 'Clovis' && !c.dead; }).length,
        adopted:!s.realms.franks_493 && s.realms.player.id === 'player',
        gold:s.player.gold === old.gold, owners:expected(old.owners), holders:expected(old.holders),
        family:family && me.spouseId === old.spouseId && JSON.stringify(me.childrenIds) === JSON.stringify(old.children),
        theuderic:children.filter(function (c) { return c.name === 'Theuderic' && c.born === 485 && c.fatherId === me.id; }).length };
      const saved = JSON.parse(FB.save.serialize());
      function snapshot(state) {
        const c = state.chars[state.player.charId];
        return [state.start,state.owner,state.holder,state.player.gold,state.player.piety,state.player.prestige,
          state.realms.player,c.id,c.name,c.spouseId,c.childrenIds,state.stories];
      }
      const before = JSON.stringify(snapshot(saved.state));
      FBDATA.bookmarks['493'].hidden = true;
      FBDATA.startScenarios.find(function (sc) { return sc.id === 'clovis_493'; }).hidden = true;
      FB.activateBookmark('867');
      FB.save.restore(saved);
      facts.retained = before === JSON.stringify(snapshot(FB.state));
      facts.valid = FB.save.v4.validatePlatform(FB.state);
      return facts;
    })).toEqual({ name:'Clovis', id:true, born:466, tier:6, culture:'frankish', faith:'germanic_pagan',
      form:'regnum', location:'laon', settlement:0, source:'franks_493', unique:1, adopted:true,
      gold:true, owners:true, holders:true, family:true, theuderic:1, retained:true, valid:true });
  });
}

for (const id of CAMPAIGNS) {
  test(id + ' follows the adopted ruler and respects refusal, ordinary war and changed possession', async function ({ page }, info) {
    await startClovis(page, info);
    const result = await page.evaluate(function (id) {
      let s = FB.state;
      const story = FB.stories.get(id), def = FB.stories.definition(s,FBDATA.storyCampaigns493[id]);
      const mapped = def.actor.realmId === 'player' && def.conditions[0].realmId === 'player';
      s.date = { year:def.firstYear, season:0, day:1 }; s.turn = (def.firstYear-493)*360;
      const pending = JSON.parse(FB.save.serialize());
      const owners = JSON.stringify(s.owner), wars = JSON.stringify(s.wars);
      story.day(s,s.stories[id]);
      const waits = s.stories[id].phase === 'pending' && wars === JSON.stringify(s.wars);
      const declined = FB.stories.apply(s,id,'leave_campaign',FB.stories.quote(s,id,'leave_campaign'));
      const refused = s.stories[id].result === 'diverted' && s.stories[id].reason === 'player_declined';
      const noAward = owners === JSON.stringify(s.owner) && wars === JSON.stringify(s.wars);
      const closed = JSON.stringify(s.stories[id]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      story.day(FB.state,FB.state.stories[id]);
      const durable = closed === JSON.stringify(FB.state.stories[id]);
      FB.save.restore(pending); s = FB.state;
      const accepted = FB.stories.apply(s,id,'face_campaign',FB.stories.quote(s,id,'face_campaign'));
      const rec = s.stories[id], ordinary = !!FB.ordinaryWarById(s,rec.warId);
      const actor = rec.actorId === s.player.charId;
      const noInstantAward = owners === JSON.stringify(s.owner);
      // Stage the canonical conquest boundary, without daily siege simulation.
      FB.transferProvince(s,def.target.provinceId,'player');
      FB.settleOrdinaryWar(s,rec.warId,'victory'); story.day(s,rec);
      const won = rec.result;
      const pagan = s.chars[s.player.charId].religion === 'germanic_pagan' && s.realms.player.religion === 'germanic_pagan';
      FB.save.restore(pending); s = FB.state;
      FB.transferProvince(s,'laon','armorica_493');
      const changed = JSON.stringify(s.owner);
      story.day(s,s.stories[id]);
      return { mapped:mapped, waits:waits, declined:declined, refused:refused, noAward:noAward, durable:durable,
        accepted:accepted, ordinary:ordinary, actor:actor, noInstantAward:noInstantAward, won:won, pagan:pagan,
        divergence:s.stories[id].result, noExtraAward:changed === JSON.stringify(s.owner) };
    }, id);
    expect(result).toEqual({ mapped:true, waits:true, declined:true, refused:true, noAward:true, durable:true,
      accepted:true, ordinary:true, actor:true, noInstantAward:true, won:'won', pagan:true,
      divergence:'diverted', noExtraAward:true });
  });
}

test('Clovis uses ordinary conversion prices, stale reviews, household scope and persistence', async function ({ page }, info) {
  await startClovis(page, info);
  const result = await page.evaluate(function () {
    let s = FB.state;
    const initial = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const unavailable = FB.rulerFaithConversionStatus(s,'player','nicene');
    const refused = FB.applyRulerFaithConversion(s,'player','nicene',unavailable);
    const pure = initial === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    // Fund only this transaction test, leaving shipped start resources unchanged.
    s.player.piety = 10000; s.player.prestige = 10000;
    const q = FB.rulerFaithConversionStatus(s,'player','nicene');
    s.player.piety--;
    const beforeStale = JSON.stringify(s);
    const stale = FB.applyRulerFaithConversion(s,'player','nicene',q);
    const stalePure = beforeStale === JSON.stringify(s);
    const war = FB.registerOrdinaryWar(s,'player',{ enemy:'alamanni_493', target:'strasbourg' });
    const atWar = JSON.stringify(s);
    const peaceRequired = !FB.rulerFaithConversionStatus(s,'player','nicene').ok &&
      !FB.applyRulerFaithConversion(s,'player','nicene') && atWar === JSON.stringify(s);
    FB.settleOrdinaryWar(s,war.id,'defeat');
    const reviewed = FB.rulerFaithConversionStatus(s,'player','nicene');
    const piety = s.player.piety, prestige = s.player.prestige, gold = s.player.gold;
    const identities = JSON.stringify([s.owner,s.holder,s.population,
      s.authority.governments.player.legalIdentityId,s.authority.governments.player.eliteCultureId]);
    const applied = FB.applyRulerFaithConversion(s,'player','nicene',reviewed);
    const paid = s.player.piety === piety-reviewed.pietyCost && s.player.prestige === prestige-reviewed.prestigeCost && s.player.gold === gold;
    const unchanged = identities === JSON.stringify([s.owner,s.holder,s.population,
      s.authority.governments.player.legalIdentityId,s.authority.governments.player.eliteCultureId]);
    const household = reviewed.householdIds.every(function (id) { return s.chars[id].religion === 'nicene'; });
    const faith = s.realms.player.religion, elite = s.authority.governments.player.eliteFaithId;
    const checkpoint = JSON.parse(FB.save.serialize());
    const beforeRepeat = JSON.stringify(s);
    const repeated = FB.applyRulerFaithConversion(s,'player','homoian');
    const repeatPure = beforeRepeat === JSON.stringify(s);
    FBDATA.bookmarks['493'].hidden = true;
    FBDATA.startScenarios.find(function (sc) { return sc.id === 'clovis_493'; }).hidden = true;
    FB.activateBookmark('867'); FB.save.restore(checkpoint); s = FB.state;
    return { initially:unavailable.ok, refused:refused, pure:pure, encountered:q.encountered, ready:q.ok,
      stale:stale, stalePure:stalePure, peaceRequired:peaceRequired, applied:applied, paid:paid, unchanged:unchanged,
      household:household, faith:faith, elite:elite, repeated:repeated, repeatPure:repeatPure,
      retained:JSON.stringify(s.rulerFaithDecisions) === JSON.stringify(checkpoint.state.rulerFaithDecisions) &&
        s.player.piety === checkpoint.state.player.piety && s.player.prestige === checkpoint.state.player.prestige &&
        s.chars[s.player.charId].religion === 'nicene', valid:FB.save.v4.validatePlatform(s) };
  });
  expect(result).toEqual({ initially:false, refused:false, pure:true, encountered:true, ready:true,
    stale:false, stalePure:true, peaceRequired:true, applied:true, paid:true, unchanged:true, household:true,
    faith:'nicene', elite:'nicene', repeated:false, repeatPure:true, retained:true, valid:true });
});
