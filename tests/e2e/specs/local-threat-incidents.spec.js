'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const river = require('../fixtures/authoring/local-threat-river.json');
dependsOnRuntime(__filename, ['index.html','js/story_local_threat.js','js/story_household.js',
  'js/story_household_observer.js','js/stories.js','js/localfolk.js','js/model.js','js/modifiers.js',
  'js/world.js','js/starts.js','js/bookmark_setup.js','js/mods.js','js/save.js','js/save_v4.js',
  'js/travel.js','js/intrigue.js','js/justice.js','js/main.js','data/technology.js']);

async function imported(page, info, which) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,
    '../fixtures/authoring/local-threat-' + which + '.json'));
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady; });
  await beginBookmark(page, info, which === 'river' ? 'harbor_world' : 'dune_world',
    which === 'river' ? 'harbor_household' : 'dune_household');
  await page.evaluate(function () {
    FB.state.player.homeSettlement = 0;
    window.incidentAt = function (turn) {
      const s = FB.state; s.date = FB.dateAtTurn(s, turn); s.turn = turn;
    };
    window.incidentAssets = function () {
      const s = FB.state;
      return JSON.stringify([s.chars,s.player.gold,s.population,s.realms,s.owner,s.holder,s.armies,s.localFolk]);
    };
  });
}

test('imported opportunities and quiet boundaries never manufacture an attack', async function ({ page }, info) {
  await imported(page, info, 'river');
  expect(await page.evaluate(function () {
    const s = FB.state, before = incidentAssets();
    const early = FB.stories.quote(s,'river_incident','warn').allowed;
    FB.stories.day(s);
    incidentAt(2); FB.stories.day(s); FB.stories.day(s);
    return { early,phase:s.stories.river_incident.status,count:s.stories.river_incident.occurrences.length,
      elsewhere:s.stories.river_other_site.status,notice:s.stories.river_notice.pending.length,
      unchanged:before === incidentAssets(),review:FB.stories.quote(s,'river_incident','warn').allowed,
      tech:FBDATA.techImpactReviews.features.local_threat_incidents.mode };
  })).toEqual({early:false,phase:'available',count:0,elsewhere:'dormant',notice:0,unchanged:true,review:true,tech:'none'});
});

test('separate decisions commit exact local facts once and observer aliases share one receipt', async function ({ page }, info) {
  await imported(page, info, 'river');
  expect(await page.evaluate(function () {
    const s = FB.state, before = incidentAssets(); incidentAt(2);
    const warn = FB.stories.apply(s,'river_incident','warn',FB.stories.quote(s,'river_incident','warn'));
    const first = s.stories.river_notice.pending[0].key;
    const alias = s.stories.river_alias.pending[0].key === first;
    const acknowledge = FB.stories.apply(s,'river_notice','records',FB.stories.quote(s,'river_notice','records'));
    const duplicate = FB.stories.apply(s,'river_alias','records',FB.stories.quote(s,'river_alias','records'));
    const immediate = FB.stories.quote(s,'river_incident','press').allowed;
    incidentAt(3);
    const press = FB.stories.apply(s,'river_incident','press',FB.stories.quote(s,'river_incident','press'));
    const attempted = s.stories.river_incident.status;
    incidentAt(4);
    const finish = FB.stories.apply(s,'river_incident','finish',FB.stories.quote(s,'river_incident','finish'));
    FB.stories.day(s); FB.stories.day(s);
    return {warn,alias,acknowledge,duplicate,immediate,press,attempted,finish,
      site:JSON.parse(first)[7],milestones:s.stories.river_incident.occurrences.map(function (e) { return e.milestone; }),
      ended:s.stories.river_incident.status,unchanged:before === incidentAssets()};
  })).toEqual({warn:true,alias:true,acknowledge:true,duplicate:false,immediate:false,press:true,attempted:'attempted',
    finish:true,site:'harbor_meeting_hall',milestones:['threatened','attempted','resolved'],ended:'resolved',unchanged:true});
});

test('two possible sites in one county require the actual protagonist residence', async function ({ page }, info) {
  await imported(page, info, 'river');
  expect(await page.evaluate(function () {
    const s = FB.state; incidentAt(2);
    const hall = FB.stories.quote(s,'river_incident','warn'), gate = FB.stories.quote(s,'river_other_site','warn');
    s.player.homeSettlement = 1;
    const stale = FB.stories.apply(s,'river_incident','warn',hall);
    const gateNow = FB.stories.apply(s,'river_other_site','warn',FB.stories.quote(s,'river_other_site','warn'));
    return {hall:hall.allowed,gate:gate.allowed,stale,gateNow,hallCount:s.stories.river_incident.occurrences.length,
      gateSite:s.stories.river_other_site.occurrences[0].locality.siteId};
  })).toEqual({hall:true,gate:false,stale:false,gateNow:true,hallCount:0,gateSite:'harbor_river_gate'});
});

