'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { startHistoricalGame } = require('../support/game/historical-start');
const { useReleasedStartRules } = require('../support/game/released-starts');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html', 'data/starts_laskaris_1204.js', 'data/starts.js',
  'data/bookmark_1204.js', 'data/bookmark_1204_terrain.js', 'data/bookmark_1204_campaigns.js',
  'data/story_instances.js', 'data/communal_revisions.js', 'data/government_rollout.js',
  'data/story_households_1204.js', 'data/story_ruler_agendas.js', 'data/start_ambitions.js',
  'data/eras.js', 'data/political_institutions.js', 'js/starts.js', 'js/main.js', 'js/mods.js', 'js/world.js', 'js/model.js',
  'js/governments.js', 'js/station.js', 'js/armies.js',
  'js/stories.js', 'js/story_campaign.js', 'js/story_household.js', 'js/story_ruler_agenda.js',
  'js/wars.js', 'js/treasury.js', 'js/save.js', 'js/save_v4.js',
  'js/ui_misc.js', 'js/ui_panels.js', 'js/ui_modals.js']);

async function beginLaskaris(page, info, revision, throughCard) {
  await useReleasedStartRules(page);
  await openGame(page, info);
  await page.evaluate(function (revision) {
    if (revision) FBDATA.bookmarks['1204'].revision = revision;
    const adopt = FB.adoptStartingRealm;
    FB.adoptStartingRealm = function (s, sc) {
      try {
        const me = s.chars[s.player.charId], realm = s.realms[sc.rulerRealmId];
        window.__laskarisCourt = JSON.parse(JSON.stringify({
          id:me.id, name:me.name, born:me.born, dyn:me.dyn, skills:me.skills,
          spouse:me.spouseId, children:me.childrenIds,
          treasury:realm.treasury.gold, rank:realm.rank, liege:realm.liege || null,
          owned:Object.keys(s.owner).filter(function (id) { return s.owner[id] === sc.rulerRealmId; }).sort(),
          held:Object.keys(s.holder).filter(function (id) { return s.holder[id] === sc.rulerRealmId; }).sort()
        }));
        return adopt(s, sc);
      } finally { FB.adoptStartingRealm = adopt; }
    };
  }, revision || null);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#bookmarklist [data-bookmark="1204"]').click();
  const card = page.getByRole('button', { name:'Theodore Laskaris at Nicaea', exact:true });
  await expect(card).toBeVisible();
  await expect(page.locator('#scenariolist .scen-group').first()).toHaveText('Historical starts');
  if (throughCard) await card.click();
  else {
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('LASKARIS-1204-laskaris_1204-nicaea-m-Theodore_Laskaris');
    await page.locator('#ng-seed').press('Enter');
  }
  await expect(page.locator('#cg-name')).toHaveValue('Theodore Laskaris');
  await expect(page.locator('#cg-name')).toHaveAttribute('readonly', '');
  await expect(page.locator('#cg-community')).toHaveClass(/hidden/);
  await expect(page.locator('input[name=cg-family]')).toHaveCount(1);
  await expect(page.locator('input[name=cg-family][value=standard]')).toBeChecked();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

for (const opening of [{ revision:'baseline', card:true }, { revision:'inhabited_v2', card:false }]) {
  test(opening.revision + ' adopts the seeded court and restores its existing family and resources', async function ({ page }, info) {
    await beginLaskaris(page, info, opening.revision, opening.card);
    expect(await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId], before = window.__laskarisCourt;
      const identity = { id:me.id, name:me.name, born:me.born, dyn:me.dyn, skills:me.skills,
        spouse:me.spouseId, children:me.childrenIds };
      const previous = { id:before.id, name:before.name, born:before.born, dyn:before.dyn, skills:before.skills,
        spouse:before.spouse, children:before.children };
      const facts = { identity:JSON.stringify(identity) === JSON.stringify(previous),
        name:me.name, age:FB.ageOf(me,s.date.year), culture:me.culture, religion:me.religion,
        tier:s.player.tier, rank:s.realms.player.rank, form:FB.governments.forRealm(s,'player').id,
        home:s.player.provinceId, settlement:s.player.homeSettlement,
        site:FB.world.byId.nicaea.settlements[s.player.homeSettlement].site,
        original:s.start.rulerRealmId, scenario:s.start.scenarioId, revision:s.start.revision,
        single:Object.values(s.chars).filter(function (c) { return c.name === 'Theodore Laskaris' && !c.dead; }).length === 1,
        sourceRemoved:!s.realms.nicaea_1204, treasury:s.player.gold === before.treasury,
        liege:(s.player.liege || null) === before.liege,
        owned:JSON.stringify(Object.keys(s.owner).filter(function (id) { return s.owner[id] === 'player'; }).sort()) === JSON.stringify(before.owned),
        held:JSON.stringify(Object.keys(s.holder).filter(function (id) { return s.holder[id] === 'player'; }).sort()) === JSON.stringify(before.held),
        noHouseholdTrack:!s.stories.constantinople_household_track_1204,
        campaigns:['latin_bithynia_1204','nicaean_return_1204'].every(function (id) { return s.stories[id].phase === 'pending'; }) };
      const saved = JSON.parse(FB.save.serialize());
      function snapshot(state) {
        const c = state.chars[state.player.charId];
        return [state.start,state.owner,state.holder,state.player.gold,state.player.liege,
          c.id,c.dyn,c.skills,c.spouseId,c.childrenIds,Object.keys(state.chars).sort(),state.stories];
      }
      const checkpoint = JSON.stringify(snapshot(saved.state));
      FB.activateBookmark('867'); FB.save.restore(saved);
      facts.restored = checkpoint === JSON.stringify(snapshot(FB.state));
      return facts;
    })).toMatchObject({ identity:true, name:'Theodore Laskaris', age:29, culture:'greek', religion:'orthodox',
      tier:6, rank:3, form:'territorial', home:'nicaea', settlement:0, site:'nicaea_head', original:'nicaea_1204',
      scenario:'laskaris_1204', revision:opening.revision, single:true, sourceRemoved:true, treasury:true,
      liege:true, owned:true, held:true, noHouseholdTrack:true, campaigns:true, restored:true });
  });
}

