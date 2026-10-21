'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startParityGame } = require('../support/game/parity');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'index.html','data/starts_western_rulers_1096.js','data/story_western_rulers_1096.js',
  'data/bookmark_1096_western_expeditions.js','data/bookmark_1096_mainz.js','data/mobile_confederations.js',
  'data/units.js','data/technology.js','data/political_institutions.js',
  'data/bookmark_1096_scaffold_a.js','data/bookmark_1096_scaffold_b.js','data/bookmark_1096.js','data/starts.js',
  'data/government_rollout.js','data/story_instances.js','data/communal_revisions.js',
  'js/main.js','js/world.js','js/starts.js','js/model.js','js/stories.js',
  'js/story_ruler_agenda.js','js/story_opening_goals.js','js/save.js','js/save_v4.js',
  'js/story_expedition_preparation.js','js/story_expedition_program.js','js/story_expedition_agreements.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/mobile_columns.js','js/expedition_programs.js',
  'js/home_authority.js','js/treasury.js','js/market.js','js/population.js','js/armies.js','js/federates.js',
  'js/governments.js','js/government_selection.js','js/government_lineage.js','js/bookmark_setup.js',
  'js/logistics.js','js/climate.js','js/authority.js','js/technology.js','js/holywar.js','js/ui_mobile.js'
]);

const openings = [
  { scenario:'godfrey_1096', agenda:'godfrey_agenda_1096', profile:'opening_godfrey_1096',
    realm:'lower_lotharingia_1096', county:'verdun', name:'Godfrey of Bouillon', born:1060,
    kin:['Ida of Lorraine','Eustace III','Baldwin'], contact:'imperial_ruler', other:'hre_1096', site:'geo_bouillon_2801283' },
  { scenario:'raymond_1096', agenda:'raymond_agenda_1096', profile:'opening_raymond_1096',
    realm:'toulouse_1096', county:'toulouse', name:'Raymond IV', born:1042,
    kin:['Elvira of Castile','Bertrand'], contact:'french_ruler', other:'france_1096', site:'toulouse_head' },
  { scenario:'bohemond_1096', agenda:'bohemond_agenda_1096', profile:'opening_bohemond_1096',
    realm:'bohemond_lordships_1096', county:'taranto', name:'Bohemond', born:1054,
    kin:[], contact:'papal_ruler', other:'papacy_1096', site:'taranto_head' }
];

async function start(page, info, row) {
  await startParityGame(page, info, { bookmark:'1096', scenario:row.scenario, declaredOpening:true });
}

test('western rulers use ordinary birthplace, Story and start-code gates', async function ({ page }, info) {
  await openGame(page, info);
  const button = page.locator('#btn-choose-beginning');
  if (await button.isVisible()) await button.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#bookmarklist [data-bookmark="1096"]').click();
  for (const row of openings) {
    await expect(page.locator('#scenariolist [data-scenario="' + row.scenario + '"]')).toBeVisible();
    await expect(page.locator('#scenariolist [data-scenario="' + row.scenario + '"]')).not.toHaveAttribute('aria-disabled', 'true');
  }
  expect(await page.evaluate(function (rows) {
    const b = FB.bookmark('1096'), before = JSON.stringify(FBDATA), rng = FB.getRngState();
    return { errors:FB.validateBookmark(b), rows:rows.map(function (r) {
      const sc = FBDATA.startScenarios.find(function (s) { return s.id === r.scenario; });
      return { id:sc.id, local:FB.startProvinceAllowed(sc,b,r.county), away:FB.startProvinceAllowed(sc,b,'cologne'),
        wrongDate:sc.bookmarkIds.indexOf('1066') >= 0 && FB.startProvinceAllowed(sc,FB.bookmark('1066'),r.county),
        tracks:FB.startStoryTracks(sc,r.county), family:Object.keys(sc.familyPresets),
        anchor:b.startLocations[sc.id], grants:sc.startEffects || null };
    }), pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() };
  }, openings)).toEqual({ errors:[], rows:openings.map(function (r) {
    return { id:r.scenario, local:true, away:false, wrongDate:false, tracks:[r.agenda], family:['standard'], anchor:[r.county], grants:null };
  }), pure:true });
});

