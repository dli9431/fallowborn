'use strict';
const {installRestoreFacts} = require('../support/game/restore-facts');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { useReleasedStartRules } = require('../support/game/released-starts');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['js/bookmark_composition.js','index.html', 'data/starts_rulers_711.js', 'data/story_ruler_agendas_711.js',
  'data/bookmark_711.js', 'data/bookmark_711_terrain.js', 'data/government_rollout.js',
  'data/story_campaigns_711.js', 'data/story_households_crossing_711.js', 'data/story_households_711.js',
  'data/starts_crossing_711.js', 'data/political_institutions.js', 'data/story_instances.js',
  'js/starts.js', 'js/main.js', 'js/world.js', 'js/stories.js', 'js/story_campaign.js',
  'js/story_ruler_agenda.js', 'js/story_government_selection.js', 'js/save.js', 'js/save_v4.js']);

const rulers = [
  { id:'roderic_711', name:'Roderic', realm:'visigoths_711', home:'toledo', site:'toledo_711',
    culture:'gothic', faith:'catholic', form:'elective_monarchy', tier:6, rank:3,
    agenda:'roderic_agenda_711', source:'toledo_campaign_711', liege:null },
  { id:'tariq_711', name:'Tariq ibn Ziyad', realm:'tangier_711', home:'tangier', site:'tangier_711',
    culture:'berber', faith:'umayyad_sunni_711', form:'territorial', tier:5, rank:2,
    agenda:'tariq_agenda_711', source:'strait_crossing_711', liege:'ifriqiya_711' }
];

// Keep activation outside the synchronous restore guard, then resume the proof.
async function evaluateAcrossBookmark(page, compute, argument) {
  await installRestoreFacts(page);
  await page.evaluate(compute, argument);
  const checkpoint = await page.evaluate(function () { return window.__startRestoreSave; });
  await restoreBookmark(page, checkpoint);
  expect(await page.evaluate(function () {
    return [FB.getRngState() >>> 0, FB.getUidCounter()];
  })).toEqual(await page.evaluate(function () { return window.__startRestoreSequence; }));
  return page.evaluate(function () { return window.__afterStartRestore(); });
}

