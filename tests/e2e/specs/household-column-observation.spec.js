'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const examples = {
  harbor:require('../fixtures/authoring/expedition-dispatch-harbor.json'),
  dune:require('../fixtures/authoring/expedition-dispatch-dune.json')
};

dependsOnRuntime(__filename, ['index.html','data/mobile_confederations.js','data/units.js','data/technology.js',
  'js/story_household_observer.js','js/story_household.js','js/story_campaign.js','js/stories.js',
  'js/expedition_programs.js','js/mobile_columns.js','js/mobile_confederations.js','js/mobile_command.js',
  'js/government_selection.js','js/governments.js','js/government_support.js','js/authority.js','js/population.js',
  'js/market.js','js/treasury.js','js/logistics.js','js/armies.js','js/wars.js','js/federates.js','js/technology.js',
  'js/model.js','js/mods.js','js/world.js','js/bookmark_setup.js','js/starts.js','js/save.js','js/save_v4.js',
  'js/home_authority.js','js/main.js','js/util.js']);

// Compose ordinary JSON data, then pass it through the actual Mods file picker.
// No executable factory or source callback is registered by these examples.
function declaration(prefix) {
  const input = JSON.parse(JSON.stringify(examples[prefix])), b = input.bookmarks[prefix + '_world'];
  const following = b.realms.find(function (r) { return r.mobile; });
  const home = input.startScenarios[0].fixedProvinceId;
  const target = following.mobile.expeditionProgram.steps.find(function (step) { return step.adapter === 'war'; }).terms.causes[0].target;
  const sourceId = prefix + '_column_campaign', noticeId = prefix + '_column_notice';
  input.name = prefix + ' county campaign notices';
  input.storyInstances[sourceId] = {id:sourceId,type:'campaign',name:'A frontier campaign',
    desc:'A court campaign with separately located columns. It makes no claim about an attack on a household.',
    actor:{realmId:following.id},target:{provinceId:target},firstYear:901,lastYear:902,durationDays:30,
    conditions:[{kind:'host',hostId:'following_' + following.id,realmId:following.id}],news:{}};
  input.storyInstances[noticeId] = {id:noticeId,type:'household_observer',sourceStoryId:sourceId,
    requires:[sourceId],requirements:{provinces:[home]},provinceIds:[home],expiryTurns:prefix === 'harbor' ? 3 : 12,
    title:'County campaign records',intro:'Review the campaign report. Its host location is county evidence only.',
    beats:[{id:'underway',trigger:'started',reach:'local',name:'A campaign host in the county',
      text:'A living host attached to this campaign is currently in your home county. This report establishes no battle or damage at your home.',
      choices:[{id:'records',label:'Review records',detail:'Record a response without payment or action days.',operation:'review_records'}]},
    {id:'closed',trigger:prefix === 'harbor' ? 'failed' : 'won',reach:'previous',name:'The campaign has ended',
      text:'Review the source campaign outcome. It establishes no battle at your home, safety guarantee or compensation.',
      choices:[{id:'continue',label:'Continue ordinary life',detail:'Close this notice without changing your livelihood.',operation:'continue_livelihood'}]}]};
  const alias = JSON.parse(JSON.stringify(input.storyInstances[noticeId]));
  alias.id = noticeId + '_alias'; input.storyInstances[alias.id] = alias;
  b.stories.push(sourceId,noticeId,alias.id);
  return input;
}