for (const row of openings) {
  test(row.scenario + ' adopts one incumbent and the exact named household at its home site', async function ({ page }, info) {
    await start(page, info, row); // The real code-entry and new-game path, including its identity gates.
    const result = await page.evaluate(function (r) {
      const s = FB.state, me = s.chars[s.player.charId], p = s.player;
      const kin = r.kin.map(function (name) {
        return Object.keys(s.chars).map(function (id) { return s.chars[id]; }).filter(function (c) { return c.name === name && !c.dead; });
      });
      const profile = s.stories[r.profile], other = FB.realmRulerCharacterSnapshot(s,r.other);
      const b = FB.bookmark('1096'), definition = b.realms.find(function (d) { return d.id === r.realm; });
      const expected = b.provinces.filter(function (c) { return c.realm === r.realm; }).map(function (c) { return c.id; }).sort();
      const home = FB.world.byId[p.provinceId].settlements[p.homeSettlement];
      const familyOK = r.scenario === 'bohemond_1096' ? !me.spouseId && me.childrenIds.length === 0
        : r.scenario === 'godfrey_1096'
        ? !me.spouseId && me.childrenIds.length === 0 && me.motherId === kin[0][0].id &&
          kin[1][0].motherId === me.motherId && kin[2][0].motherId === me.motherId
        : me.spouseId === kin[0][0].id && kin[0][0].spouseId === me.id &&
          kin[1][0].fatherId === me.id && kin[1][0].motherId !== kin[0][0].id && me.childrenIds.length === 1;
      return { name:me.name, born:me.born, count:Object.values(s.chars).filter(function (c) { return c.name === r.name && !c.dead; }).length,
        home:p.provinceId, site:home.site, adopted:!s.realms[r.realm] && !!s.realms.player,
        ruler:FB.realmRulerCharacterSnapshot(s,'player').id === me.id,
        holdings:p.provs.slice().sort(), expected:expected, liege:p.liege,
        expectedLiege:definition.liege || null, kin:kin.map(function (list) { return list.length; }), familyOK:familyOK,
        localStories:openingsIgnored(), goals:Object.keys(profile.goals).length,
        contact:profile.contacts[r.contact] === other.id, freeFriend:!!((s.friends || {})[other.id]),
        journey:p.travel || null, homeUnchanged:s.owner.liege === 'hre_1096' };
      function openingsIgnored() {
        return ['godfrey_agenda_1096','raymond_agenda_1096','bohemond_agenda_1096'].filter(function (id) { return !!s.stories[id]; });
      }
    }, row);
    expect(result).toMatchObject({ name:row.name, born:row.born, count:1, home:row.county, site:row.site,
      adopted:true, ruler:true, kin:row.kin.map(function () { return 1; }), familyOK:true,
      localStories:[row.agenda], goals:3, contact:true, freeFriend:false, journey:null, homeUnchanged:true });
    expect(result.holdings).toEqual(result.expected);
    expect(result.liege).toBe(result.expectedLiege);
  });

  test(row.scenario + ' completes eight dated reviews with no resource, family, army or property effects', async function ({ page }, info) {
    await start(page, info, row);
    expect(await page.evaluate(function (r) {
      const s = FB.state, id = r.agenda, story = FB.stories.get(id), d = story.declaration;
      function resources() { return JSON.stringify([s.owner,s.holder,s.player.gold,s.player.prestige,s.player.piety,
        s.armies,s.authority.contracts,s.player.travel,s.player.provs,Object.keys(s.chars)]); }
      const before = resources(), pureBefore = JSON.stringify(s), rng = FB.getRngState();
      FB.stories.cards(s); FB.stories.choices(s,id); FB.stories.quote(s,id,d.stages[0].choices[0].id);
      const pure = pureBefore === JSON.stringify(s) && rng === FB.getRngState();
      const advanced = d.stages.map(function (stage) {
        s.date = { year:stage.year, season:stage.season, day:1 }; s.turn++;
        const c = stage.choices.find(function (choice) { return choice.operation === 'agenda_priority'; });
        return FB.stories.apply(s,id,c.id,FB.stories.quote(s,id,c.id));
      });
      const t = s.stories[id], goal = s.stories[r.profile].goals;
      const saved = JSON.parse(FB.save.serialize()), record = JSON.stringify([t,s.stories[r.profile]]);
      FB.save.restore(saved);
      return { pure:pure, advanced:advanced, unchanged:before === resources(), status:t.status, decisions:t.decisions.length,
        goals:Object.keys(goal).filter(function (key) { return key !== 'reserve'; }).every(function (key) { return goal[key].status === 'completed'; }),
        restored:record === JSON.stringify([FB.state.stories[id],FB.state.stories[r.profile]]) };
    }, row)).toEqual({ pure:true, advanced:Array(8).fill(true), unchanged:true, status:'agenda_complete', decisions:8, goals:true, restored:true });
  });

  test(row.scenario + ' can stop, rejects replay and rejects erased original attachments', async function ({ page }, info) {
    await start(page, info, row);
    expect(await page.evaluate(function (r) {
      let s = FB.state;
      const id = r.agenda, q = FB.stories.quote(s,id,'agenda_stop_program'), gold = s.player.gold;
      function family() {
        return JSON.stringify([r.name].concat(r.kin).map(function (name) {
          const c = Object.values(FB.state.chars).find(function (c) { return c.name === name && !c.dead; });
          return [c.id,c.born,c.motherId,c.fatherId,c.spouseId,c.childrenIds,c.homeProvinceId];
        }));
      }
      const identity = family();
      const stopped = FB.stories.apply(s,id,'agenda_stop_program',q);
      const repeated = FB.stories.apply(s,id,'agenda_stop_program',q), status = s.stories[id].status;
      const saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved); s = FB.state;
      const retained = s.stories[id].status === status && s.player.gold === gold && identity === family();
      const absent = JSON.parse(FB.save.serialize());
      delete absent.state.stories[id]; delete absent.state.stories[r.profile];
      const before=JSON.stringify(FB.state);let rejected=false;
      try {FB.save.restore(absent);} catch (error) {rejected=before===JSON.stringify(FB.state);}
      return { stopped:stopped, repeated:repeated, status:status, retained:retained,
        rejected:rejected && identity === family() };
    }, row)).toEqual({ stopped:true, repeated:false, status:'agenda_stopped', retained:true, rejected:true });
  });

  test(row.scenario + ' interrupts when the original protagonist dies without executing a pending choice', async function ({ page }, info) {
    await start(page, info, row);
    expect(await page.evaluate(function (r) {
      const s = FB.state, story = FB.stories.get(r.agenda), t = s.stories[r.agenda];
      const c = story.declaration.stages[0].choices[0].id, quote = FB.stories.quote(s,r.agenda,c);
      const money = s.player.gold, owners = JSON.stringify(s.owner);
      s.chars[s.player.charId].dead = true;
      story.day(s,t);
      const applied = FB.stories.apply(s,r.agenda,c,quote);
      FB.stories.get(r.profile).day(s,s.stories[r.profile]);
      return { applied:applied, status:t.status, decisions:t.decisions.length,
        unchanged:money === s.player.gold && owners === JSON.stringify(s.owner),
        archived:Object.keys(s.stories[r.profile].goals).every(function (id) {
          return s.stories[r.profile].goals[id].status !== 'pending';
        }) };
    }, row)).toEqual({ applied:false, status:'agenda_interrupted', decisions:0, unchanged:true, archived:true });
  });
}

