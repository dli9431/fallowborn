'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { useReleasedStartRules } = require('../support/game/released-starts');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['index.html', 'data/starts_rulers_800.js', 'data/story_ruler_agendas_800.js',
  'data/starts_courts_800.js', 'data/story_instances.js', 'data/bookmark_800.js',
  'data/bookmark_800_history.js', 'data/bookmark_800_expansion.js', 'data/government_rollout.js',
  'data/islamic_rollout.js', 'js/starts.js', 'js/main.js', 'js/world.js', 'js/stories.js',
  'js/story_ruler_agenda.js', 'js/story_settlements.js', 'js/royal_settlements.js',
  'js/save.js', 'js/save_v4.js', 'js/travel.js', 'js/ui_misc.js', 'js/ui_modals.js']);

const rulers = [
  { id:'charlemagne_800', name:'Charlemagne', realm:'carolingian_800', county:'roma',
    capital:'aachen', site:'roma', tier:7, rank:4, born:748, agenda:'charlemagne_agenda_800',
    liege:null, children:['Charles'], spouse:false },
  { id:'louis_800', name:'Louis', realm:'aquitaine', county:'bordeaux',
    capital:'bordeaux', site:'bordeaux', tier:6, rank:3, born:778, agenda:'louis_agenda_800',
    liege:'carolingian_800', children:['Lothair','Pippin'], spouse:true }
];