async function imported(page, info, prefix, input) {
  await openGame(page,info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'county-notices-' + prefix + '.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(input || declaration(prefix)))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {
    return window.FB && FB.game && FB.game.bootReady && !!FB.stories.get(prefix + '_column_notice');
  },prefix);
  await beginBookmark(page,info,prefix + '_world',prefix + '_household');
  await page.evaluate(function (prefix) {
    const s = FB.state, b = FB.campaignBookmark(s), d = b.realms.find(function (r) { return r.mobile; });
    const sourceId = prefix + '_column_campaign', id = prefix + '_column_notice';
    window.columnNoticeCase = {id:id,alias:id + '_alias',sourceId:sourceId,rid:d.id,home:s.player.provinceId,
      remote:prefix === 'harbor' ? 'harbor_gardens' : 'dune_flats',
      place:function (host,pid) { host.at = pid; host.from = pid; },
      hosts:function () { return FB.mobile.row(s,d.id).columns.entries.map(function (c) {
        return s.armies.find(function (a) { return a.id === c.hostId; });
      }); },
      poll:function () { [id,id + '_alias'].forEach(function (key) { FB.stories.get(key).day(s,s.stories[key]); }); },
      start:function () {
        // Stage bounded county positions, then use the canonical campaign and
        // host-assignment owners. Arrival/movement itself is covered elsewhere.
        s.turn = 5; s.date.year = 901;
        this.hosts().forEach(function (a) { this.place(a,this.remote); },this);
        FB.stories.get(sourceId).day(s,s.stories[sourceId]);
        const r = s.stories[sourceId];
        if (r.phase !== 'started' || !FB.ordinaryWarById(s,r.warId)) throw new Error('Expected a real campaign.');
        this.hosts().forEach(function (a) {
          if (!FB.assignHostCampaign(s,a.id,r.warId)) throw new Error('Expected canonical column assignment.');
        });
      }};
  },prefix);
}

