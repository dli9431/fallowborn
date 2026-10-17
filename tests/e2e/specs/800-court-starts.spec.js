'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { useReleasedStartRules } = require('../support/game/released-starts');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html', 'data/starts_courts_800.js', 'data/story_households_baghdad_800.js',
  'data/starts.js', 'data/bookmark_800.js', 'data/bookmark_800_expansion.js', 'data/bookmark_800_history.js',
  'data/government_rollout.js', 'data/islamic_rollout.js', 'data/political_institutions.js', 'data/travel.js',
  'js/starts.js', 'js/main.js', 'js/mods.js', 'js/world.js', 'js/model.js', 'js/stories.js',
  'js/story_settlements.js', 'js/story_campaign.js', 'js/story_household.js', 'js/royal_settlements.js',
  'js/government_administration.js', 'js/treasury.js', 'js/travel.js', 'js/save.js', 'js/save_v4.js',
  'js/ui_misc.js', 'js/ui_panels.js', 'js/ui_modals.js']);

const COURTS = [
  { id:'harun_800', realm:'abbasid', home:'raqqa', capital:'baghdad', site:'raqqa_800',
    name:'Harun al-Rashid', sex:'m', age:34, culture:'arabic', faith:'sunni', profile:'abbasid_800' },
  { id:'irene_800', realm:'byzantium', home:'constantinople', capital:'constantinople', site:'constantinople',
    name:'Irene', sex:'f', age:48, culture:'greek', faith:'orthodox', profile:'byzantine_800' }
];

async function datePicker(page, info) {
  await useReleasedStartRules(page);
  await openGame(page, info);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#bookmarklist [data-bookmark="800"]').click();
}

async function startCourt(page, info, court, method) {
  await datePicker(page, info);
  await expect(page.locator('[data-scenario="' + court.id + '"]')).toBeVisible();
  if (method === 'picker') await page.locator('[data-scenario="' + court.id + '"]').click();
  else {
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('COURT-800-' + court.id + '-' + court.home + '-' + court.sex + '-' + court.name.replace(/-/g, '').replace(/ /g, '_'));
    await page.locator('#ng-seed').press('Enter');
  }
  await expect(page.locator('#cg-name')).toHaveValue(court.name);
  await expect(page.locator('#cg-name')).toHaveAttribute('readonly', '');
  await expect(page.locator('#cg-sex-row')).toBeHidden();
  await expect(page.locator('#cg-community')).toHaveClass(/hidden/);
  await page.evaluate(function () {
    const adopt = FB.adoptStartingRealm;
    FB.adoptStartingRealm = function (s, scenario) {
      const c = s.chars[s.player.charId], r = s.realms[scenario.rulerRealmId];
      window.__openingCourt = { id:c.id, spouse:c.spouseId, children:c.childrenIds.slice(),
        gold:r.treasury.gold, capital:r.capital, source:scenario.rulerRealmId };
      FB.adoptStartingRealm = adopt;
      return adopt(s, scenario);
    };
  });
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await page.evaluate(function () {
    FB.game.setPaused(true); FB.game.uiPrefs.hideTips = true;
    delete FB.state.player.flags.tutorial;
  });
}

for (const court of COURTS) {
  for (const method of ['picker','code']) {
    test(court.id + ' via ' + method + ' keeps its actual sovereign, household, government and saved realm', async function ({ page }, info) {
      await startCourt(page, info, court, method);
      expect(await page.evaluate(function (court) {
        const s = FB.state, p = s.player, c = s.chars[p.charId], old = window.__openingCourt;
        const originalCounties = FB.campaignBookmark(s).provinces.filter(function (pr) { return pr.realm === court.realm; })
          .map(function (pr) { return pr.id; }).sort();
        const actualCounties = Object.keys(s.owner).filter(function (id) { return s.owner[id] === 'player'; }).sort();
        const facts = { review:FBDATA.reviewOpenStarts, name:c.name, sex:c.sex, age:FB.ageOf(c,s.date.year),
          culture:c.culture, faith:c.religion, tier:p.tier, source:s.start.rulerRealmId,
          original:old.id === c.id, unique:Object.values(s.chars).filter(function (person) { return !person.dead && person.name === court.name; }).length,
          family:JSON.stringify([c.spouseId,c.childrenIds]) === JSON.stringify([old.spouse,old.children]),
          purse:p.gold === old.gold, home:p.provinceId, capital:s.realms.player.capital,
          site:FB.settlementsOf(s,p.provinceId)[p.homeSettlement].site,
          residents:FB.householdMembers(s).every(function (person) { return FB.characterResidence(s,person) === court.home; }),
          territory:JSON.stringify(originalCounties) === JSON.stringify(actualCounties),
          noDuplicate:!s.realms[court.realm], mapping:FB.startRealmId(s,court.realm),
          form:FB.political.government(s,{ kind:'realm',id:'player' }).formId,
          profile:s.realms.player.administrationProfileId,
          noCopyist:!s.stories.baghdad_copyist_track_800 };
        function snapshot(state) {
          const me = state.chars[state.player.charId];
          return [state.start,state.owner,state.holder,state.player.provinceId,state.player.homeSettlement,
            state.player.gold,state.realms.player,state.authority,state.stories,me.id,me.spouseId,me.childrenIds];
        }
        const saved = JSON.parse(FB.save.serialize()), before = JSON.stringify(snapshot(saved.state));
        FB.activateBookmark('1066'); FB.save.restore(saved);
        facts.restored = before === JSON.stringify(snapshot(FB.state));
        facts.restoredHome = FB.characterResidence(FB.state,FB.state.chars[FB.state.player.charId]);
        return facts;
      }, court)).toEqual({ review:false, name:court.name, sex:court.sex, age:court.age,
        culture:court.culture, faith:court.faith, tier:7, source:court.realm, original:true, unique:1,
        family:true, purse:true, home:court.home, capital:court.capital, site:court.site, residents:true,
        territory:true, noDuplicate:true, mapping:'player', form:'administrative_monarchy', profile:court.profile,
        noCopyist:true, restored:true, restoredHome:court.home });
    });
  }
}