test('foreign household members remain at their declared homes and no later infant is invented', async function ({ page }, info) {
  await start(page, info, openings[0]);
  expect(await page.evaluate(function () {
    const s = FB.state;
    return ['Ida of Lorraine','Eustace III','Baldwin'].map(function (name) {
      const c = Object.values(s.chars).find(function (c) { return c.name === name && !c.dead; });
      return [c.name,c.homeProvinceId];
    });
  })).toEqual([['Ida of Lorraine','boulogne'],['Eustace III','boulogne'],['Baldwin','verdun']]);
  await start(page, info, openings[1]);
  expect(await page.evaluate(function () {
    const me = FB.state.chars[FB.state.player.charId];
    return me.childrenIds.map(function (id) { return FB.state.chars[id].name; });
  })).toEqual(['Bertrand']);
});

// Historical declarations consume the same canonical owners as the independent JSON specs.
async function expedition(page,info,row,revision) {
  if (revision) {
    await openGame(page,info);
    await page.evaluate(function (revision) {FBDATA.bookmarks['1096'].revision=revision;},revision);
    await page.evaluate(function () {return new Promise(function (resolve,reject) {
      FB.activateBookmark('1096',null,function (error) {if (error) reject(error);else resolve();});
    });});
    await page.evaluate(function (r) {
      FB.game.pending={scenario:FBDATA.startScenarios.find(function (sc) {return sc.id===r.scenario;}),
        bookmarkId:'1096',provinceId:r.county,name:r.name,sex:'m',familyPreset:'standard',seed:'WESTERN'};
      FB.game.start();FB.game.setPaused(true);
    },row);
  } else await start(page,info,row);
  await page.evaluate(function (r) {
    const prefix=r.scenario.split('_')[0];
    window.westernCase={rid:prefix+'_host_1096',prep:prefix+'_preparation_1096',program:prefix+'_program_1096',row:r,
      next:function (s) {s.date=FB.dateAtTurn(s,s.turn+1);s.turn++;},
      turn:function (s,n) {s.date=FB.dateAtTurn(s,n);s.turn=n;},
      run:function (s,action,step) {return FB.expeditionStoryPrograms.commit(s,
        FB.expeditionStoryPrograms.review(s,this.program,action,s.stories[this.program].actorId,step));},
      form:function (s,source) {
        if (!this.run(s,'authorize')) return false;this.next(s);
        if (!this.run(s,source || 'contribute')) return false;this.next(s);
        return this.run(s,'form');
      },
      owners:function () {const s=FB.state;return JSON.stringify([s.start,s.stories,s.chars,s.realms,s.armies,
        s.authority.migrations,s.population,s.market,s.owner,s.holder,s.player.gold]);},
      restore:function () {const before=this.owners(),saved=JSON.parse(FB.save.serialize()),rng=FB.getRngState(),uid=FB.getUidCounter();
        FB.save.restore(saved);FB.save.restore(JSON.parse(JSON.stringify(saved)));
        return before===this.owners() && (rng>>>0)===(FB.getRngState()>>>0) && uid===FB.getUidCounter();},
      fundRoad:function (s) {const q=FB.homeAuthority.fundingQuote(s,{source:{kind:'private',characterId:s.player.charId},
        recipientRealmId:this.rid,amount:8,characterId:s.player.charId});return FB.homeAuthority.fund(s,q);},
      homeAnswer:function (s,action) {
        const a=FB.mobile.row(s,this.rid).agreements.find(function (a) {return a.status==='offered' && a.partnerId==='player';});
        if (!a) return false;
        return FB.mobile.commit(s,FB.mobile.review(s,{realmId:this.rid,action:action || 'accept',terms:{agreementId:a.id},
          actor:{kind:'character',id:s.player.charId}}));
      },
      permission:function (s) {
        const d=FB.campaignBookmark(s).realms.find(function (d) {return d.id===this.rid;},this),
          count=d.mobile.expeditionProgram.steps[0].terms.countyIds.length;
        for (let i=0;i<count*2+2;i++) {
          if (FB.mobile.row(s,this.rid).expeditionProgram.steps[0].status==='complete') return true;
          this.next(s);
          const q=FB.expeditionStoryPrograms.review(s,this.program,'step',s.player.charId,'local_permission');
          // The actual home ruler separately confirms their own offer; daily dispatch alone answers NPCs.
          if (q.allowed && (!q.operation.review.operation || q.operation.review.operation.request.action==='offer'))
            FB.expeditionStoryPrograms.commit(s,q);
          else if (FB.mobile.row(s,this.rid).agreements.some(function (a) {return a.status==='offered' && a.partnerId==='player';}))
            this.homeAnswer(s);
          else FB.expeditionPrograms.day(s);
        }
        return FB.mobile.row(s,this.rid).expeditionProgram.steps[0].status==='complete';
      }};
  },row);
}