for (const prefix of ['harbor','dune']) {
  test(prefix + ' ordinary JSON notices use actual separate columns, county reach and pure reviews', async function ({page},info) {
    await imported(page,info,prefix);
    expect(await page.evaluate(function () {
      const C = columnNoticeCase, s = FB.state, initial = FB.stories.status(s,C.id);
      C.start(); C.poll();
      const remote = FB.stories.status(s,C.id), hosts = C.hosts(), camp = FB.mobile.migration(s,C.rid).at;
      C.place(hosts[1],C.home); C.poll();
      const q = FB.stories.quote(s,C.id,'records'), item = s.stories[C.id].pending[0];
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      FB.stories.quote(s,C.id,'records'); FB.stories.status(s,C.id); FB.stories.cards(s);
      return {initial:initial,remote:remote,campAtHome:camp === C.home,offered:q.allowed,
        distinct:hosts[0].at !== hosts[1].at,owned:FB.mobile.columnHostOwned(s,C.rid,hosts[1]),
        source:item.event.source,milestone:item.event.milestone,county:item.event.provinceId === C.home,
        noSite:!Object.prototype.hasOwnProperty.call(item.event,'siteId'),tuple:JSON.parse(item.key).length,
        expiry:s.stories[C.id].pending[0].expiresTurn - s.turn,
        pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({initial:null,remote:null,campAtHome:true,offered:true,distinct:true,owned:true,
      source:prefix + '_column_campaign',milestone:'started',county:true,noSite:true,tuple:7,
      expiry:prefix === 'harbor' ? 3 : 12,pure:true});
  });

  test(prefix + ' campaign closure uses previous reach without asserting a local battle or personal effect', async function ({page},info) {
    await imported(page,info,prefix);
    expect(await page.evaluate(function (prefix) {
      const C = columnNoticeCase, s = FB.state;
      C.start(); C.poll();
      const baseline = JSON.parse(JSON.stringify(s)), outcome = prefix === 'harbor' ? 'failed' : 'won';
      function close(state) {
        state.turn = 6;
        Object.assign(state.stories[C.sourceId],{phase:'resolved',result:outcome,outcomeTurn:6});
        FB.stories.get(C.id).day(state,state.stories[C.id]);
        return FB.stories.quote(state,C.id,'continue');
      }
      const remote = close(baseline).allowed;
      C.place(C.hosts()[1],C.home); C.poll();
      const started = FB.stories.apply(s,C.id,'records',FB.stories.quote(s,C.id,'records'));
      C.place(C.hosts()[1],C.remote);
      const q = close(s), item = s.stories[C.id].pending[0];
      const before = JSON.stringify([s.player,s.chars,s.owner,s.holder,s.population,s.armies,s.authority,s.treasury]);
      const accepted = FB.stories.apply(s,C.id,'continue',q);
      return {remote:remote,started:started,offered:q.allowed,accepted:accepted,
        source:item.event.source,milestone:item.event.milestone,before:item.event.before,after:item.event.after,
        unchanged:before === JSON.stringify([s.player,s.chars,s.owner,s.holder,s.population,s.armies,s.authority,s.treasury])};
    },prefix)).toEqual({remote:false,started:true,offered:true,accepted:true,
      source:prefix + '_column_campaign',milestone:prefix === 'harbor' ? 'failed' : 'won',before:null,after:null,unchanged:true});
  });
}

test('departed, removed, empty and unrelated hosts invalidate a reviewed county report', async function ({page},info) {
  await imported(page,info,'harbor');
  expect(await page.evaluate(function () {
    const C = columnNoticeCase, s = FB.state; C.start(); C.place(C.hosts()[1],C.home); C.poll();
    const id = C.hosts()[1].id;
    return [function (copy,a) { a.at = C.remote; },function (copy,a) { a.men = 0; },
      function (copy,a) { copy.armies = copy.armies.filter(function (h) { return h.id !== a.id; }); },
      function (copy,a) { a.warId = 'unrelated_campaign'; },
      function (copy,a) { copy.player.travel = {currentId:C.remote}; },
      function (copy,a) { copy.realms[FB.topRealm(copy,copy.owner[C.home])].ruler.generation++; }].map(function (change) {
      const copy = JSON.parse(JSON.stringify(s)), a = copy.armies.find(function (h) { return h.id === id; });
      const q = FB.stories.quote(copy,C.id,'records'); change(copy,a);
      const before = JSON.stringify(copy), rng = FB.getRngState(), uid = FB.getUidCounter();
      return q.allowed && !FB.stories.apply(copy,C.id,'records',q) && before === JSON.stringify(copy) &&
        rng === FB.getRngState() && uid === FB.getUidCounter();
    });
  })).toEqual(Array(6).fill(true));
});

test('the source target receives objective context even with every actual column elsewhere', async function ({page},info) {
  const input = declaration('harbor');
  input.storyInstances.harbor_column_campaign.target.provinceId = 'harbor_quay';
  input.storyInstances.harbor_column_notice.beats[0].name = 'The county is a campaign objective';
  input.storyInstances.harbor_column_notice.beats[0].text = 'The campaign objective is this county. No host arrival or local battle is established.';
  input.storyInstances.harbor_column_notice_alias.beats[0].name = input.storyInstances.harbor_column_notice.beats[0].name;
  input.storyInstances.harbor_column_notice_alias.beats[0].text = input.storyInstances.harbor_column_notice.beats[0].text;
  await imported(page,info,'harbor',input);
  expect(await page.evaluate(function () {
    const C = columnNoticeCase, s = FB.state; C.start(); C.poll();
    const q = FB.stories.quote(s,C.id,'records');
    const baseline = FB.stories.get(C.id).init(s);
    return {offered:q.allowed,allRemote:C.hosts().every(function (a) { return a.at !== C.home; }),
      code:s.stories[C.id].pending[0].event.milestone,baseline:baseline.pending.length,
      noSite:!Object.prototype.hasOwnProperty.call(s.stories[C.id].pending[0].event,'siteId')};
  })).toEqual({offered:true,allRemote:true,code:'started',baseline:0,noSite:true});
});

test('county notice expiry, matching saves and aliases preserve one shared response', async function ({page},info) {
  await imported(page,info,'harbor');
  const result = await page.evaluate(function () {
    const C = columnNoticeCase; let s = FB.state;
    C.start(); C.place(C.hosts()[1],C.home); C.poll();
    const q = FB.stories.quote(s,C.id,'records'), expiry = s.stories[C.id].pending[0].expiresTurn;
    const expired = JSON.parse(JSON.stringify(s)); expired.turn = expiry + 1;
    FB.stories.get(C.id).day(expired,expired.stories[C.id]);
    const stale = FB.stories.apply(expired,C.id,'records',q), quiet = FB.stories.status(expired,C.id);
    const before = JSON.parse(JSON.stringify([s.stories,s.armies,s.owner,s.population,s.player.gold]));
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    const restored = JSON.parse(JSON.stringify([s.stories,s.armies,s.owner,s.population,s.player.gold]));
    const pendingKey = s.stories[C.id].pending[0].key, aliases = pendingKey === s.stories[C.alias].pending[0].key;
    const accepted = FB.stories.apply(s,C.id,'records',FB.stories.quote(s,C.id,'records'));
    const repeat = FB.stories.apply(s,C.alias,'records',FB.stories.quote(s,C.alias,'records'));
    const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved); s = FB.state;
    [C.id,C.alias].forEach(function (id) { FB.stories.get(id).day(s,s.stories[id]); });
    const replay = FB.stories.status(s,C.id) || FB.stories.status(s,C.alias);
    const receipts = [Object.keys(s.stories[C.id].householdReceipts).length,Object.keys(s.stories[C.alias].householdReceipts).length];
    delete saved.state.stories[C.id]; FB.save.restore(saved);
    return {stale:stale,quiet:quiet,before:before,restored:restored,aliases:aliases,accepted:accepted,repeat:repeat,replay:replay,
      receipts:receipts,missing:!FB.state.stories[C.id]};
  });
  expect(result.restored).toEqual(result.before);
  expect(result).toMatchObject({stale:false,quiet:null,aliases:true,accepted:true,repeat:false,replay:null,receipts:[1,0],missing:true});
});

test('campaign battle, field-path and exact-site claims reject on the detached ordinary JSON path', async function ({page},info) {
  await openGame(page,info);
  const input = declaration('harbor');
  expect(await page.evaluate(function (input) {
    return ['battle','host_arrived','path','site','damage'].map(function (fault) {
      const mod = JSON.parse(JSON.stringify(input)), d = mod.storyInstances.harbor_column_notice;
      if (fault === 'battle' || fault === 'host_arrived') d.beats[0].trigger = fault;
      if (fault === 'path') d.field = 'armies.0.at';
      if (fault === 'site') d.localities = [{provinceId:'harbor_quay',siteId:'harbor_meeting_hall'}];
      if (fault === 'damage') d.beats[0].choices[0].operation = 'damage_home';
      const bytes = JSON.stringify(FBDATA), list = FB.stories.list(), rng = FB.getRngState(), uid = FB.getUidCounter();
      const errors = FB.mods.validate(mod);
      return errors.length > 0 && bytes === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter() &&
        list.length === FB.stories.list().length && list.every(function (m,i) { return FB.stories.list()[i] === m; });
    });
  },input)).toEqual(Array(5).fill(true));
});

test('malformed shared receipt and future source cursor reject before save adoption', async function ({page},info) {
  await imported(page,info,'dune');
  expect(await page.evaluate(function () {
    const C = columnNoticeCase, s = FB.state; C.start(); C.place(C.hosts()[1],C.home); C.poll();
    const envelope = JSON.parse(FB.save.serialize());
    return ['receipt','future','extra'].map(function (fault) {
      const saved = JSON.parse(JSON.stringify(envelope)), t = saved.state.stories[C.id];
      if (fault === 'receipt') t.pending[0].key = JSON.stringify(['invented_household','source','battle',C.home,5,null,null]);
      if (fault === 'future') t.cursors.underway.turn = saved.state.turn + 1;
      if (fault === 'extra') t.pending[0].event.damage = 10;
      const live = FB.state, bytes = JSON.stringify(live), rng = FB.getRngState(), uid = FB.getUidCounter();
      let rejected = false; try { FB.save.restore(saved); } catch (err) { rejected = true; }
      return rejected && FB.state === live && bytes === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter();
    });
  })).toEqual(Array(3).fill(true));
});
