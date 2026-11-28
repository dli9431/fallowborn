'use strict';
const {prepareGameContent} = require('../support/game/navigation');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmarkFromTitle } = require('../support/game/bookmark-acceptance');
const { expectModAdmission } = require('../support/game/mod-admission');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const examples = {
  harbor:require('../fixtures/authoring/holywar-opening-harbor.json'),
  upland:require('../fixtures/authoring/holywar-opening-upland.json')
};
dependsOnRuntime(__filename, ['index.html','js/story_history.js','js/stories.js','js/holywar.js',
  'js/model.js','js/papacy.js','js/systems.js','js/mods.js','js/world.js','js/starts.js',
  'js/bookmark_setup.js','js/main.js','js/save.js','js/save_v4.js','js/util.js','js/title_ids.js',
  'js/religion.js','js/treasury.js','data/technology.js','data/cultures.js','data/systems.js',
  'data/eras.js','data/starts.js']);

function openingCandidate(example) {
  const candidate = JSON.parse(JSON.stringify(examples[example]));
  if (example === 'upland') candidate.bookmarks.dune_world.date = {year:900,season:0,day:1};
  return candidate;
}

async function begin(page, info, example) {
  await openGame(page, info);
  const candidate = openingCandidate(example);
  await expectModAdmission(page, candidate);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({ name:'holywar-opening-' + example + '.json',
    mimeType:'application/json', buffer:Buffer.from(JSON.stringify(candidate)) });
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}), page.locator('#mod-apply').click()]);
  const prefix = example === 'harbor' ? 'harbor' : 'dune';
  await prepareGameContent(page);
  await page.waitForFunction(function (prefix) {
    return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix + '_world'];
  }, prefix);
  await beginBookmarkFromTitle(page, prefix + '_world', prefix + '_household');
  await page.evaluate(function (prefix) {
    window.openingTest = {
      id:prefix + '_opening_call', faith:prefix + '_belief', head:prefix === 'harbor' ? 'harbor_commune' : 'dune_oasis',
      date:function (day) { FB.state.date = {year:900,season:0,day:day}; FB.state.turn = day - 1; },
      record:function () { return FB.state.stories[this.id]; },
      day:function () { FB.stories.get(this.id).day(FB.state, this.record()); }
    };
  }, prefix);
}

test('malformed opening JSON rejects without changing live data, people or randomness', async function ({page}, info) {
  await openGame(page, info);
  const result = await page.evaluate(function (source) {
    const changes = [
      function (d) { d.openingCall = null; },
      function (d) { d.openingCall.schema = 2; },
      function (d) { d.openingCall.freeFood = 100; },
      function (d) { d.openingCall.head = 'harbor_commune'; },
      function (d) { d.historySeed = [{id:'invented_win',date:{year:899,season:0,day:1},target:'harbor_country',outcome:'attackers'}]; },
      function (d) { d.target.kingdomId = 'missing_kingdom'; },
      function (d) { d.lastDate.day = 0; }
    ];
    return changes.map(function (change) {
      const input = JSON.parse(JSON.stringify(source)); change(input.storyInstances.harbor_opening_call);
      const before = JSON.stringify([FB.state,FBDATA]), bytes = JSON.stringify(input);
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      return FB.mods.validate(input).length > 0 && before === JSON.stringify([FB.state,FBDATA]) &&
        bytes === JSON.stringify(input) && rng === FB.getRngState() && uid === FB.getUidCounter();
    });
  }, examples.harbor);
  expect(result).toEqual(Array(7).fill(true));
});