for (const row of openings) {
  test(row.scenario+' fresh preparation binds the existing home person with no host or subsidy',async function ({page},info) {
    await expedition(page,info,row,'western_expeditions_v1');
    const r=await page.evaluate(function () {
      const C=westernCase,s=FB.state,t=s.stories[C.prep],b=FB.campaignBookmark(s),
        d=b.realms.find(function (d) {return d.id===C.rid;}),p=FBDATA.mobileProfiles[d.mobile.profileId],
        before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),P=FB.expeditionPreparation,
        q=P.review(s,C.prep,'authorize',s.player.charId),form=P.review(s,C.prep,'form',s.player.charId);
      FB.stories.cards(s);FB.stories.choices(s,C.program);
      return {valid:FB.validateBookmark(b),raw:FB.validateBookmark(FBDATA.bookmarks['1096']),
        revisions:FB.bookmarkRevisions('1096').every(function (b) {return !FB.validateBookmark(b).length;}),
        one:t.bindings.length===1 && t.bindings[0].characterId===s.player.charId && t.provider.characterId===s.player.charId,
        original:t.bindings[0].person.realmId===C.row.realm && t.bindings[0].person.generation===1,
        public:s.realms.player.treasury.publicOwnerId===C.row.realm && s.player.gold===100,
        policy:FB.homeAuthority.policy(s,'player'),authorized:q.allowed,unformed:!form.allowed && !FB.mobile.row(s,C.rid) &&
          !FB.mobile.host(s,C.rid) && FB.treasuryAvailable(s,C.rid)===0 && t.authorizedTurn===null,
        total:t.reserves.reduce(function (n,c) {return n+c.count;},0),fighters:d.mobile.fighters,
        civilians:p.members[0].population-d.mobile.fighters,stock:d.mobile.food,treasury:d.mobile.treasury,
        liege:s.player.liege,sovereign:s.owner[C.row.county],holder:s.holder[C.row.county],
        jurisdiction:t.openingJurisdiction ? t.openingJurisdiction.realms.map(function (x) {return x.realmId;}) : null,
        pure:before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter(),restored:C.restore()};
    });
    const prefix=row.scenario.split('_')[0],lord=prefix==='godfrey' ? 'hre_1096' : prefix==='raymond' ? 'france_1096' : null;
    expect(r).toEqual({valid:[],raw:[],revisions:true,one:true,original:true,public:true,
      policy:{schema:1,presence:'capital',delegation:true},authorized:true,unformed:true,
      total:prefix==='godfrey' ? 640 : prefix==='raymond' ? 800 : 480,fighters:prefix==='bohemond' ? 240 : 320,
      civilians:prefix==='raymond' ? 480 : prefix==='godfrey' ? 320 : 240,stock:0,treasury:0,liege:lord,
      sovereign:lord || 'player',holder:'player',jurisdiction:lord ? [row.realm,lord] : null,pure:true,restored:true});
  });

  test(row.scenario+' a voluntary gift buys one formation while authorization and public funds remain separate',async function ({page},info) {
    await expedition(page,info,row);
    expect(await page.evaluate(function () {
      const C=westernCase,s=FB.state,P=FB.expeditionPreparation,actor=s.player.charId,
        home=FB.treasuryAvailable(s,'player'),gold=s.player.gold,land=JSON.stringify([s.owner,s.holder]),
        people=Object.keys(s.chars).sort().join('|'),population=JSON.stringify(s.population.counties),
        t=s.stories[C.prep],bindings=JSON.stringify(t.bindings),gift=P.review(s,C.prep,'contribute',actor),
        given=P.commit(s,gift),repeat=P.commit(s,gift);
      C.next(s);const independent=!P.review(s,C.prep,'form',actor).allowed && t.authorizedTurn===null &&
        s.player.gold===gold-gift.cost && FB.treasuryAvailable(s,'player')===home,
        authorize=C.run(s,'authorize');C.next(s);
      const q=P.review(s,C.prep,'form',actor),stock=FB.marketProvisionSnapshot(s,C.row.county).stock,
        formed=P.commit(s,q),replay=P.commit(s,q),row=FB.mobile.row(s,C.rid),host=FB.mobile.host(s,C.rid);
      if (!formed) return {given:given,authorize:authorize,formed:formed,reason:q.reason};
      const f=s.stories[C.prep].formed;
      return {given:given,repeat:repeat,independent:independent,authorize:authorize,formed:formed,replay:replay,
        exact:Math.abs(gift.cost-q.cost)<1e-8 && FB.treasuryAvailable(s,C.rid)<1e-8 &&
          Math.abs(FB.treasuryAvailable(s,'player')-home-q.foodCost)<1e-8 &&
          stock-FB.marketProvisionSnapshot(s,C.row.county).stock===q.food &&
          Math.abs(row.food+host.mobileFood-q.food)<1e-8,
        target:f.provisionTarget.targetDays===14 && f.provisionTarget.fieldFood===host.mobileFood &&
          f.provisionTarget.campFood===row.food && f.food===q.food,
        one:row.leaderId===actor && FB.mobile.leader(s,C.rid).id===actor && s.armies.filter(function (a) {return a.realm===C.rid;}).length===1,
        conserved:people===Object.keys(s.chars).sort().join('|') && population===JSON.stringify(s.population.counties) &&
          land===JSON.stringify([s.owner,s.holder]) && bindings===JSON.stringify(row.openingBindings),
        family:C.row.kin.every(function (name) {const c=Object.values(s.chars).find(function (c) {return c.name===name;});
          return !row.members.some(function (m) {return m.principal.id===c.id;});}),
        valid:FB.mobile.validate(s),restored:C.restore()};
    })).toEqual({given:true,repeat:false,independent:true,authorize:true,formed:true,replay:false,
      exact:true,target:true,one:true,conserved:true,family:true,valid:true,restored:true});
  });

  test(row.scenario+' stale formation and public grant quotes reject without touching resources',async function ({page},info) {
    await expedition(page,info,row);
    const result=await page.evaluate(function () {
      const C=westernCase,s=FB.state,P=FB.expeditionPreparation,actor=s.player.charId,
        privateGold=s.player.gold,home=FB.treasuryAvailable(s,'player'),q=P.review(s,C.prep,'grant',actor),
        granted=P.commit(s,q),separate=s.player.gold===privateGold && s.stories[C.prep].authorizedTurn===null &&
          Math.abs(FB.treasuryAvailable(s,'player')-home+q.cost)<1e-8 && FB.treasuryAvailable(s,C.rid)===q.cost;
      C.next(s);const authorized=C.run(s,'authorize');C.next(s);
      const changes=[function (x) {x.chars[actor].dead=true;},function (x) {x.realms.player.ruler.generation++;},
        function (x) {x.holder[C.row.county]='papacy_1096';},function (x) {x.owner[C.row.county]='papacy_1096';},
        function (x) {x.market.counties[C.row.county][0][x.market.goods.indexOf('provisions')]=0;},
        function (x) {x.date.season=(x.date.season+1)%4;},function (x) {C.turn(x,270);}];
      return {granted:granted,separate:separate,authorized:authorized,stale:changes.map(function (change) {
        const x=JSON.parse(JSON.stringify(s)),f=P.review(x,C.prep,'form',actor);change(x);
        const before=JSON.stringify(x),rng=FB.getRngState(),uid=FB.getUidCounter();
        return f.allowed && !P.commit(x,f) && before===JSON.stringify(x) && rng===FB.getRngState() && uid===FB.getUidCounter();
      }),restored:C.restore()};
    });
    expect(result).toEqual({granted:true,separate:true,authorized:true,stale:Array(7).fill(true),restored:true});
  });

  test(row.scenario+' ordinary outside responses conserve payment and actual route preflight controls the camp',async function ({page},info) {
    await expedition(page,info,row);
    const r=await page.evaluate(function () {
      const C=westernCase,M=FB.mobile,E=FB.expeditionPrograms;let s=FB.state;
      const formed=C.form(s),funded=formed && C.fundRoad(s);
      if (!formed || !funded) return {formed:formed,funded:funded};
      const origin=M.host(s,C.rid).at,home=s.player.provinceId,privateGold=s.player.gold,
        cash=FB.treasuryAvailable(s,C.rid),people=M.total(s,C.rid),land=JSON.stringify([s.owner,s.holder]);
      C.next(s);const offered=C.run(s,'step','local_permission'),a=M.row(s,C.rid).agreements[0],
        waiting=a && a.status==='offered' && !M.provisioningAccess(s,C.rid,a.countyIds[0]),
        pending=C.restore();s=FB.state;C.next(s);E.day(s);
      const withheld=M.row(s,C.rid).agreements[0].status==='offered',homeAccepted=C.homeAnswer(s),
        accepted=M.row(s,C.rid).agreements[0].status==='active',bounded=JSON.stringify(s);E.day(s);
      const once=bounded===JSON.stringify(s),complete=C.permission(s),agreements=M.row(s,C.rid).agreements,
        paid=Math.abs(cash-FB.treasuryAvailable(s,C.rid)-agreements.reduce(function (n,a) {return n+a.price;},0))<1e-8;
      C.next(s);const q=E.review(s,C.rid,'first_leg'),
        path=q.allowed && q.operation.review.path.every(function (pid) {return M.passage(s,C.rid,pid,true);}),
        issued=E.commit(s,q),host=M.host(s,C.rid),target=host.goal,noTeleport=host.at===origin && M.migration(s,C.rid).at===origin;
      let days=0;
      while (days<60 && (host.at!==target || host.moveLeft>0 || (host.path || []).length)) {
        C.next(s);days++;FB.mobileDay(s);FB.armyTick(s);FB.federateDay(s);
      }
      const arrived=host.at===target && target!==origin && M.migration(s,C.rid).at===target;
      return {formed:formed,funded:funded,offered:offered,waiting:waiting,pending:pending,withheld:withheld,homeAccepted:homeAccepted,accepted:accepted,once:once,
        complete:complete,paid:paid,path:path,issued:issued,noTeleport:noTeleport,arrived:arrived,days:days,
        conserved:people===M.total(s,C.rid) && land===JSON.stringify([s.owner,s.holder]) && s.player.gold===privateGold,
        home:s.player.provinceId===home,remoteHome:arrived && !FB.homeAuthority.quote(s,'player','grant').allowed,
        original:M.row(s,C.rid).leaderId===s.player.charId,valid:M.validate(s),restored:C.restore()};
    });
    expect(r).toMatchObject({formed:true,funded:true,offered:true,waiting:true,pending:true,withheld:true,homeAccepted:true,accepted:true,once:true,
      complete:true,paid:true,path:true,issued:true,noTeleport:true,arrived:true,conserved:true,home:true,remoteHome:true,
      original:true,valid:true,restored:true});
    expect(r.days).toBeLessThanOrEqual(60);
  });

  test(row.scenario+' no money and changed original outside authority grant no passage',async function ({page},info) {
    await expedition(page,info,row);
    expect(await page.evaluate(function () {
      const C=westernCase,s=FB.state,E=FB.expeditionPrograms,M=FB.mobile,formed=C.form(s);
      C.next(s);const offered=C.run(s,'step','local_permission');C.next(s);E.day(s);
      const row=M.row(s,C.rid),a=row.agreements[0],qPay=M.review(s,{realmId:C.rid,action:'accept',terms:{agreementId:a.id},
        actor:{kind:'character',id:s.player.charId}}),unpaid=a.status==='offered' && !qPay.allowed && qPay.reason==='funds' &&
        FB.treasuryAvailable(s,C.rid)<a.price && !M.provisioningAccess(s,C.rid,a.countyIds[0]),funded=C.fundRoad(s);C.next(s);
      const q=M.review(s,{realmId:C.rid,action:'accept',terms:{agreementId:a.id},actor:{kind:'character',id:s.player.charId}}),
        x=JSON.parse(JSON.stringify(s));
      x.chars[a.accessOrigin.chain[0].personId].dead=true;
      const before=JSON.stringify(x),rejected=q.allowed && !M.commit(x,q) && before===JSON.stringify(x),
        denied=!E.review(x,C.rid,'first_leg').allowed,position=M.host(x,C.rid).at===C.row.county;
      return {formed:formed,offered:offered,unpaid:unpaid,funded:funded,rejected:rejected,denied:denied,position:position,restored:C.restore()};
    })).toEqual({formed:true,offered:true,unpaid:true,funded:true,rejected:true,denied:true,position:true,restored:true});
  });

  test(row.scenario+' refusal expiry and original office loss preserve home life and never enroll a replacement',async function ({page},info) {
    await expedition(page,info,row);
    const r=await page.evaluate(function () {
      const C=westernCase,base=FB.save.serialize(),cases=['refuse','expired','office','death'].map(function (reason) {
        FB.save.restore(JSON.parse(base));const s=FB.state,me=s.player.charId,
          before=JSON.stringify([s.player.gold,s.owner,s.holder,s.armies,s.player.provs]),
          bindings=JSON.stringify(s.stories[C.prep].bindings);
        if (reason==='refuse') C.run(s,'refuse');
        else {
          if (reason==='expired') C.turn(s,270);
          if (reason==='office') s.holder[C.row.county]='papacy_1096';
          if (reason==='death') s.chars[me].dead=true;
          FB.stories.get(C.prep).day(s,s.stories[C.prep]);
        }
        FB.stories.get(C.program).day(s,s.stories[C.program]);
        const t=s.stories[C.prep],closed=t.status==='closed' && s.stories[C.program].status==='closed',
          noHost=!FB.mobile.row(s,C.rid) && !FB.mobile.host(s,C.rid) && FB.treasuryAvailable(s,C.rid)===0,
          exact=bindings===JSON.stringify(t.bindings) && t.bindings[0].characterId===me,
          quiet=reason==='office' || before===JSON.stringify([s.player.gold,s.owner,s.holder,s.armies,s.player.provs]);
        return closed && noHost && exact && quiet && C.restore();
      });
      return cases;
    });
    expect(r).toEqual(Array(4).fill(true));
  });

  test(row.scenario+' retained worlds keep the two personal tracks and never gain formation records on restore',async function ({page},info) {
    await expedition(page,info,row,'baseline');
    expect(await page.evaluate(function () {
      const C=westernCase,s=FB.state,save=JSON.parse(FB.save.serialize()),before=JSON.stringify(s.stories),
        absent=!s.stories[C.prep] && !s.stories[C.program] && !s.start.publicTreasury && !s.homeAuthorityPolicies;
      FBDATA.bookmarks['1096'].revision='western_expeditions_v1';
      FB.save.restore(save);FB.stories.start(FB.state);FB.mobile.initialize(FB.state,FB.campaignBookmark(FB.state).realms);
      return {absent:absent,retained:FB.state.start.revision==='baseline',exact:before===JSON.stringify(FB.state.stories),
        tracks:FB.state.start.storyAttachments.tracks,restored:C.restore()};
    })).toEqual({absent:true,retained:true,exact:true,tracks:[row.agenda,row.profile],restored:true});
  });

  test(row.scenario+' explicit home passage refusal and mandate expiry retain actual stores and land',async function ({page},info) {
    await expedition(page,info,row);
    expect(await page.evaluate(function () {
      const C=westernCase,s=FB.state,formed=C.form(s),funded=C.fundRoad(s);C.next(s);
      const offered=C.run(s,'step','local_permission'),before=JSON.stringify([s.owner,s.holder,s.player.gold,s.realms,s.armies,s.population]),
        cash=FB.treasuryAvailable(s,C.rid),camp=FB.mobile.migration(s,C.rid).at;
      C.next(s);const refused=C.homeAnswer(s,'decline'),a=FB.mobile.row(s,C.rid).agreements[0],
        blocked=!FB.expeditionPrograms.review(s,C.rid,'first_leg').allowed && !FB.mobile.provisioningAccess(s,C.rid,a.countyIds[0]),
        quiet=before===JSON.stringify([s.owner,s.holder,s.player.gold,s.realms,s.armies,s.population]),
        bindings=JSON.stringify(s.stories[C.prep].bindings),restored=C.restore();
      const x=FB.state;C.turn(x,720);FB.stories.get(C.program).day(x,x.stories[C.program]);
      return {formed:formed,funded:funded,offered:offered,refused:refused,ended:a.status==='ended',blocked:blocked,quiet:quiet,
        restored:restored,expired:x.stories[C.program].status==='closed' && x.stories[C.program].reason==='expired',
        command:!FB.mobile.commandValid(x,C.rid),camp:FB.mobile.migration(x,C.rid).at===camp,
        cash:FB.treasuryAvailable(x,C.rid)===cash,original:bindings===JSON.stringify(x.stories[C.prep].bindings),
        terminal:C.restore()};
    })).toEqual({formed:true,funded:true,offered:true,refused:true,ended:true,blocked:true,quiet:true,restored:true,
      expired:true,command:true,camp:true,cash:true,original:true,terminal:true});
  });
}

