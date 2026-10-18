'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
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

async function begin(page, info, example) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,
    '../fixtures/authoring/holywar-opening-' + example + '.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}), page.locator('#mod-apply').click()]);
  const prefix = example === 'harbor' ? 'harbor' : 'dune';
  await page.waitForFunction(function (prefix) {
    return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix + '_world'];
  }, prefix);
  await beginBookmark(page, info, prefix + '_world', prefix + '_household');
  await page.evaluate(function (prefix) {
    window.openingTest = {
      id:prefix + '_opening_call', faith:prefix + '_belief', head:prefix === 'harbor' ? 'harbor_commune' : 'dune_oasis',
      date:function (day) { FB.state.date = {year:900,season:0,day:day}; FB.state.turn = day - 1; },
      record:function () { return FB.state.stories[this.id]; },
      day:function () { FB.stories.get(this.id).day(FB.state, this.record()); }
    };
  }, prefix);
}

for (const example of ['harbor','upland']) {
  test(example + ' ordinary JSON preparation calls once through the canonical owner', async function ({page}, info) {
    await begin(page, info, example);
    const result = await page.evaluate(function (example) {
      const s = FB.state, t = openingTest, rec = t.record();
      const initial = {phase:rec.phase, disposition:rec.openingCall.disposition, campaign:!!s.greatHolyWar};
      const people = Object.keys(s.chars).sort(), owner = JSON.stringify(s.owner);
      if (example === 'upland') {
        // The ordinary first-by-year dispatch must respect the opening window.
        FB.greatHolyWarYearly(s); FB.greatHolyWarTick(s);
        if (s.greatHolyWar || rec.phase !== 'pending') throw new Error('Premature automatic call');
        t.date(2); FB.greatHolyWarYearly(s);
      }
      const campaign = s.greatHolyWar, sequence = s.greatHolyWarHistory.sequence;
      const second = FB.callGreatHolyWar(s,t.faith,campaign.targetKingdom,t.head);
      const attached = FB.stories.start(s);
      t.day(); FB.greatHolyWarTick(s); FB.greatHolyWarYearly(s);
      const snapshot = JSON.stringify([rec,s.greatHolyWar,s.greatHolyWarHistory]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      FB.stories.restore(FB.state);
      return {initial:initial,phase:rec.phase,disposition:rec.openingCall.disposition,
        linked:rec.campaignId === campaign.id && rec.calledTurn === campaign.calledTurn &&
          rec.callerRealmId === campaign.callerRealm && rec.callerCharacterId === rec.openingCall.headCharacterId,
        target:campaign.targetKingdom,head:campaign.callerRealm,second:second,
        sequence:sequence,after:FB.state.greatHolyWarHistory.sequence,attached:attached,
        noHistory:FB.state.greatHolyWarHistory.campaigns.length === 0 && rec.seededIds.length === 0,
        noPeople:JSON.stringify(people) === JSON.stringify(Object.keys(FB.state.chars).sort()),
        noLand:owner === JSON.stringify(FB.state.owner),
        restored:snapshot === JSON.stringify([t.record(),FB.state.greatHolyWar,FB.state.greatHolyWarHistory]),
        technology:FBDATA.techImpactReviews.features.dated_holy_war_calls.mode};
    }, example);
    expect(result.initial).toEqual(example === 'harbor' ? {phase:'started',disposition:'called',campaign:true}
      : {phase:'pending',disposition:'pending',campaign:false});
    expect(result).toMatchObject({phase:'started',disposition:'called',linked:true,second:false,
      sequence:1,after:1,attached:[],noHistory:true,noPeople:true,noLand:true,restored:true,technology:'none'});
    expect(result.target).toBe(example === 'harbor' ? 'harbor_country' : 'dune_country');
    expect(result.head).toBe(example === 'harbor' ? 'harbor_commune' : 'dune_oasis');
  });
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

test('an ordinary call committed in the window is adopted by exact campaign id without a second call', async function ({page}, info) {
  await begin(page, info, 'upland');
  const result = await page.evaluate(function () {
    const s = FB.state, t = openingTest; t.date(2);
    const campaign = FB.callGreatHolyWar(s,t.faith,'dune_country',t.head);
    const before = JSON.stringify([s.greatHolyWar,s.greatHolyWarHistory]), rng = FB.getRngState(), uid = FB.getUidCounter();
    t.day(); FB.prepareOpeningHolyWarCalls(s);
    const again = FB.callGreatHolyWar(s,t.faith,'dune_country',t.head);
    return {linked:t.record().campaignId === campaign.id,phase:t.record().phase,
      unchanged:before === JSON.stringify([s.greatHolyWar,s.greatHolyWarHistory]) &&
        rng === FB.getRngState() && uid === FB.getUidCounter(),again:again,sequence:s.greatHolyWarHistory.sequence};
  });
  expect(result).toEqual({linked:true,phase:'started',unchanged:true,again:false,sequence:1});
});

test('fresh attachment with no head closes without creating a caller or campaign', async function ({page}, info) {
  await begin(page, info, 'upland');
  const result = await page.evaluate(function () {
    const s = JSON.parse(JSON.stringify(FB.state)), t = openingTest;
    s.religiousHeads.dune_head = null;
    const people = Object.keys(s.chars).sort(), rng = FB.getRngState(), uid = FB.getUidCounter();
    const record = FB.stories.get(t.id).init(s);
    return {phase:record.phase,disposition:record.openingCall.disposition,head:record.openingCall.headRealmId,
      campaign:!!s.greatHolyWar,noPeople:JSON.stringify(people) === JSON.stringify(Object.keys(s.chars).sort()),
      pure:rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result).toEqual({phase:'resolved',disposition:'unavailable',head:null,campaign:false,noPeople:true,pure:true});
});

for (const choice of ['call','decline','expire']) {
  test('the current player head retains a finite reviewed opening decision: ' + choice, async function ({page}, info) {
    await begin(page, info, 'upland');
    const result = await page.evaluate(function (choice) {
      const t = openingTest, s = FB.state, actorId = t.record().openingCall.headCharacterId;
      s.player.charId = actorId; t.date(2); t.day();
      FB.greatHolyWarYearly(s); FB.greatHolyWarTick(s);
      const pending = t.record().phase === 'pending' && !s.greatHolyWar;
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const quote = FB.stories.quote(s,t.id,'call'); FB.stories.choices(s,t.id);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      s.realms[t.head].ruler.generation++;
      const changed = JSON.stringify(s), stale = FB.stories.apply(s,t.id,'call',quote);
      const unchanged = changed === JSON.stringify(s);
      s.realms[t.head].ruler.generation--;
      const saved = JSON.parse(FB.save.serialize()), state = JSON.stringify(t.record());
      FB.save.restore(saved); FB.stories.restore(FB.state);
      const noReplay = state === JSON.stringify(t.record()) && !FB.state.greatHolyWar;
      let applied = true;
      if (choice === 'expire') { t.date(7); t.day(); }
      else {
        applied = FB.stories.apply(FB.state,t.id,choice,FB.stories.quote(FB.state,t.id,choice));
        const snapshot = JSON.stringify(FB.state);
        const again = FB.stories.apply(FB.state,t.id,choice,FB.stories.quote(FB.state,t.id,choice));
        if (again || snapshot !== JSON.stringify(FB.state)) throw new Error('Opening decision replayed');
      }
      const rec = t.record();
      return {pending:pending,pure:pure,stale:stale,unchanged:unchanged,noReplay:noReplay,applied:applied,
        phase:rec.phase,result:rec.result,disposition:rec.openingCall.disposition,campaign:!!FB.state.greatHolyWar};
    }, choice);
    expect(result).toMatchObject({pending:true,pure:true,stale:false,unchanged:true,noReplay:true,applied:true,
      phase:choice === 'call' ? 'started' : 'resolved',result:choice === 'call' ? null : choice === 'decline' ? 'declined' : 'diverted',
      disposition:choice === 'call' ? 'called' : choice === 'decline' ? 'declined' : 'unavailable',campaign:choice === 'call'});
  });
}

test('strict optional saves reject malformed preparation without evaluating or attaching missing stories', async function ({page}, info) {
  await begin(page, info, 'upland');
  const result = await page.evaluate(function () {
    const source = JSON.parse(FB.save.serialize()), t = openingTest;
    const changes = [
      function (r) { delete r.openingCall; },
      function (r) { r.openingCall.schema = 2; },
      function (r) { r.openingCall.extra = true; },
      function (r) { r.openingCall.evaluatedTurn = 1; },
      function (r) { r.openingCall.disposition = 'called'; },
      function (r) { r.openingCall.headGeneration = null; },
      function (r) { r.openingCall.headCharacterId = 'missing_person'; },
      function (r) { r.openingCall.disposition = 'unavailable'; }
    ];
    const faults = changes.map(function (change) {
      const saved = JSON.parse(JSON.stringify(source)); change(saved.state.stories[t.id]);
      const current = FB.state, before = JSON.stringify(current), rng = FB.getRngState(), uid = FB.getUidCounter();
      let rejected = false;
      try { FB.save.restore(saved); } catch (error) { rejected = true; }
      return rejected && FB.state === current && before === JSON.stringify(FB.state) &&
        rng === FB.getRngState() && uid === FB.getUidCounter();
    });
    const missing = JSON.parse(JSON.stringify(source)); delete missing.state.stories[t.id];
    FB.save.restore(missing); FB.stories.restore(FB.state); FB.prepareOpeningHolyWarCalls(FB.state);
    return {faults:faults,absent:!FB.state.stories[t.id],noCall:!FB.state.greatHolyWar};
  });
  expect(result).toEqual({faults:Array(8).fill(true),absent:true,noCall:true});
});

test('a completed opening observes the real campaign result once across restore', async function ({page}, info) {
  await begin(page, info, 'harbor');
  const result = await page.evaluate(function () {
    const s = FB.state, t = openingTest, campaignId = t.record().campaignId, owner = JSON.stringify(s.owner);
    FB.resolveGreatHolyWar(s,'defenders','opening_test'); t.day();
    const rec = JSON.stringify(t.record());
    FB.save.restore(JSON.parse(FB.save.serialize()));
    t.day(); FB.stories.restore(FB.state);
    return {result:t.record().result,disposition:t.record().openingCall.disposition,
      once:rec === JSON.stringify(t.record()),noLand:owner === JSON.stringify(FB.state.owner),
      archive:FB.state.greatHolyWarHistory.campaigns.filter(function (r) { return r.id === campaignId; }).length};
  });
  expect(result).toEqual({result:'failed',disposition:'called',once:true,noLand:true,archive:1});
});

test('called save provenance rejects another campaign target before adoption', async function ({page}, info) {
  await begin(page, info, 'harbor');
  const result = await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize()), before = FB.state, state = JSON.stringify(before);
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    saved.state.greatHolyWar.targetKingdom = 'unrelated_target';
    let rejected = false;
    try { FB.save.restore(saved); } catch (error) { rejected = true; }
    return rejected && before === FB.state && state === JSON.stringify(FB.state) &&
      rng === FB.getRngState() && uid === FB.getUidCounter();
  });
  expect(result).toBe(true);
});

test('changed preparation under the same mod name rejects the prior fingerprint', async function ({page}, info) {
  await begin(page, info, 'upland');
  const result = await page.evaluate(function (source) {
    const saved = JSON.parse(FB.save.serialize()), matching = !FB.save.otherWorld(saved);
    const changed = JSON.parse(JSON.stringify(source)); changed.storyInstances.dune_opening_call.lastDate.day++;
    FB.mods.apply(changed);
    const state = FB.state, before = JSON.stringify(state), rng = FB.getRngState(), uid = FB.getUidCounter();
    let rejected = false;
    try { FB.save.restore(saved); } catch (error) { rejected = /different mod/.test(error.message); }
    return {matching:matching,mismatch:FB.save.otherWorld(saved),rejected:rejected,
      pure:state === FB.state && before === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  }, examples.upland);
  expect(result).toEqual({matching:true,mismatch:true,rejected:true,pure:true});
});
