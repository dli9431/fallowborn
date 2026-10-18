'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const examples = {
  harbor:require('../fixtures/authoring/mobile-opening-harbor.json'),
  dune:require('../fixtures/authoring/mobile-opening-dune.json')
};
dependsOnRuntime(__filename, ['index.html','data/mobile_confederations.js','data/units.js','data/eras.js',
  'data/technology.js','data/starts.js','js/mobile_confederations.js','js/mobile_command.js','js/bookmark_setup.js','js/world.js',
  'js/governments.js','js/government_selection.js','js/government_support.js','js/government_civic.js',
  'js/federates.js','js/armies.js','js/technology.js','js/population.js','js/treasury.js','js/authority.js',
  'js/model.js','js/stories.js','js/starts.js','js/main.js','js/mods.js','js/save.js','js/save_v4.js']);

async function importExample(page, info, prefix) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/mobile-opening-' + prefix + '.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}), page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {
    return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix + '_world'];
  }, prefix);
}

for (const prefix of ['harbor','dune']) {
  test(prefix + ' JSON opening binds one person and conserves an independently composed muster', async function ({page}, info) {
    await importExample(page, info, prefix);
    await beginBookmark(page, info, prefix + '_world', prefix + '_household');
    const result = await page.evaluate(function (prefix) {
      const s=FB.state, M=FB.mobile, bm=FB.campaignBookmark(s), d=bm.realms.find(function (r) {return r.mobile;});
      const r=M.row(s,d.id), host=M.host(s,d.id), profile=M.profile(s,d.id), o=d.mobile.opening;
      const members=r.members.map(function (m) {
        return {id:m.id, civilians:m.civilians.reduce(function (n,c) {return n+c.count;},0),
          deployed:host.mobileRoster.filter(function (c) {return c.memberId===m.id;}).reduce(function (n,c) {return n+c.count;},0)};
      });
      const onePerson=o.principals.every(function (binding) {
        const c=FB.bookmarkActor(s,binding.person.actorId);
        return r.members.find(function (m) {return m.id===binding.memberId;}).principal.id===c.id &&
          Object.keys(s.chars).filter(function (id) {return s.chars[id].name===c.name;}).length===1;
      });
      const expected={};o.muster.forEach(function (row) {expected[row.unitId]=(expected[row.unitId] || 0)+row.count;});
      const composition=FB.unitClassIds().every(function (id) {return host.units[id]===(expected[id] || 0);});
      const initial=profile.members.reduce(function (n,m) {return n+m.population;},0);
      const conserved=members.every(function (m) {
        return m.civilians+m.deployed===profile.members.find(function (p) {return p.id===m.id;}).population;
      });
      const before=JSON.stringify(s), rng=FB.getRngState(), uid=FB.getUidCounter();
      M.initialize(s,bm.realms); FB.mobileInitializeAuthored(s,bm.realms);
      const facts={schema:r.schema,onePerson:onePerson,composition:composition,conserved:conserved,
        total:M.total(s,d.id),initial:initial,men:host.men,food:r.food+host.mobileFood,
        leader:M.leader(s,d.id).name,sex:M.leader(s,d.id).sex,born:M.leader(s,d.id).born,
        leaderMember:r.members.find(function (m) {return m.principal.id===r.leaderId;}).id,
        generation:FB.realmRulerGeneration(s,d.id),generated:r.members.filter(function (m) {
          return !r.openingBindings.some(function (b) {return b.characterId===m.principal.id;});
        }).map(function (m) {const c=s.chars[m.principal.id];return [c.sex,s.date.year-c.born];}),
        noCounties:FB.realmTerritory(s,d.id).length===0,valid:M.validate(s),
        repeatPure:before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter()};
      const record=JSON.stringify([r,host,s.bookmarkSetup.actors]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      facts.restored=record===JSON.stringify([M.row(FB.state,d.id),M.host(FB.state,d.id),FB.state.bookmarkSetup.actors]);
      return facts;
    }, prefix);
    expect(result).toMatchObject({schema:2,onePerson:true,composition:true,conserved:true,men:160,food:3200,
      noCounties:true,valid:true,repeatPure:true,restored:true,sex:'f'});
    expect(result.total).toBe(result.initial);
    expect(result).toMatchObject(prefix==='harbor' ? {leader:'Lena Reed',born:857,leaderMember:'reed_people',generated:[]}
      : {leader:'Sela Vey',born:868,leaderMember:'well_following',generation:1,generated:[['m',30]]});
  });

  test(prefix + ' observer initializes the same direct actors before world stories', async function ({page}, info) {
    await importExample(page, info, prefix);
    const activation=await page.evaluate(function (prefix) {
      return new Promise(function (resolve) {
        FB.activateBookmark(prefix+'_world',null,function (error) {resolve(error ? error.message : null);});
      });
    },prefix);
    expect(activation).toBe(null);
    const result=await page.evaluate(function () {
      FB.game.pending={seed:'MOBILEOPENINGOBSERVER'};
      FB.game.startObserve(); FB.game.setPaused(true);
      const s=FB.state, d=FB.campaignBookmark(s).realms.find(function (r) {return r.mobile;});
      return {observing:FB.game.observe,valid:FB.mobile.validate(s),schema:FB.mobile.row(s,d.id).schema,
        onePerson:FB.mobile.row(s,d.id).openingBindings.every(function (b) {
          return FB.bookmarkActor(s,b.person.actorId).id===b.characterId;
        }),men:FB.mobile.host(s,d.id).men};
    });
    expect(result).toEqual({observing:true,valid:true,schema:2,onePerson:true,men:160});
  });
}

test('detached malformed opening imports reject without publication or identity consumption', async function ({page}, info) {
  await openGame(page, info);
  const result=await page.evaluate(function (source) {
    const changes=[
      function (d,o) {o.principals[0].person.actorId='absent_actor';},
      function (d,o) {o.principals[1].memberId=o.principals[0].memberId;},
      function (d,o) {o.leaderMemberId='absent_member';},
      function (d,o) {o.muster[0].count++;},
      function (d,o) {o.muster.push(o.muster[0]);},
      function (d,o) {o.muster[0].unitId='mercs';},
      function (d,o) {o.muster[0].unitId='absent_class';},
      function (d,o) {o.muster[0].count=0;},
      function (d,o) {o.muster[0].memberId='absent_member';},
      function (d,o) {o.muster[0].count=1000;d.mobile.fighters=1120;},
      function (d,o,b) {b.opening.actors.harbor_leader.born=899;},
      function (d,o,b) {b.opening.actors.harbor_leader.home='harbor_hill';},
      function (d,o) {o.principals[0].person={kind:'realm_ruler',realmId:'harbor_commune',actorId:'harbor_companion',generation:1};},
      function (d,o) {o.muster[0].extra=true;},
      function (d,o) {o.principals[1].person.actorId=o.principals[0].person.actorId;},
      function (d,o) {o.muster[0].memberId='constructor';}
    ];
    return changes.map(function (change) {
      const input=JSON.parse(JSON.stringify(source)), bm=input.bookmarks.harbor_world, d=bm.realms.find(function (r) {return r.mobile;});
      change(d,d.mobile.opening,bm);
      const state=JSON.stringify(FB.state), data=JSON.stringify(FBDATA), rng=FB.getRngState(), uid=FB.getUidCounter(), bytes=JSON.stringify(input);
      return FB.mods.validate(input).length>0 && state===JSON.stringify(FB.state) && data===JSON.stringify(FBDATA) &&
        rng===FB.getRngState() && uid===FB.getUidCounter() && bytes===JSON.stringify(input);
    });
  }, examples.harbor);
  expect(result).toEqual(Array(16).fill(true));
});

test('incumbent imports require the exact opening person and generation', async function ({page}, info) {
  await openGame(page, info);
  const result=await page.evaluate(function (source) {
    const changes=[function (o,a) {o.principals[0].person.generation=2;},
      function (o,a) {delete o.principals[0].person.generation;},
      function (o,a) {a.name='Different incumbent';},function (o,a) {a.born--;},
      function (o,a) {a.sex='m';},function (o,a) {a.ref={kind:'realm_ruler',realmId:'dune_oasis'};}];
    return changes.map(function (change) {
      const input=JSON.parse(JSON.stringify(source)),bm=input.bookmarks.dune_world;
      const d=bm.realms.find(function (r) {return r.mobile;});
      change(d.mobile.opening,bm.opening.actors.dune_incumbent);
      const state=JSON.stringify(FB.state),data=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(input).length>0 && state===JSON.stringify(FB.state) && data===JSON.stringify(FBDATA) &&
        rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  },examples.dune);
  expect(result).toEqual(Array(6).fill(true));
});

test('fresh eligibility refuses stale, captive, displaced, duplicate and ineligible principals atomically', async function ({page}, info) {
  await importExample(page, info, 'dune');
  await beginBookmark(page, info, 'dune_world', 'dune_household');
  const result=await page.evaluate(function () {
    const source=FB.state, bm=FB.campaignBookmark(source), definition=bm.realms.find(function (r) {return r.mobile;});
    function fresh() {
      const s=JSON.parse(JSON.stringify(source));
      delete s.authority.governments[definition.id].mobile;
      s.armies=s.armies.filter(function (a) {return a.realm!==definition.id;});
      s.authority.migrations=s.authority.migrations.filter(function (m) {return m.realmId!==definition.id;});
      return s;
    }
    const ready=fresh(),beforeReady=JSON.stringify(ready),rngReady=FB.getRngState(),uidReady=FB.getUidCounter();
    const allowed=FB.mobile.openingPlan(ready,definition).allowed;
    const readyPure=allowed && beforeReady===JSON.stringify(ready) && rngReady===FB.getRngState() && uidReady===FB.getUidCounter();
    let batchRefused=false;
    try {FB.mobile.initialize(ready,[definition,Object.assign({},definition,{id:'absent_realm'})]);} catch(error) {batchRefused=true;}
    const batchPure=batchRefused && beforeReady===JSON.stringify(ready) && rngReady===FB.getRngState() && uidReady===FB.getUidCounter();
    const changes=[
      function (s,d,c) {c.dead=true;},function (s,d,c) {c.captive=true;},
      function (s,d,c) {c.prisonerOf='dune_oasis';},function (s,d,c) {c.exiled=true;},
      function (s,d,c) {c.born=899;},function (s,d,c) {c.homeProvinceId='dune_pass';},
      function (s,d,c) {s.realms[d.id].ruler.generation=FB.realmRulerGeneration(s,d.id)+1;},
      function (s,d,c) {s.realms[d.id].ruler.name='Another incumbent';},
      function (s,d,c) {d.mobile.opening.muster[0].unitId='cataphract';},
      function (s,d,c) {s.bookmarkSetup.actors.dune_incumbent='absent_person';},
      function (s,d,c) {s.realms.dune_oasis.alive=false;},
      function (s,d,c) {s.armies.push({id:'following_'+d.id});},
      function (s,d,c) {s.authority.governments.other_following={mobile:{status:'active',members:[{principal:{id:c.id}}]}};},
      function (s,d,c) {s.realmTech[d.id].completed=[];s.realmTechMigration=2;d.mobile.opening.muster[0].unitId='crossbow';},
      function (s,d,c) {s.player.charId=c.id;s.player.travel={currentId:'dune_pass'};}
    ];
    const rejected=changes.map(function (change) {
      const s=fresh(),d=JSON.parse(JSON.stringify(definition)),c=FB.bookmarkActor(s,'dune_incumbent');
      change(s,d,c);
      const before=JSON.stringify(s), live=JSON.stringify(source), rng=FB.getRngState(), uid=FB.getUidCounter();
      const blocked=!FB.mobile.openingPlan(s,d).allowed;let refused=false;
      try {FB.mobile.initialize(s,[d]);} catch(error) {refused=true;}
      return blocked && refused && before===JSON.stringify(s) && live===JSON.stringify(source) &&
        rng===FB.getRngState() && uid===FB.getUidCounter();
    });
    return {readyPure:readyPure,batchPure:batchPure,rejected:rejected};
  });
  expect(result).toEqual({readyPure:true,batchPure:true,rejected:Array(15).fill(true)});
});

test('matching saves preserve casualties and original bindings, and malformed provenance rejects before adoption', async function ({page}, info) {
  await importExample(page, info, 'harbor');
  await beginBookmark(page, info, 'harbor_world', 'harbor_household');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',army=M.host(s,rid),initial=M.total(s,rid);
    FB.applyHostLosses(army,20,s);
    const dead=M.row(s,rid).accounting.dead,remaining=M.total(s,rid),row=JSON.stringify(M.row(s,rid));
    const host=JSON.stringify(M.host(s,rid)),actors=JSON.stringify(s.bookmarkSetup.actors),people=Object.keys(s.chars).length;
    const source=JSON.parse(FB.save.serialize()); FB.save.restore(source);
    const kept=row===JSON.stringify(M.row(FB.state,rid)) && host===JSON.stringify(M.host(FB.state,rid)) &&
      actors===JSON.stringify(FB.state.bookmarkSetup.actors) && people===Object.keys(FB.state.chars).length &&
      (source.rng>>>0)===(FB.getRngState()>>>0) && source.uid===FB.getUidCounter();
    const changes=[function (r) {delete r.openingBindings;},function (r) {r.schema=1;},
      function (r) {r.openingBindings.pop();},function (r) {r.openingBindings.push(r.openingBindings[0]);},
      function (r) {r.openingBindings[0].characterId=r.openingBindings[1].characterId;},
      function (r) {r.openingBindings[0].person.actorId='absent_actor';},
      function (r) {r.openingBindings[0].memberId='absent_member';},function (r) {r.openingBindings[0].extra=1;}];
    const rejected=changes.map(function (change) {
      const input=JSON.parse(JSON.stringify(source));change(input.state.authority.governments[rid].mobile);
      const live=FB.state,rng=FB.getRngState(),uid=FB.getUidCounter(),bytes=JSON.stringify(input);let refused=false;
      try {FB.save.restore(input);} catch(error) {refused=true;}
      return refused && live===FB.state && rng===FB.getRngState() && uid===FB.getUidCounter() && bytes===JSON.stringify(input);
    });
    const c=FB.bookmarkActor(FB.state,'harbor_leader');c.dead=true;
    FB.advanceRealmSuccession(FB.state,rid,{cause:'death'});
    const afterDeath=JSON.stringify(M.row(FB.state,rid));FB.save.restore(JSON.parse(FB.save.serialize()));
    return {kept:kept,loss:initial-remaining,dead:dead,rejected:rejected,valid:M.validate(FB.state),
      noRegeneration:afterDeath===JSON.stringify(M.row(FB.state,rid)) && FB.bookmarkActor(FB.state,'harbor_leader').dead===true};
  });
  expect(result).toEqual({kept:true,loss:20,dead:20,rejected:Array(8).fill(true),valid:true,noRegeneration:true});
});

test('changed opening composition under the same mod name invalidates the saved fingerprint', async function ({page}, info) {
  await importExample(page, info, 'harbor');
  await beginBookmark(page, info, 'harbor_world', 'harbor_household');
  const result=await page.evaluate(function (mod) {
    const saved=JSON.parse(FB.save.serialize()),matching=!FB.save.otherWorld(saved);
    const changed=JSON.parse(JSON.stringify(mod)),d=changed.bookmarks.harbor_world.realms.find(function (r) {return r.mobile;});
    d.mobile.opening.muster[0].count--;d.mobile.opening.muster[1].count++;
    FB.mods.apply(changed);
    const before=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
    try {FB.save.restore(saved);} catch(error) {rejected=/different mod/.test(error.message);}
    return {matching:matching,mismatch:FB.save.otherWorld(saved),rejected:rejected,
      pure:before===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  },examples.harbor);
  expect(result).toEqual({matching:true,mismatch:true,rejected:true,pure:true});
});