test('actual field losses preserve Godfrey’s civilian camp and cannot create another force on restore',async function ({page},info) {
  await expedition(page,info,openings[0]);
  expect(await page.evaluate(function () {
    const C=westernCase,s=FB.state,M=FB.mobile,formed=C.form(s),host=M.host(s,C.rid),row=M.row(s,C.rid),
      civilians=row.members.reduce(function (n,m) {return n+m.civilians.reduce(function (n,c) {return n+c.count;},0);},0),
      camp=M.migration(s,C.rid).at,food=row.food,money=FB.treasuryAvailable(s,C.rid),men=host.men,
      land=JSON.stringify([s.owner,s.holder]);
    FB.applyHostLosses(host,men,s);FB.mobileHostDisband(s,host);
    s.armies=s.armies.filter(function (a) {return a.id!==host.id;});C.next(s);
    return {formed:formed,noHost:M.host(s,C.rid)===null,camp:M.migration(s,C.rid).at===camp,
      people:M.total(s,C.rid)===civilians,civilianCount:civilians,accounted:row.accounting.dead===men,
      retained:row.food===food && FB.treasuryAvailable(s,C.rid)===money && land===JSON.stringify([s.owner,s.holder]),
      noRoute:!FB.expeditionPrograms.review(s,C.rid,'first_leg').allowed,
      valid:M.validate(s),restored:C.restore(),noReplay:!M.host(FB.state,C.rid)};
  })).toEqual({formed:true,noHost:true,camp:true,people:true,civilianCount:320,accounted:true,retained:true,
    noRoute:true,valid:true,restored:true,noReplay:true});
});