test('refusal and expiry close once with no reward, penalty, movement or incident', async function ({ page }, info) {
  await imported(page, info, 'river');
  expect(await page.evaluate(function () {
    const s = FB.state, before = incidentAssets(); incidentAt(2);
    const refusal = FB.stories.apply(s,'river_incident','leave',FB.stories.quote(s,'river_incident','leave'));
    incidentAt(20); FB.stories.day(s);
    const closed = JSON.stringify(s.stories); FB.stories.day(s);
    return {refusal,one:s.stories.river_incident.status,two:s.stories.river_other_site.status,
      counts:[s.stories.river_incident.occurrences.length,s.stories.river_other_site.occurrences.length],
      stable:closed === JSON.stringify(s.stories),unchanged:before === incidentAssets()};
  })).toEqual({refusal:true,one:'withdrawn',two:'expired',counts:[0,0],stable:true,unchanged:true});
});

test('pure quotes and stale confirmations respect custody, journeys, action days and locality', async function ({ page }, info) {
  await imported(page, info, 'river');
  expect(await page.evaluate(function () {
    const s = FB.state; incidentAt(2);
    const initial = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const q = FB.stories.quote(s,'river_incident','warn'); FB.stories.quote(s,'river_incident','warn');
    const pure = initial === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    s.player.flags.in_prison = true;
    const captive = FB.stories.apply(s,'river_incident','warn',q); delete s.player.flags.in_prison;
    s.player.travel = {phase:'arrived',currentId:'harbor_quay',destinationId:'harbor_quay'};
    const journey = FB.stories.quote(s,'river_incident','warn').allowed; s.player.travel = null;
    const sites = FB.world.sitesByProv.harbor_quay; delete FB.world.sitesByProv.harbor_quay;
    const missing = FB.stories.quote(s,'river_incident','warn').allowed; FB.world.sitesByProv.harbor_quay = sites;
    incidentAt(3);
    const later = FB.stories.apply(s,'river_incident','warn',q);
    return {pure,allowed:q.allowed,captive,journey,missing,later,count:s.stories.river_incident.occurrences.length};
  })).toEqual({pure:true,allowed:true,captive:false,journey:false,missing:false,later:false,count:0});
});

test('an independent resident uses the same transaction and a live agency policy', async function ({ page }, info) {
  await imported(page, info, 'hill');
  expect(await page.evaluate(function () {
    const initial = JSON.parse(FB.save.serialize()); let s = FB.state;
    FB.setCountySupport(s,'dune_well',0); const calmAssets = incidentAssets();
    FB.stories.day(s);
    const calm = {status:s.stories.hill_incident.status,count:s.stories.hill_incident.occurrences.length,
      unchanged:calmAssets === incidentAssets()};
    FB.save.restore(initial); s = FB.state;
    FB.setCountySupport(s,'dune_well',-65); const before = incidentAssets();
    const q = FB.stories.quote(s,'hill_incident','warn');
    const direct = FB.stories.apply(s,'hill_incident','warn',q);
    const directFacts = JSON.stringify(s.stories.hill_incident.occurrences);
    FB.save.restore(initial); s = FB.state; FB.setCountySupport(s,'dune_well',-65);
    FB.stories.day(s);
    const shared = direct && q.allowed && directFacts === JSON.stringify(s.stories.hill_incident.occurrences);
    const first = s.stories.hill_incident.status; FB.stories.day(s);
    const count = s.stories.hill_incident.occurrences.length;
    incidentAt(1); FB.stories.day(s);
    return {calm,shared,first,count,second:s.stories.hill_incident.status,
      original:s.stories.hill_incident.actorId,unchanged:before === incidentAssets()};
  })).toEqual({calm:{status:'withdrawn',count:0,unchanged:true},shared:true,first:'threatened',count:1,
    second:'attempted',original:'lf_dune_well_0_0',unchanged:true});
});