async function beginRuler(page, info, row, code) {
  await useReleasedStartRules(page);
  await openGame(page, info);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  if (code) {
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('RULER-711-' + row.id + '-' + row.home + '-m-' + row.name.replace(/ /g, '_') + '-standard');
    await page.locator('#ng-seed').press('Enter');
  } else {
    await page.locator('#bookmarklist [data-bookmark="711"]').click();
    await page.locator('[data-scenario="' + row.id + '"]').click();
  }
  await expect(page.locator('#cg-name')).toHaveValue(row.name);
  await expect(page.locator('#cg-name')).toHaveAttribute('readonly', '');
  await expect(page.locator('input[name=cg-family]')).toHaveCount(1);
  await page.evaluate(function (realmId) {
    const adopt = FB.adoptStartingRealm;
    FB.adoptStartingRealm = function (s, scenario, options) {
      const c = s.chars[s.player.charId], r = s.realms[realmId];
      window.__openingRuler711 = { id:c.id, spouse:c.spouseId, children:c.childrenIds.slice(),
        gold:r.treasury.gold, owned:Object.keys(s.owner).filter(function (id) { return s.owner[id] === realmId; }).sort(),
        held:Object.keys(s.holder).filter(function (id) { return s.holder[id] === realmId; }).sort() };
      FB.adoptStartingRealm = adopt;
      return adopt(s, scenario, options);
    };
  }, row.realm);
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

test('both ruler declarations are pure, date-bound and retain all 711 revisions', async function ({ page }, info) {
  await useReleasedStartRules(page);
  await openGame(page, info);
  expect(await page.evaluate(function () {
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const rows = FBDATA.startScenarios_rulers_711;
    const worlds = FB.bookmarkRevisions('711');
    const valid = worlds.length > 0 && worlds.every(function (world) { return FB.validateBookmark(world).length === 0; });
    return { ids:rows.map(function (r) { return r.id; }), valid:valid,
      allowed:rows.map(function (r) { return FB.startProvinceAllowed(r, FB.bookmark('711'), r.fixedProvinceId); }),
      dateOnly:rows.every(function (r) { return JSON.stringify(r.bookmarkIds) === '["711"]'; }),
      oneFamily:rows.every(function (r) { return JSON.stringify(Object.keys(r.familyPresets)) === '["standard"]'; }),
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  })).toEqual({ ids:['roderic_711','tariq_711'], valid:true, allowed:[true,true],
    dateOnly:true, oneFamily:true, pure:true });
});

for (const row of rulers) {
  for (const code of [false, true]) {
    test(row.id + ' adopts its original court via ' + (code ? 'start code' : 'picker') + ' and restores it', async function ({ page }, info) {
      await beginRuler(page, info, row, code);
      expect(await evaluateAcrossBookmark(page, function (r) {
        const s = FB.state, me = s.chars[s.player.charId], old = window.__openingRuler711;
        const original = old.owned;
        const actual = Object.keys(s.owner).filter(function (id) { return s.owner[id] === 'player'; }).sort();
        const source = FB.stories.definition(s, FBDATA.storyCampaigns711[r.source]);
        const site = FB.settlementsOf(s, r.home)[s.player.homeSettlement].site;
        const snap = function (state) { return [state.start,state.owner,state.holder,state.player,state.chars,state.realms,state.stories]; };
        const saved = JSON.parse(FB.save.serialize()), before = window.restoreFacts(FB.state,snap);
        window.__startRestoreSave = JSON.stringify(saved);
        window.__startRestoreSequence = [FB.getRngState() >>> 0, FB.getUidCounter()];
        FB.activateBookmark('1066');
        window.__afterStartRestore = function () {
          return { name:me.name, age:FB.ageOf(me,s.date.year), culture:me.culture, faith:me.religion,
            home:s.player.provinceId, site:site, tier:s.player.tier, rank:s.realms.player.rank,
            adopted:me.id === old.id && me.spouseId === old.spouse && JSON.stringify(me.childrenIds) === JSON.stringify(old.children),
            purse:s.player.gold === (r.id === 'roderic_711' ? FBDATA.startScenarios_rulers_711[0].gold : old.gold),
            publicCrown:r.id !== 'roderic_711' || !!s.realms.player.treasury,
            territory:JSON.stringify(original) === JSON.stringify(actual),
            held:JSON.stringify(old.held) === JSON.stringify(Object.keys(s.holder).filter(function (id) { return s.holder[id] === 'player'; }).sort()),
            sourceGone:!s.realms[r.realm], originalRulerCount:Object.values(s.chars).filter(function (c) { return c.name === r.name && !c.dead; }).length,
            liege:s.realms.player.liege || null, form:FB.political.government(s,{kind:'realm',id:'player'}).formId,
            sourceActor:source.actor.realmId, agenda:s.stories[r.agenda].subjectId === me.id,
            noSoldier:!s.stories.crossing_soldier_track_711, noToledoHousehold:!s.stories.toledo_household_track_711,
            restored:before === window.restoreFacts(FB.state,snap) };
        };
      }, row)).toEqual({ name:row.name, age:36, culture:row.culture, faith:row.faith,
        home:row.home, site:row.site, tier:row.tier, rank:row.rank, adopted:true, purse:true, publicCrown:true,
        territory:true, held:true, sourceGone:true, originalRulerCount:1, liege:row.liege, form:row.form,
        sourceActor:'umayyad_711', agenda:true, noSoldier:true, noToledoHousehold:true, restored:true });
    });
  }

  test(row.id + ' can retain four reviews without rewards and rejects stale approval', async function ({ page }, info) {
    await beginRuler(page, info, row, false);
    expect(await page.evaluate(function (r) {
      const s = FB.state, t = s.stories[r.agenda], stages = FBDATA.rulerAgendas_711[r.agenda].stages;
      const source = s.stories[r.source], before = JSON.stringify([s.owner,s.holder,s.player.gold,s.armies,s.authority.contracts]);
      const first = stages[0].choices[0].id, stale = FB.stories.quote(s,r.agenda,first);
      s.player.gold++;
      const refused = FB.stories.apply(s,r.agenda,first,stale);
      const accepted = [], repeated = [];
      stages.forEach(function (stage) {
        s.date = {year:stage.year,season:stage.season,day:1}; s.turn++;
        const c = stage.choices.filter(function (choice) { return choice.operation === 'agenda_priority'; }).pop();
        const q = FB.stories.quote(s,r.agenda,c.id);
        accepted.push(FB.stories.apply(s,r.agenda,c.id,q));
        repeated.push(FB.stories.apply(s,r.agenda,c.id,q));
      });
      const after = JSON.stringify([s.owner,s.holder,s.player.gold-1,s.armies,s.authority.contracts]);
      return { refused:refused, accepted:accepted, repeated:repeated, status:t.status,
        count:t.decisions.length, noEffects:before === after, sourceUnchanged:JSON.stringify(source) === JSON.stringify(s.stories[r.source]) };
    }, row)).toEqual({ refused:false, accepted:[true,true,true,true], repeated:[false,false,false,false],
      status:'agenda_complete', count:4, noEffects:true, sourceUnchanged:true });
  });
}

test('711 court, campaign and crown text states plain decisions', async function ({ page }, info) {
  await useReleasedStartRules(page);
  await openGame(page, info);
  const result = await page.evaluate(function () {
    const processWords = /\b(ordinary|actual|actually|existing|current|original|authored|declared)\b/i;
    const disclaimers = /grants? no |creates? no |Record (a |an )?(costless )?(priority|intention|preference)|Record attention|\bordinary\b|\bactual(ly)?\b|\bexisting\b|\boriginal\b|\bauthored\b|historical opportunity|political opportunity/i;
    const lostApostrophe = /[A-Za-z]\?[A-Za-z]/;
    const limit = 'These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.';
    const faults = [];
    let checked = 0;
    function prose(where, value) {
      checked++;
      if (!value || disclaimers.test(value) || lostApostrophe.test(value)) faults.push(where + ': ' + value);
    }
    FBDATA.startScenarios_rulers_711.forEach(function (start) {
      prose(start.id + ' desc', start.desc);
      prose(start.id + ' intro', start.intro);
      prose(start.id + ' family', start.familyPresets.standard.desc);
      if (!start.intro.endsWith('Open your court agenda in Deeds.')) faults.push(start.id + ' beginning');
    });
    ['roderic_agenda_711','tariq_agenda_711'].forEach(function (id) {
      const d = FBDATA.rulerAgendas_711[id];
      prose(id + ' intro', d.intro);
      if (!d.intro.endsWith(limit)) faults.push(id + ' limit sentence');
      d.stages.forEach(function (st) {
        prose(st.id + ' text', st.text);
        st.choices.forEach(function (c) {
          prose(c.id + ' detail', c.detail);
          if (c.label.trim().split(/\s+/).length > 8 || processWords.test(c.label) || lostApostrophe.test(c.label)) {
            faults.push(c.id + ' label: ' + c.label);
          }
        });
      });
    });
    ['strait_crossing_711','toledo_campaign_711','septimania_campaign_711','gaul_campaign_711'].forEach(function (id) {
      prose(id + ' desc', FBDATA.storyCampaigns711[id].desc);
    });
    prose('asturias_foundation_711 desc', FBDATA.storyFoundations.asturias_foundation_711.desc);
    ['toledo_crown_711','northeastern_crown_711'].forEach(function (id) {
      prose(id + ' desc', FBDATA.storyGovernmentSelections711[id].desc);
    });
    function stage(agenda, id) {
      return FBDATA.rulerAgendas_711[agenda].stages.find(function (st) { return st.id === id; });
    }
    function rows(st) { return st.choices.map(function (c) { return [c.operation, c.label]; }); }
    const coast = stage('roderic_agenda_711','roderic_coast_review_711');
    const toledo = stage('roderic_agenda_711','roderic_toledo_review_714');
    const crossing = stage('tariq_agenda_711','tariq_crossing_review_711');
    return { faults:faults, checked:checked, coast:rows(coast), toledo:rows(toledo),
      crossingNames:['caliph','Musa'].every(function (name) { return crossing.text.indexOf(name) >= 0; }),
      crossingRecord:crossing.choices.find(function (c) { return c.id === 'tariq_record_crossing'; }).label };
  });
  expect(result.faults).toEqual([]);
  // Two starts, two agendas with every stage and choice, and seven descriptions.
  expect(result.checked).toBeGreaterThan(40);
  expect(result.coast).toEqual([['agenda_story_fact','Note how the war for Malaga ended'],
    ['agenda_priority','Guard the southern coast']]);
  expect(result.toledo).toEqual([['agenda_story_fact','Note how the war for Toledo ended'],
    ['agenda_priority','Hold Toledo against the invaders']]);
  expect(result.crossingNames).toBe(true);
  expect(result.crossingRecord).toBe('Note how the war for Malaga ended');
});

test('Tariq cannot choose the sovereign crossing', async function ({ page }, info) {
  await beginRuler(page, info, rulers[1], false);
  expect(await page.evaluate(function () {
    const s = FB.state, tariq = FBDATA.rulerAgendas_711.tariq_agenda_711;
    const none = tariq.stages.every(function (stage) { return stage.choices.every(function (c) { return c.operation !== 'agenda_story_choice'; }); });
    const own = s.realms.player.liege === 'ifriqiya_711' && s.holder.tangier === 'player';
    const source = FB.stories.definition(s,FBDATA.storyCampaigns711.strait_crossing_711);
    const record = s.stories.strait_crossing_711;
    return { none:none, own:own, sovereign:s.owner.tangier, actor:source.actor.realmId, initial:record && record.result || null };
  })).toEqual({ none:true, own:true, sovereign:'umayyad_711', actor:'umayyad_711', initial:null });
});

test('Roderic is informed of the crossing and an earlier forwarded defender decision restores as decided', async function ({ page }, info) {
  await beginRuler(page, info, rulers[0], false);
  expect(await page.evaluate(function () {
    const s = FB.state, agenda = 'roderic_agenda_711';
    const retired = ['roderic_face_crossing','roderic_leave_crossing','roderic_face_toledo','roderic_leave_toledo'];
    const first = FB.stories.quote(s,agenda,'roderic_keep_recognition');
    const advanced = FB.stories.apply(s,agenda,'roderic_keep_recognition',first);
    s.date = {year:711,season:1,day:1}; s.turn++;
    const offered = FB.stories.choices(s,agenda).map(function (c) { return c.id; });
    const refused = retired.every(function (id) { return !FB.stories.quote(s,agenda,id).allowed; });
    const prior = JSON.stringify(s.stories.strait_crossing_711);
    const source = FB.stories.choices(s,'strait_crossing_711').length;
    const sourceAllowed = FB.stories.quote(s,'strait_crossing_711','face_campaign').allowed;
    // Rebuild the decision an earlier save could hold for the removed forwarding row.
    const saved = JSON.parse(FB.save.serialize()), t = saved.state.stories[agenda];
    t.decisions.push({ stageId:'roderic_coast_review_711', choiceId:'roderic_face_crossing', turn:s.turn }); t.step++;
    const wire = JSON.stringify(t);
    FB.save.restore(saved);
    const r = FB.state.stories[agenda];
    return { advanced:advanced, offered:offered, refused:refused, source:source, sourceAllowed:sourceAllowed,
      sourceUnchanged:prior === JSON.stringify(FB.state.stories.strait_crossing_711), restored:wire === JSON.stringify(r),
      step:r.step, name:FB.stories.get(agenda).status(FB.state,r).name,
      next:FB.stories.choices(FB.state,agenda).map(function (c) { return c.id; }) };
  })).toEqual({ advanced:true, offered:['roderic_record_crossing','roderic_keep_coast','agenda_stop_program'], refused:true,
    source:0, sourceAllowed:false, sourceUnchanged:true, restored:true, step:2, name:'The road to Toledo', next:['agenda_stop_program'] });
});