test('Raymond’s actual death and household succession never pass the original expedition to Bertrand',async function ({page},info) {
  await expedition(page,info,openings[1]);
  expect(await page.evaluate(function () {
    const C=westernCase,s=FB.state,formed=C.form(s),id=s.player.charId,
      heir=Object.values(s.chars).find(function (c) {return c.name==='Bertrand';}),
      bindings=JSON.stringify(s.stories[C.prep].bindings),people=FB.mobile.total(s,C.rid),money=FB.treasuryAvailable(s,C.rid);
    FB.killChar(s,s.chars[id]);FB.game.succeedTo(heir.id);FB.ui.closeModal();
    const x=FB.state;FB.stories.get(C.program).day(x,x.stories[C.program]);
    return {formed:formed,successor:x.player.charId===heir.id,
      original:x.stories[C.program].actorId===id && bindings===JSON.stringify(x.stories[C.prep].bindings),
      noCommand:!FB.mobile.commandValid(x,C.rid) && FB.mobile.leader(x,C.rid)===null,
      noEnrollment:!FB.expeditionStoryPrograms.review(x,C.program,'step',heir.id,'local_permission').allowed,
      retained:people===FB.mobile.total(x,C.rid) && money===FB.treasuryAvailable(x,C.rid),restored:C.restore()};
  })).toEqual({formed:true,successor:true,original:true,noCommand:true,noEnrollment:true,retained:true,restored:true});
});