test('resident identity, exact household site and current authority cannot be substituted', async function ({ page }, info) {
  await imported(page, info, 'hill');
  expect(await page.evaluate(function () {
    const s = FB.state, t = s.stories.hill_incident, c = s.chars[t.actorId];
    const q = FB.stories.quote(s,'hill_incident','warn');
    c.homeProvinceId = 'dune_flats';
    const remote = FB.stories.quote(s,'hill_incident','warn').allowed; c.homeProvinceId = 'dune_well';
    c.captive = true; const custody = FB.stories.apply(s,'hill_incident','warn',q); delete c.captive;
    const originalHolder = s.holder.dune_well; s.holder.dune_well = 'dune_gate';
    const authority = FB.stories.apply(s,'hill_incident','warn',q);
    FB.stories.day(s); s.holder.dune_well = originalHolder; FB.stories.day(s);
    return {ready:q.allowed,remote,custody,authority,status:t.status,count:t.occurrences.length,original:t.actorId};
  })).toEqual({ready:true,remote:false,custody:false,authority:false,status:'interrupted',count:0,original:'lf_dune_well_0_0'});
});

test('death or leaving after intimidation interrupts without inventing an outcome or replacement', async function ({ page }, info) {
  await imported(page, info, 'river');
  expect(await page.evaluate(function () {
    const s = FB.state; incidentAt(2);
    FB.stories.apply(s,'river_incident','warn',FB.stories.quote(s,'river_incident','warn'));
    incidentAt(3); const q = FB.stories.quote(s,'river_incident','press');
    s.chars[s.player.charId].dead = true;
    const stale = FB.stories.apply(s,'river_incident','press',q); FB.stories.day(s);
    const snapshot = JSON.stringify(s.stories.river_incident);
    s.chars[s.player.charId].dead = false; FB.stories.day(s);
    return {stale,status:s.stories.river_incident.status,count:s.stories.river_incident.occurrences.length,
      stable:snapshot === JSON.stringify(s.stories.river_incident)};
  })).toEqual({stale:false,status:'interrupted',count:1,stable:true});
});