test('all three 800 starts validate on each retained revision without changing declarations or RNG', async function ({ page }, info) {
  await useReleasedStartRules(page);
  await openGame(page, info);
  expect(await page.evaluate(function () {
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const starts = FBDATA.startScenarios_courts_800;
    const revisions = ['baseline'].concat(Object.keys(FBDATA.bookmarks['800'].revisions || {}));
    const errors = revisions.map(function (revision) {
      return FB.validateBookmark(FB.bookmark('800',revision));
    }).filter(function (rows) { return rows.length; });
    const imported = FB.mods.validate({ name:'Court openings', startScenarios:JSON.parse(JSON.stringify(starts)) });
    return { ids:starts.map(function (sc) { return sc.id; }), errors, imported,
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter(),
      locations:starts.map(function (sc) { return FB.startProvinceAllowed(sc,FB.bookmark('800'),sc.fixedProvinceId); }),
      absent:starts.every(function (sc) { return sc.bookmarkIds.length === 1 && sc.bookmarkIds[0] === '800'; }) };
  })).toEqual({ ids:['baghdad_copyist_800','harun_800','irene_800'], errors:[], imported:[], pure:true,
    locations:[true,true,true], absent:true });
});

test('codes and direct creation reject a different county or date and only standard court families are offered', async function ({ page }, info) {
  await datePicker(page, info);
  await page.locator('#btn-bm-seed').click();
  for (const code of ['BAD-800-harun_800-baghdad-m-Harun', 'BAD-800-irene_800-raqqa-f-Irene',
    'BAD-867-harun_800-raqqa-m-Harun', 'BAD-800-irene_800-constantinople-f-Irene-established']) {
    await page.locator('#ng-seed').fill(code);
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
    await expect(page.locator('#ng-seed-err')).not.toBeEmpty();
  }
  expect(await page.evaluate(function () {
    FB.activateBookmark('800');
    const sc = FBDATA.startScenarios.find(function (row) { return row.id === 'harun_800'; });
    FB.game.pending = { scenario:sc, bookmarkId:'800', seed:'BAD', provinceId:'baghdad' };
    return { accepted:FB.game.start(), families:Object.keys(sc.familyPresets) };
  })).toEqual({ accepted:false, families:['standard'] });
});

test('Harun governs from Raqqa while gift, campaign and journey references retain their real owners', async function ({ page }, info) {
  await startCourt(page, info, COURTS[0], 'code');
  expect(await page.evaluate(function () {
    const s = FB.state, cast = s.stories.divisio_800.cast;
    const gifts = FB.stories.definition(s,FBDATA.storyInstances.gifts_800);
    const campaign = FB.stories.definition(s,FBDATA.storyInstances.abbasid_anatolia_800);
    const original = JSON.stringify(FBDATA.storyInstances);
    const me = s.chars[s.player.charId];
    const facts = { actor:cast.harun === me.id, ruler:FB.stories.ruler(s,'abbasid').id === me.id,
      giftRealm:gifts.source.realmId, giftCapital:gifts.source.capital,
      giftActor:FB.stories.resolve(s,gifts.source.character) === me.id,
      campaignActor:campaign.actor.realmId, target:campaign.target.ownerIds,
      local:FB.topRealm(s,s.owner.raqqa), capital:s.realms.player.capital,
      profile:!!FB.administrationProfile(s,'player') };
    // Stage the dated diplomatic boundary rather than advancing a year.
    s.date = { year:801,season:0,day:1 }; s.turn = 66;
    const q = FB.stories.quote(s,'gifts_800','approve');
    s.player.gold = 0;
    const poor = FB.stories.quote(s,'gifts_800','approve').allowed;
    const restored = JSON.parse(FB.save.serialize());
    FB.save.restore(restored);
    facts.funded = q.allowed; facts.poor = poor;
    facts.definitions = original === JSON.stringify(FBDATA.storyInstances);
    return facts;
  })).toEqual({ actor:true, ruler:true, giftRealm:'player', giftCapital:'baghdad', giftActor:true,
    campaignActor:'player', target:['byzantium'], local:'player', capital:'baghdad', profile:true,
    funded:true, poor:false, definitions:true });
  await page.locator('[data-tab="prov"]').click();
  await expect(page.locator('#tab-prov')).toContainText('Raqqa');
  expect(await page.evaluate(function () {
    const s = FB.state;
    s.player.gold = 1000;
    const q = FB.travelSiteSnapshot(s,'study_constantinople');
    const went = !!q && FB.travelStart(s,q.purpose,q.destinationId,q.destinationRealm);
    return { went, home:s.player.provinceId, origin:s.player.travel && s.player.travel.homeId,
      capital:s.realms.player.capital, route:!!q && JSON.stringify(q.route) === JSON.stringify(FB.travelRoute('raqqa','constantinople')) };
  })).toEqual({ went:true, home:'raqqa', origin:'raqqa', capital:'baghdad', route:true });
});