for (const cause of ['missing_head','changed_generation','dead_head','restored_target','cooldown','expired','earlier_campaign']) {
  test('opening preparation closes truthfully for ' + cause, async function ({page}, info) {
    await begin(page, info, 'upland');
    const result = await page.evaluate(function (cause) {
      const s = FB.state, t = openingTest, rec = t.record();
      if (cause === 'earlier_campaign') FB.callGreatHolyWar(s,t.faith,'dune_country',t.head);
      if (cause === 'missing_head') s.religiousHeads.dune_head = null;
      if (cause === 'changed_generation') s.realms[t.head].ruler.generation++;
      if (cause === 'dead_head') s.chars[rec.openingCall.headCharacterId].dead = true;
      if (cause === 'restored_target') FB.transferProvince(s,'dune_pass',t.head);
      if (cause === 'cooldown') s.greatHolyWarHistory.cooldownUntil[t.faith] = 100;
      t.date(cause === 'expired' ? 7 : 2);
      const owner = JSON.stringify(s.owner), people = Object.keys(s.chars).sort();
      t.day();
      const before = JSON.stringify([rec,s.greatHolyWar,s.greatHolyWarHistory]);
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      t.day(); FB.prepareOpeningHolyWarCalls(s);
      return {phase:rec.phase,result:rec.result,disposition:rec.openingCall.disposition,
        linked:rec.campaignId,campaign:!!s.greatHolyWar,
        unchanged:before === JSON.stringify([rec,s.greatHolyWar,s.greatHolyWarHistory]) &&
          rng === FB.getRngState() && uid === FB.getUidCounter(),
        noLand:owner === JSON.stringify(s.owner),noPeople:JSON.stringify(people) === JSON.stringify(Object.keys(s.chars).sort())};
    }, cause);
    expect(result).toMatchObject({phase:'resolved',result:'diverted',disposition:'unavailable',linked:null,
      unchanged:true,noLand:true,noPeople:true,campaign:cause === 'earlier_campaign'});
  });
}

test('the call names its target and a ready head reads the status facts', async function ({page}, info) {
  await begin(page, info, 'upland');
  const result = await page.evaluate(function () {
    const s = FB.state, t = openingTest, story = FB.stories.get(t.id);
    const read = function () {
      const quote = FB.stories.quote(s, t.id, 'call');
      return quote.allowed ? null : story.blocker(s, t.record(), quote.reason);
    };
    const status = function () { return FB.stories.status(s, t.id); };
    t.date(1);
    const early = [status(), read()];
    t.date(2);
    const observer = status(), notHead = read(), court = s.realms[t.head].name;
    s.player.charId = t.record().openingCall.headCharacterId;
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const choices = FB.stories.choices(s, t.id), ready = status(), open = read();
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    return {name:FBDATA.kingdoms.dune_country.name, court:court, early:early, observer:observer,
      notHead:notHead, choices:choices, ready:ready, open:open, pure:pure};
  });
  const name = result.name;
  expect(result.pure).toBe(true);
  expect(result.early).toEqual([null, 'Opens in Spring 900.']);
  expect(result.observer.facts[0]).toEqual(['Your role', 'Observer']);
  expect(result.observer.facts[3]).toEqual(['Now', 'Ready to call.']);
  expect(result.notHead).toBe('Only ' + result.court + ' can call this holy war.');
  expect(result.choices.map(function (choice) { return [choice.id, choice.label, choice.detail]; })).toEqual([
    ['call', 'Call a holy war on ' + name,
      'The faithful go to war for ' + name + ' at once; armies and allies decide it.'],
    ['decline', 'Let the call on ' + name + ' pass',
      'No holy war now. You can still call one later through religious decisions.']]);
  expect(result.ready.stage).toBe('Holy war on ' + name + ' · Ready to call');
  expect(result.ready.lines).toEqual([]);
  expect(result.ready.facts).toEqual([['Your role', 'Caller'], ['Target', name], ['Window', '900'],
    ['Now', 'Ready to call.']]);
  expect(result.open).toBeNull();
});