test('a lost persistent actor is never regenerated or replaced by another resident', async function ({ page }, info) {
  await imported(page, info, 'hill');
  expect(await page.evaluate(function () {
    const s = FB.state, t = s.stories.hill_incident, original = t.actorId;
    delete s.chars[original];
    FB.setCountySupport(s,'dune_well',-65);
    const count = Object.keys(s.chars).length, rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.stories.day(s); FB.stories.day(s);
    return {status:t.status,original:t.actorId === original,occurrences:t.occurrences.length,
      missing:!s.chars[original],pure:count === Object.keys(s.chars).length && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({status:'interrupted',original:true,occurrences:0,missing:true,pure:true});
});

test('shared review names the actor and costs, returns through Back and rejects changed presence', async function ({ page }, info) {
  await imported(page, info, 'river');
  await page.evaluate(function () {
    incidentAt(2); FB.ui.closeModal(); FB.ui.showStorySheet('river_incident');
  });
  await expect(page.locator('[data-story-person]')).toHaveAttribute('data-story-person',
    await page.evaluate(function () { return FB.state.player.charId; }));
  await page.locator('[data-story-choice="warn"]').click();
  await expect(page.locator('#modal')).toContainText('Costs no money or action days.');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-story-choice="warn"]')).toBeVisible();
  await page.locator('[data-story-choice="warn"]').click();
  await page.evaluate(function () { FB.state.player.homeSettlement = 1; });
  await page.locator('#gm-story-confirm').click();
  await expect(page.locator('#modal')).toContainText('This decision changed while it was open.');
  expect(await page.evaluate(function () { return FB.state.stories.river_incident.occurrences.length; })).toBe(0);
});

test('matching save restores pending and committed facts without dispatch and replays deterministically', async function ({ page }, info) {
  await imported(page, info, 'river');
  expect(await page.evaluate(function () {
    const initial = JSON.parse(FB.save.serialize());
    function replay() {
      FB.save.restore(JSON.parse(JSON.stringify(initial))); const s = FB.state; incidentAt(2);
      const first = FB.stories.apply(s,'river_incident','warn',FB.stories.quote(s,'river_incident','warn'));
      incidentAt(3);
      const second = FB.stories.apply(s,'river_incident','press',FB.stories.quote(s,'river_incident','press'));
      const facts = JSON.stringify(s.stories), saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      return [first,second,facts === JSON.stringify(FB.state.stories),JSON.stringify(FB.state.stories),FB.getRngState(),FB.getUidCounter()];
    }
    const one = replay(), two = replay();
    return {actions:one.slice(0,3),same:JSON.stringify(one) === JSON.stringify(two)};
  })).toEqual({actions:[true,true,true],same:true});
});

test('malformed and missing optional episode records fail detached before state adoption', async function ({ page }, info) {
  await imported(page, info, 'river');
  expect(await page.evaluate(function () {
    incidentAt(2); const s = FB.state;
    FB.stories.apply(s,'river_incident','warn',FB.stories.quote(s,'river_incident','warn'));
    const original = JSON.parse(FB.save.serialize()), before = FB.state, state = JSON.stringify(before);
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const rejected = ['missing','version','actor','site','future','duplicate','sequence','fields','effect','downgrade','ending','budget'].map(function (fault) {
      const saved = JSON.parse(JSON.stringify(original)), t = saved.state.stories.river_incident;
      if (fault === 'missing') delete saved.state.stories.river_incident;
      if (fault === 'version') delete t.version;
      if (fault === 'actor') t.actorId = Object.keys(saved.state.chars).filter(function (id) { return id !== t.actorId; })[0];
      if (fault === 'site') t.locality.siteId = 'harbor_river_gate';
      if (fault === 'future') t.occurrences[0].turn = saved.state.turn + 1;
      if (fault === 'duplicate') t.occurrences.push(t.occurrences[0]);
      if (fault === 'sequence') t.occurrences[0].milestone = 'attempted';
      if (fault === 'fields') t.reward = 10;
      if (fault === 'effect') t.occurrences[0].sourceResult = {deaths:1};
      if (fault === 'downgrade') t.status = 'available';
      if (fault === 'ending') t.endedTurn = 0;
      if (fault === 'budget') t.endTurn++;
      try { FB.save.restore(saved); return false; } catch (err) { return true; }
    });
    return {rejected,pure:before === FB.state && state === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({rejected:Array(12).fill(true),pure:true});
});

test('candidate validation rejects unowned effects and malformed scopes without publishing anything', async function ({ page }, info) {
  await openGame(page, info);
  expect(await page.evaluate(function (example) {
    const before = JSON.stringify(FBDATA), stories = FB.stories.list(), state = FB.state;
    const facts = JSON.stringify(state), rng = FB.getRngState(), uid = FB.getUidCounter();
    const rejected = ['unknown_site','county_site','slot','unknown_actor','unknown_actor_ref','actor_fields','realm','window','unbounded','policy',
      'effects','operation','no_refusal','duplicate','observer'].map(function (fault) {
      const mod = JSON.parse(JSON.stringify(example)), d = mod.storyInstances.river_incident;
      if (fault === 'unknown_site') d.locality.siteId = 'missing_site';
      if (fault === 'county_site') d.locality.provinceId = 'harbor_ridge';
      if (fault === 'slot') d.locality.siteId = 0;
      if (fault === 'unknown_actor') d.actor.kind = 'mobile_county';
      if (fault === 'unknown_actor_ref') d.actor = {kind:'opening_actor',actorId:'absent_opening_actor'};
      if (fault === 'actor_fields') d.actor.teleport = true;
      if (fault === 'realm') d.authorityRealmId = 'unknown_court';
      if (fault === 'window') d.lastDate.day = 0;
      if (fault === 'unbounded') d.lastDate.year = 910;
      if (fault === 'policy') d.ai.minPressure = -1;
      if (fault === 'effects') d.casualties = 20;
      if (fault === 'operation') d.choices[0].operation = 'seize_property';
      if (fault === 'no_refusal') d.choices.pop();
      if (fault === 'duplicate') d.choices[1].operation = 'intimidate';
      if (fault === 'observer') mod.storyInstances.river_notice.beats[0].trigger = 'casualties';
      return FB.mods.validate(mod).length > 0;
    });
    return {rejected,pure:before === JSON.stringify(FBDATA) && stories.every(function (st) { return FB.stories.get(st.id) === st; }) &&
      state === FB.state && facts === JSON.stringify(state) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  }, river)).toEqual({rejected:Array(15).fill(true),pure:true});
});

test('changing imported episode terms rejects an earlier save fingerprint', async function ({ page }, info) {
  await imported(page, info, 'river');
  expect(await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize()), d = JSON.parse(JSON.stringify(FBDATA.storyInstances.river_incident));
    d.lastDate.day = 21; FB.mods.apply({storyInstances:{river_incident:d}});
    const state = FB.state, facts = JSON.stringify(state), rng = FB.getRngState(), uid = FB.getUidCounter();
    let rejected = false; try { FB.save.restore(saved); } catch (err) { rejected = true; }
    return rejected && state === FB.state && facts === JSON.stringify(state) && rng === FB.getRngState() && uid === FB.getUidCounter();
  })).toBe(true);
});

test('unopted campaigns retain their absent optional records on restore', async function ({ page }, info) {
  await beginBookmark(page, info, '867');
  expect(await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
    return !Object.keys(FB.state.stories || {}).some(function (id) {
      return FB.stories.get(id).declaration && FB.stories.get(id).declaration.type === 'local_threat';
    });
  })).toBe(true);
});