for (const width of [390,1280]) {
  test('western source reviews disclose actual funding and return to the retained choice at width '+width,async function ({page},info) {
    await page.setViewportSize({width:width,height:844});await expedition(page,info,openings[0]);
    const before=await page.evaluate(function () {FB.ui.showStorySheet(westernCase.program);return westernCase.owners();});
    const choice=page.locator('[data-story-choice="grant"]');await choice.click();
    await expect(page.locator('#genmodal')).toContainText('Public training cost:');
    await expect(page.locator('#genmodal')).toContainText('Camp provisions:');
    await page.locator('#genmodal').getByRole('button',{name:'Back',exact:true}).click();
    await expect(choice).toBeVisible();await expect(choice).toBeFocused();await choice.click();await page.keyboard.press('Escape');
    await expect(choice).toBeVisible();
    expect(await page.evaluate(function () {return westernCase.owners();})).toBe(before);
  });
}

test('Raymond’s original-party assurance waits for formation and differs from restitution and supreme-command context',async function ({page},info) {
  await expedition(page,info,openings[1]);
  expect(await page.evaluate(function () {
    const C=westernCase,id='raymond_assurance_1096',E=FB.expeditionAgreements,m=FB.stories.get(id);let s=FB.state;
    const t=s.stories[id],
      original=t.partyIds.slice(),before=JSON.stringify(s),q=E.review(s,id,'acknowledge',s.player.charId),
      waiting=t.status==='waiting' && !q.allowed && q.reason==='formation',pure=before===JSON.stringify(s),
      held=FB.courtRecordRetained(s,s.chars[original[1]],{},{}),pending=C.restore();s=FB.state;
    const formed=C.form(s);
    m.day(s,s.stories[id]);const active=s.stories[id],early=!E.review(s,id,'acknowledge',s.player.charId).allowed;
    C.turn(s,360);const resources=JSON.stringify([s.player.gold,s.realms,s.owner,s.holder,s.armies]),
      a=E.review(s,id,'acknowledge',s.player.charId),other=E.review(s,id,'acknowledge',original[1]),
      accepted=E.commit(s,id,a),stale=!E.commit(s,id,other),repeat=!E.commit(s,id,a);
    m.day(s,active);
    return {waiting:waiting,pure:pure,held:held,pending:pending,formed:formed,early:early,accepted:accepted,stale:stale,repeat:repeat,
      original:JSON.stringify(original)===JSON.stringify(active.partyIds) && active.partyIds[0]===s.player.charId,
      reviewed:active.status==='reviewed' && active.reason==='records_only',mode:m.declaration.mode,kind:m.declaration.kind,
      noTransfer:m.declaration.countyIds.length===0 && resources===JSON.stringify([s.player.gold,s.realms,s.owner,s.holder,s.armies]),
      others:['godfrey_host_1096','bohemond_host_1096'].every(function (rid) {return !FB.campaignBookmark(s).stories.some(function (id) {
        const d=FBDATA.storyInstances[id];return d.type==='expedition_undertaking' && d.actor.realmId===rid;
      });}),restored:C.restore()};
  })).toEqual({waiting:true,pure:true,held:true,pending:true,formed:true,early:true,accepted:true,stale:true,repeat:true,
    original:true,reviewed:true,mode:'records_only',kind:'limited_assurance',noTransfer:true,others:true,restored:true});
});

test('Raymond may refuse a formed assurance or let its finite window expire without punishment or replacement',async function ({page},info) {
  await expedition(page,info,openings[1]);
  expect(await page.evaluate(function () {
    const C=westernCase,id='raymond_assurance_1096';C.form(FB.state);
    FB.stories.get(id).day(FB.state,FB.state.stories[id]);const base=FB.save.serialize();
    return ['decline','expired','party'].map(function (action) {
      FB.save.restore(JSON.parse(base));const s=FB.state,t=s.stories[id],parties=t.partyIds.join('|');C.turn(s,360);
      const resources=JSON.stringify([s.player.gold,s.realms,s.owner,s.holder,s.armies]);
      if (action==='decline') FB.expeditionAgreements.commit(s,id,FB.expeditionAgreements.review(s,id,'decline',s.player.charId));
      else {if (action==='expired') C.turn(s,720);else s.chars[t.partyIds[1]].dead=true;FB.stories.get(id).day(s,t);}
      return t.status===(action==='decline' ? 'declined' : action==='expired' ? 'expired' : 'interrupted') &&
        parties===t.partyIds.join('|') && resources===JSON.stringify([s.player.gold,s.realms,s.owner,s.holder,s.armies]) && C.restore();
    });
  })).toEqual([true,true,true]);
});