test('each closed call blocker names the first failing condition', async function ({page}, info) {
  await begin(page, info, 'upland');
  const result = await page.evaluate(function () {
    const s = FB.state, t = openingTest, story = FB.stories.get(t.id);
    const read = function () {
      const quote = FB.stories.quote(s, t.id, 'call');
      return quote.allowed ? null : story.blocker(s, t.record(), quote.reason);
    };
    const status = function () { return FB.stories.status(s, t.id); };
    t.date(2);
    s.player.charId = t.record().openingCall.headCharacterId;
    s.realms[t.head].ruler.generation++;
    const changed = read();
    s.realms[t.head].ruler.generation--;
    s.greatHolyWar = {id:'ghw_99'};
    const underway = [read(), status()];
    s.greatHolyWar = null;
    const cooldown = s.greatHolyWarHistory.cooldownUntil[t.faith];
    s.greatHolyWarHistory.cooldownUntil[t.faith] = s.turn + 30;
    const cooling = [read(), status().facts[3]];
    s.greatHolyWarHistory.cooldownUntil[t.faith] = s.turn + 1;
    const lastDay = read();
    if (cooldown === undefined) delete s.greatHolyWarHistory.cooldownUntil[t.faith];
    else s.greatHolyWarHistory.cooldownUntil[t.faith] = cooldown;
    const eligible = FB.canCallGreatHolyWar;
    FB.canCallGreatHolyWar = function () { return false; };
    const otherwise = read();
    FB.canCallGreatHolyWar = eligible;
    // Raw ownership keeps the one-county court alive so the stage can be undone.
    const owner = s.owner.dune_pass;
    s.owner.dune_pass = t.head; FB.invalidateRealmCache();
    const restored = read();
    s.owner.dune_pass = owner; FB.invalidateRealmCache();
    const head = s.religiousHeads.dune_head;
    s.religiousHeads.dune_head = null;
    const vacant = read();
    s.religiousHeads.dune_head = head;
    t.date(7);
    const late = read();
    return {name:FBDATA.kingdoms.dune_country.name, changed:changed, underway:underway, cooling:cooling,
      lastDay:lastDay, otherwise:otherwise, restored:restored, vacant:vacant, late:late};
  });
  const name = result.name;
  expect(result.changed).toBe('The head who could make this call has changed.');
  expect(result.underway[0]).toBe('Another holy war is already underway.');
  expect(result.underway[1].stage).toBe('Holy war on ' + name + ' · Waiting');
  expect(result.underway[1].facts[3]).toEqual(['Now', 'Another holy war is already underway.']);
  expect(result.cooling).toEqual(['Your faith called a holy war recently; wait 30 more days.',
    ['Now', 'Your faith called a holy war recently; wait 30 more days.']]);
  expect(result.lastDay).toBe('Your faith called a holy war recently; wait 1 more day.');
  expect(result.otherwise).toBe(
    'The head’s authority is too low, the faith is divided by schism, or the treasury is under restriction.');
  expect(result.restored).toBe(name + ' is no longer a valid target.');
  expect(result.vacant).toBe('Your faith has no religious head.');
  expect(result.late).toBe('Closed after 900.');
});

test('an underway call and its campaign result report the stage to the caller', async function ({page}, info) {
  await begin(page, info, 'upland');
  const result = await page.evaluate(function () {
    const s = FB.state, t = openingTest;
    t.date(2);
    s.player.charId = t.record().openingCall.headCharacterId;
    const applied = FB.stories.apply(s, t.id, 'call', FB.stories.quote(s, t.id, 'call'));
    const started = FB.stories.status(s, t.id);
    FB.resolveGreatHolyWar(s, 'defenders', 'opening_test'); t.day();
    return {name:FBDATA.kingdoms.dune_country.name, applied:applied, started:started,
      ended:FB.stories.status(s, t.id)};
  });
  const name = result.name;
  expect(result.applied).toBe(true);
  expect(result.started.stage).toBe('Holy war on ' + name + ' · Underway');
  expect(result.started.facts[0]).toEqual(['Your role', 'Caller']);
  expect(result.started.facts[3]).toEqual(['Now', 'Underway since Spring 900.']);
  expect(result.ended.stage).toBe('Holy war on ' + name + ' · Failed');
  expect(result.ended.facts[3]).toEqual(['Now', 'Ended: the holy war for ' + name + ' failed.']);
});