async function beginRuler(page, info, row, code) {
  await useReleasedStartRules(page);
  await openGame(page, info);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  if (code) {
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('CAROL-800-' + row.id + '-' + row.county + '-m-' + row.name + '-standard');
    await page.locator('#ng-seed').press('Enter');
  } else {
    await page.locator('#bookmarklist [data-bookmark="800"]').click();
    await page.locator('[data-scenario="' + row.id + '"]').click();
  }
  await expect(page.locator('#cg-name')).toHaveValue(row.name);
  await expect(page.locator('#cg-name')).toHaveAttribute('readonly', '');
  await expect(page.locator('input[name=cg-family]')).toHaveCount(1);
  await page.evaluate(function (realmId) {
    const adopt = FB.adoptStartingRealm;
    FB.adoptStartingRealm = function (s, scenario, options) {
      const person = s.chars[s.player.charId], realm = s.realms[realmId];
      window.__carolingianOpening = { id:person.id, spouse:person.spouseId,
        children:person.childrenIds.slice(), owned:Object.keys(s.owner).filter(function (id) {
          return s.owner[id] === realmId;
        }).sort(), treasury:realm.treasury.gold };
      FB.adoptStartingRealm = adopt;
      return adopt(s, scenario, options);
    };
  }, row.realm);
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

test('800 declarations preserve the effective world and have five bounded priority reviews', async function ({ page }, info) {
  await useReleasedStartRules(page);
  await openGame(page, info);
  expect(await page.evaluate(function () {
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const fresh = FB.bookmark('800'), rows = FBDATA.startScenarios_rulers_800;
    const agendas = rows.map(function (row) {
      const def = FBDATA.storyInstances[row.tracks[0]];
      return [def.type, def.subjectRealmId, def.stages.length,
        def.stages.every(function (stage) { return stage.choices.some(function (choice) {
          return choice.operation === 'agenda_priority';
        }); }), def.stages.every(function (stage) { return stage.choices.every(function (choice) {
          return choice.operation === 'agenda_priority' || choice.operation === 'agenda_finish';
        }); })];
    });
    return { revisionsValid:FB.bookmarkRevisions('800').every(function (b) { return FB.validateBookmark(b).length === 0; }),
      offered:rows.map(function (row) { return FB.startProvinceAllowed(row, fresh, row.fixedProvinceId); }),
      agendas:agendas, pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  })).toEqual({ revisionsValid:true, offered:[true,true],
    agendas:[['ruler_agenda','carolingian_800',5,true,true],['ruler_agenda','aquitaine',5,true,true]], pure:true });
});

for (const row of rulers) {
  for (const code of [false,true]) {
    test(row.id + ' adopts the existing ruler through ' + (code ? 'a code' : 'the picker'), async function ({ page }, info) {
      await beginRuler(page, info, row, code);
      expect(await page.evaluate(function (r) {
        const s = FB.state, me = s.chars[s.player.charId], old = window.__carolingianOpening;
        const currentChildren = me.childrenIds.map(function (id) { return s.chars[id] && s.chars[id].name; });
        const facts = { review:FBDATA.reviewOpenStarts, source:s.start.rulerRealmId,
          original:old.id === me.id, name:me.name, born:me.born, tier:s.player.tier, rank:s.realms.player.rank,
          form:FB.political.government(s,{kind:'realm',id:'player'}).formId,
          county:s.player.provinceId, site:FB.settlementsOf(s,r.county)[s.player.homeSettlement].site,
          capital:s.realms.player.capital, liege:s.player.liege, sourceGone:!s.realms[r.realm],
          single:Object.values(s.chars).filter(function (c) { return c.name === r.name && !c.dead; }).length,
          family:old.spouse === me.spouseId && JSON.stringify(old.children) === JSON.stringify(me.childrenIds),
          children:r.children.every(function (name) { return currentChildren.indexOf(name) >= 0; }),
          spouse:!!me.spouseId, territory:JSON.stringify(old.owned) === JSON.stringify(Object.keys(s.owner).filter(function (id) {
            return s.owner[id] === 'player';
          }).sort()),
          mapping:FB.startRealmId(s,r.realm), agenda:s.stories[r.agenda].subjectId === me.id,
          cast:s.stories.divisio_800.cast[r.id === 'charlemagne_800' ? 'charlemagne' : 'louis'] === me.id,
          settlementFamily:!!(s.realms.player.succession && s.realms.player.succession.settlementGenealogy),
          noDuplicateCrown:!s.realms[r.realm], papalRome:s.owner.roma === 'papacy' };
        const snapshot = JSON.stringify([s.start,s.player,s.chars,s.owner,s.holder,s.stories]);
        const saved = JSON.parse(FB.save.serialize()); FB.activateBookmark('1066'); FB.save.restore(saved);
        facts.restored = snapshot === JSON.stringify([FB.state.start,FB.state.player,FB.state.chars,
          FB.state.owner,FB.state.holder,FB.state.stories]);
        return facts;
      }, row)).toEqual({ review:false, source:row.realm, original:true, name:row.name,
        born:row.born, tier:row.tier, rank:row.rank, form:'territorial', county:row.county,
        site:row.site, capital:row.capital, liege:row.liege, sourceGone:true, single:1,
        family:true, children:true, spouse:row.spouse, territory:true, mapping:'player',
        agenda:true, cast:true, settlementFamily:true, noDuplicateCrown:true, papalRome:true, restored:true });
    });
  }

  test(row.id + ' reviews five dates without changing land, people or resources', async function ({ page }, info) {
    await beginRuler(page, info, row, true);
    expect(await page.evaluate(function (r) {
      const s = FB.state, def = FBDATA.rulerAgendas_800[r.agenda], record = s.stories[r.agenda];
      const before = JSON.stringify([s.owner,s.holder,s.player.gold,s.chars,s.armies]);
      const progress = [], repeats = [];
      def.stages.forEach(function (stage) {
        s.date = {year:stage.year,season:stage.season,day:1}; s.turn++;
        const id = stage.choices[1].id, quote = FB.stories.quote(s,r.agenda,id);
        progress.push(FB.stories.apply(s,r.agenda,id,quote));
        repeats.push(FB.stories.apply(s,r.agenda,id,quote));
      });
      const facts = { progress:progress, repeats:repeats, status:record.status,
        decisions:record.decisions.length, unchanged:before === JSON.stringify([s.owner,s.holder,s.player.gold,s.chars,s.armies]) };
      const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      facts.restored = FB.state.stories[r.agenda].status;
      return facts;
    }, row)).toEqual({ progress:[true,true,true,true,true], repeats:[false,false,false,false,false],
      status:'agenda_complete', decisions:5, unchanged:true, restored:'agenda_complete' });
  });

  test(row.id + ' interrupts an unfinished agenda when the original ruler dies', async function ({ page }, info) {
    await beginRuler(page, info, row, false);
    expect(await page.evaluate(function (r) {
      const s = FB.state, story = s.stories[r.agenda];
      s.chars[s.player.charId].dead = true;
      FB.stories.get(r.agenda).day(s,story);
      return [story.status,FB.stories.choices(s,r.agenda).length];
    }, row)).toEqual(['agenda_interrupted',0]);
  });
}