test('all offering revisions validate, while a mismatched court is rejected without mutation', async function ({ page }, info) {
  await openGame(page, info);
  const result = await page.evaluate(function () {
    const sc = FBDATA.startScenarios_laskaris_1204[0], before = JSON.stringify(FBDATA);
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const revisions = FB.bookmarkRevisions('1204',FBDATA.bookmarks['1204']).map(function (bm) {
      return { id:bm.revision, errors:FB.validateBookmark(bm) };
    });
    const valid = FB.mods.validate({ name:'Nicaean opening', startScenarios:[JSON.parse(JSON.stringify(sc))] });
    const mismatches = { characterName:'Another ruler', startCulture:'latin', startReligion:'catholic',
      sex:'f', governmentForm:'regnum', tier:5, rulerRealmId:'latin_1204' };
    const rejected = Object.keys(mismatches).map(function (field) {
      const copy = JSON.parse(JSON.stringify(sc)); copy[field] = mismatches[field];
      return FB.mods.validate({ name:'Mismatched court', startScenarios:[copy] }).length > 0;
    });
    const changed = JSON.parse(JSON.stringify(FB.bookmark('1204')));
    changed.realms.find(function (r) { return r.id === 'nicaea_1204'; }).ruler.name = 'Another ruler';
    return { revisions, valid, rejected, changed:FB.validateBookmark(changed).length > 0,
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result.revisions.length).toBeGreaterThan(1);
  for (const row of result.revisions) expect(row.errors, row.id).toEqual([]);
  expect(result).toMatchObject({ valid:[], rejected:[true,true,true,true,true,true,true], changed:true, pure:true });
});

for (const bad of [{ date:'1066', county:'nicaea' }, { date:'1204', county:'constantinople' }]) {
  test('start code and direct creation reject ' + bad.date + '/' + bad.county, async function ({ page }, info) {
    await useReleasedStartRules(page);
    await openGame(page, info);
    const full = page.locator('#btn-choose-beginning');
    if (await full.isVisible()) await full.click();
    else await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#bookmarklist [data-bookmark="1066"]').click();
    await expect(page.getByRole('button', { name:'Theodore Laskaris at Nicaea', exact:true })).toHaveCount(0);
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('LASKARIS-' + bad.date + '-laskaris_1204-' + bad.county + '-m-Theodore_Laskaris');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
    expect(await page.evaluate(function (bad) {
      FB.activateBookmark(bad.date);
      const before = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
      FB.game.pending = { scenario:FBDATA.startScenarios_laskaris_1204[0], seed:'LASKARIS',
        bookmarkId:bad.date, provinceId:bad.county };
      return { rejected:FB.game.start() === false,
        pure:before === FB.state && rng === FB.getRngState() && uid === FB.getUidCounter() };
    }, bad)).toEqual({ rejected:true, pure:true });
  });
}

for (const id of ['latin_bithynia_1204','nicaean_return_1204']) {
  test(id + ' follows the adopted court and waits for its reviewed decision', async function ({ page }, info) {
    await beginLaskaris(page, info);
    expect(await page.evaluate(function (id) {
      const s = FB.state, story = FB.stories.get(id), rec = s.stories[id];
      const authored = FBDATA.bookmarkContent['1204'].campaigns[id];
      const def = FB.stories.definition(s,authored);
      const mapping = id === 'latin_bithynia_1204' ? def.target.ownerIds[0] === 'player'
        : def.actor.realmId === 'player' && def.conditions[0].realmId === 'player';
      const early = id !== 'nicaean_return_1204' || FB.stories.choices(s,id).length === 0;
      // Stage the campaign's own opening boundary; no daily simulation or historical victory.
      s.date.year = authored.firstYear;
      s.turn = (authored.firstYear-1204)*360;
      const unchanged = JSON.stringify([s.owner,s.holder,s.wars,s.player.gold]);
      story.day(s,rec);
      const waits = rec.phase === 'pending' && unchanged === JSON.stringify([s.owner,s.holder,s.wars,s.player.gold]);
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const choices = FB.stories.choices(s,id).map(function (c) { return c.id; });
      const q = FB.stories.quote(s,id,'face_campaign');
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      s.player.gold++;
      const staleState = JSON.stringify(s), stale = FB.stories.apply(s,id,'face_campaign',q);
      const stalePure = staleState === JSON.stringify(s);
      const checkpoint = JSON.parse(FB.save.serialize());
      const accepted = FB.stories.apply(s,id,'face_campaign',FB.stories.quote(s,id,'face_campaign'));
      const war = FB.ordinaryWarById(s,rec.warId);
      const retainedOwner = s.owner[def.target.provinceId] === q.facts.owner;
      const repeated = FB.stories.apply(s,id,'face_campaign',FB.stories.quote(s,id,'face_campaign'));
      // Stage the canonical war-settlement boundary to test the campaign observer.
      FB.transferProvince(s,def.target.provinceId,def.actor.realmId);
      FB.settleOrdinaryWar(s,rec.warId,def.actor.realmId === 'player' ? 'victory' : 'defeat'); story.day(s,rec);
      const won = rec.phase === 'resolved' && rec.result === 'won';
      const finished = JSON.parse(FB.save.serialize());
      FB.save.restore(finished);
      const resumed = JSON.stringify(FB.state.stories[id]) === JSON.stringify(finished.state.stories[id]);
      FB.save.restore(checkpoint);
      const restored = FB.state, baseline = JSON.stringify([restored.owner,restored.holder,restored.wars,restored.player.gold]);
      const declined = FB.stories.apply(restored,id,'leave_campaign',FB.stories.quote(restored,id,'leave_campaign'));
      return { mapping, early, waits, choices, allowed:q.allowed, pure, stale, stalePure, accepted,
        war:!!war, retainedOwner, repeated, won, resumed, declined,
        declineResult:restored.stories[id].reason,
        declinePure:baseline === JSON.stringify([restored.owner,restored.holder,restored.wars,restored.player.gold]),
        unique:FB.stories.attached(restored).filter(function (candidate) { return candidate === id; }).length };
    }, id)).toEqual({ mapping:true, early:true, waits:true, choices:['face_campaign','leave_campaign'],
      allowed:true, pure:true, stale:false, stalePure:true, accepted:true, war:true, retainedOwner:true,
      repeated:false, won:true, resumed:true, declined:true, declineResult:'player_declined', declinePure:true, unique:1 });
  });
}

test('the Constantinople household keeps the Nicaean court independent and its own storyline', async function ({ page }, info) {
  await beginBookmark(page, info, '1204', 'constantinople_household_1204');
  expect(await page.evaluate(function () {
    const s = FB.state;
    const def = FB.stories.definition(s,FBDATA.bookmarkContent['1204'].campaigns.nicaean_return_1204);
    return { noAdoption:!s.start.rulerRealmId, court:!!s.realms.nicaea_1204,
      actor:def.actor.realmId, home:s.player.provinceId,
      track:!!s.stories.constantinople_household_track_1204,
      noNicaeanChoices:FB.stories.choices(s,'nicaean_return_1204').length === 0 };
  })).toEqual({ noAdoption:true, court:true, actor:'nicaea_1204', home:'constantinople', track:true, noNicaeanChoices:true });
});

for (const court of [
  { id:'muhammad_1204', realm:'khwarazm_1204', place:'gurganj_district', name:'Muhammad_II', form:'regnum', tier:6 },
  { id:'siwa_delegate_1204', realm:'siwa_households_1204', place:'siwa_oasis', name:'Delegate', form:'assembly_polity', tier:1 }
]) {
  test(court.id + ' retains its separate authority and the original Nicaean campaign references', async function ({ page }, info) {
    await useReleasedStartRules(page);
    await startHistoricalGame(page, info, { bookmark:'1204',
      code:'OTHERCOURT-1204-' + court.id + '-' + court.place + '-m-' + court.name });
    expect(await page.evaluate(function (court) {
      const s = FB.state, rid = court.form === 'assembly_polity' ? court.realm : 'player';
      const def = FB.stories.definition(s,FBDATA.bookmarkContent['1204'].campaigns.nicaean_return_1204);
      return { scenario:s.start.scenarioId, source:s.start.rulerRealmId, home:s.player.provinceId,
        tier:s.player.tier, form:FB.governments.forRealm(s,rid).id,
        nicaea:!!s.realms.nicaea_1204, actor:def.actor.realmId,
        noChoice:FB.stories.choices(s,'latin_bithynia_1204').length === 0 };
    }, court)).toEqual({ scenario:court.id, source:court.realm, home:court.place, tier:court.tier,
      form:court.form, nicaea:true, actor:'nicaea_1204', noChoice:true });
  });
}