test('fresh original expedition records and ration receipts cannot be erased or retargeted on restore',async function ({page},info) {
  await expedition(page,info,openings[2]);
  expect(await page.evaluate(function () {
    const C=westernCase;C.form(FB.state);const saved=JSON.parse(FB.save.serialize()),before=JSON.stringify(FB.state),
      rng=FB.getRngState(),uid=FB.getUidCounter(),changes=[function (s) {delete s.stories[C.prep];},
        function (s) {delete s.stories[C.program];},function (s) {delete s.stories.raymond_assurance_1096;},
        function (s) {s.stories[C.prep].bindings[0].person.realmId='player';},
        function (s) {s.stories[C.prep].formed.provisionTarget.fieldFood++;},
        function (s) {s.stories[C.program].actorId=s.stories.raymond_preparation_1096.bindings[0].characterId;}];
    return changes.map(function (change) {
      const x=JSON.parse(JSON.stringify(saved));change(x.state);
      try {FB.save.restore(x);return false;} catch (error) {
        return before===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter();
      }
    });
  })).toEqual(Array(6).fill(true));
});

test('an unstamped legacy baseline keeps absent personal records and never acquires the fresh expedition world',async function ({page},info) {
  await expedition(page,info,openings[2],'baseline');
  expect(await page.evaluate(function () {
    const C=westernCase,saved=JSON.parse(FB.save.serialize()),person=FB.state.player.charId;
    delete saved.storyAttachmentSchema;delete saved.state.start.storyAttachments;
    delete saved.state.stories[C.row.agenda];delete saved.state.stories[C.row.profile];
    FBDATA.bookmarks['1096'].revision='western_expeditions_v1';FB.save.restore(saved);
    const s=FB.state;
    return {retained:s.start.revision==='baseline',same:s.player.charId===person,
      absent:!s.stories[C.row.agenda] && !s.stories[C.row.profile] && !s.stories[C.prep] && !s.stories[C.program],
      noAccount:!s.start.publicTreasury && !s.homeAuthorityPolicies && !s.realms[C.rid],restored:C.restore()};
  })).toEqual({retained:true,same:true,absent:true,noAccount:true,restored:true});
});

test('an ordinary 1096 household attaches no western ruler program or profile', async function ({ page }, info) {
  await startParityGame(page, info, { bookmark:'1096', scenario:'pilgrim_household_1096', declaredOpening:true });
  expect(await page.evaluate(function () {
    return ['godfrey_agenda_1096','raymond_agenda_1096','bohemond_agenda_1096',
      'opening_godfrey_1096','opening_raymond_1096','opening_bohemond_1096']
      .filter(function (id) { return !!FB.state.stories[id]; });
  })).toEqual([]);
});

test('Bohemond can consider the road and finish without creating a journey, command or eastern possession', async function ({ page }, info) {
  await start(page, info, openings[2]);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'bohemond_agenda_1096', d = FB.stories.get(id).declaration;
    const before = JSON.stringify([s.owner,s.holder,s.player.provs,s.player.provinceId,s.player.gold,
      s.player.travel,s.armies,s.authority.contracts,Object.keys(s.chars)]);
    const chosen = d.stages.map(function (stage, i) {
      s.date = {year:stage.year,season:stage.season,day:1}; s.turn++;
      const c = i === 3 ? 'bohemond_consider_road' : i === 7 ? 'bohemond_finish' : stage.choices[0].id;
      const quote = FB.stories.quote(s,id,c), ok = FB.stories.apply(s,id,c,quote);
      return [c,ok,FB.stories.apply(s,id,c,quote)];
    });
    return { choices:chosen, status:s.stories[id].status, holdings:s.player.provs.slice().sort(),
      unchanged:before === JSON.stringify([s.owner,s.holder,s.player.provs,s.player.provinceId,s.player.gold,
        s.player.travel,s.armies,s.authority.contracts,Object.keys(s.chars)]) };
  })).toEqual({ choices:[
    ['bohemond_review_home',true,false],['bohemond_keep_resources',true,false],['bohemond_review_news',true,false],
    ['bohemond_consider_road',true,false],['bohemond_keep_position',true,false],['bohemond_keep_obligations',true,false],
    ['bohemond_keep_relations',true,false],['bohemond_finish',true,false]
  ], status:'agenda_complete', holdings:['bari','brindisi','taranto'], unchanged:true });
});

test('Bohemond loses pending reviews with his office and retains the original papal contact', async function ({ page }, info) {
  await start(page, info, openings[2]);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'bohemond_agenda_1096', t = s.stories[id], p = s.stories.opening_bohemond_1096;
    const choice = 'bohemond_review_home', quote = FB.stories.quote(s,id,choice), gold = s.player.gold;
    const contact = p.contacts.papal_ruler, rng = FB.getRngState();
    s.chars[contact].dead = true;
    FB.stories.get('opening_bohemond_1096').day(s,p);
    const fixed = p.contacts.papal_ruler === contact && rng === FB.getRngState();
    s.player.provs.forEach(function (pid) { s.owner[pid] = 'apulia_1096'; s.holder[pid] = 'apulia_1096'; });
    s.player.provs = [];
    FB.invalidateRealmCache();
    FB.stories.get(id).day(s,t);
    FB.stories.get('opening_bohemond_1096').day(s,p);
    return { applied:FB.stories.apply(s,id,choice,quote), status:t.status, decisions:t.decisions.length,
      unchanged:s.player.gold === gold, fixed:fixed,
      archived:Object.keys(p.goals).every(function (key) { return p.goals[key].status === 'archived'; }) };
  })).toEqual({ applied:false, status:'agenda_interrupted', decisions:0, unchanged:true, fixed:true, archived:true });
});
