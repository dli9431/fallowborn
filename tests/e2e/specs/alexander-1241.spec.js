'use strict';
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {startParityGame}=require('../support/game/parity');
const {restoreBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'data/bookmark_1241_core_starts.js','data/bookmark_1241_operations.js','data/story_koten_1241.js',
  'index.html','data/starts_alexander_1241.js','data/story_alexander_1241.js','data/bookmark_1241_alexander.js',
  'data/story_ruler_agendas_1241.js','data/bookmark_1241_frederick.js','data/bookmark_1241.js',
  'data/bookmark_1241_scaffold_a.js','data/bookmark_1241_scaffold_b.js',
  'data/bookmark_1241_scaffold_c.js','data/bookmark_1241_scaffold_d.js',
  'data/travel.js','data/events_travel.js','data/starts.js','data/story_instances.js',
  'data/settlements.js','data/settlements_real.js','data/government_rollout.js','data/eras.js',
  'js/starts.js','js/main.js','js/world.js','js/model.js','js/util.js','js/travel.js',
  'js/household_party_travel.js','js/stories.js','js/story_household.js','js/story_opening_goals.js',
  'js/bookmark_setup.js','js/save.js','js/save_v4.js','js/i18n.js','js/ui_misc.js','js/ui_modals.js'
]);

const ID='alexander_household_1241';
async function start(page,info) {
  await startParityGame(page,info,{bookmark:'1241',scenario:'alexander_1241',declaredOpening:true});
  await page.evaluate(function () { FB.game.setPaused(true); });
}
async function choose(page,id) {
  return page.evaluate(function (choice) {
    const s=FB.state,id='alexander_household_1241';
    return FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice));
  },id);
}
async function waitForRequest(page,info) {
  await start(page,info);
  for (const c of ['take_stock','consider_kin','leave_door_open']) expect(await choose(page,c)).toBe(true);
  await page.evaluate(function () {
    FB.state.turn=30; FB.state.date.day=31;
    FB.stories.get('alexander_household_1241').day(FB.state,FB.state.stories.alexander_household_1241);
  });
}
async function road(page,info) {
  await waitForRequest(page,info);
  for (const c of ['consider_recall','review_road']) expect(await choose(page,c)).toBe(true);
}

test('only the fresh revision offers Alexander and preserves all earlier families, layouts and public authority',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function () {
    const sc=FBDATA.startScenarios.find(function (s) {return s.id==='alexander_1241';});
    const before=JSON.stringify([FBDATA,FB.getRngState(),FB.getUidCounter()]);
    const fresh=FB.bookmark('1241'),old=FB.bookmark('1241','frederick_v2');
    const p=FB.existingPersonStartProfile(sc,fresh);
    const prior=['baseline','royal_households_v2','frederick_v2'].map(function (id) {
      const b=FB.bookmark('1241',id);
      return {id:id,excluded:b.starts.indexOf(sc.id)<0,offered:FB.startProvinceAllowed(sc,b,'rostov'),
        head:FBDATA.settlementLayouts[b.settlementLayout].rostov[0].site,valid:FB.validateBookmark(b)};
    });
    const layouts=FBDATA.settlementLayouts;
    return {revision:fresh.revision,valid:FB.validateBookmark(fresh),prior:prior,
      identity:[p.person.id,p.person.born,p.person.homeProvinceId],household:p.household.map(function (m) {return m.id;}),
      unchanged:JSON.stringify(old.realms)===JSON.stringify(fresh.realms.filter(function (r) {
        return old.realms.some(function (previous) {return previous.id===r.id;});
      })),
      ravenna:JSON.stringify(layouts[old.settlementLayout].ravenna)===JSON.stringify(layouts[fresh.settlementLayout].ravenna),
      oldDetached:layouts[old.settlementLayout]!==layouts[fresh.settlementLayout],
      oldSlots:JSON.stringify(layouts[old.settlementLayout].rostov)===JSON.stringify(layouts[fresh.settlementLayout].rostov.slice(1)),
      locations:[FB.startProvinceAllowed(sc,fresh,'rostov'),FB.startProvinceAllowed(sc,fresh,'pereyaslavl'),FB.startProvinceAllowed(sc,fresh,'novgorod')],
      pure:before===JSON.stringify([FBDATA,FB.getRngState(),FB.getUidCounter()])};
  });
  expect(result).toEqual({revision:'core_starts_v2',valid:[],prior:['baseline','royal_households_v2','frederick_v2'].map(function (id) {
    return {id:id,excluded:true,offered:false,head:'rostov_head',valid:[]};
  }),identity:['alexander',1221,'rostov'],household:['alexander','feodosia','alexander_wife'],unchanged:true,
    ravenna:true,oldDetached:true,oldSlots:true,locations:[true,false,false],pure:true});
});

test('the ordinary start code adopts the original Alexander and all four contacts without generated substitutes',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,me=s.chars[s.player.charId],rid='vladimir_1241';
    function person(id) {return s.chars[FB.authoredRoyalMemberSnapshot(s,rid,id).charId];}
    const mother=person('feodosia'),wife=person('alexander_wife'),brother=person('andrei');
    const father=FB.realmRulerCharacterSnapshot(s,rid);
    const contacts=s.stories.opening_alexander_1241.contacts;
    const site=FB.world.byId.rostov.settlements[0],coord=FBDATA.settlementSites.pereslavl_zalessky_1241;
    const county=FB.provinceAtGrid(Math.round(FB.lonToX(coord.x)),Math.round(FB.latToY(coord.y)));
    return {same:me===person('alexander'),one:Object.values(s.chars).filter(function (c) {return c.name==='Alexander Yaroslavich';}).length,
      identity:[me.name,me.born,FB.ageOf(me,s.date.year),me.culture,me.religion],
      parents:me.fatherId===father.id && me.motherId===mother.id,spouse:me.spouseId===wife.id && wife.spouseId===me.id,
      brother:brother.fatherId===me.fatherId && brother.motherId===me.motherId,
      homes:[FB.characterResidence(s,mother),FB.characterResidence(s,wife),FB.characterResidence(s,brother),FB.characterResidence(s,father)],
      household:FB.isHouseholdCharacter(s,mother.id) && FB.isHouseholdCharacter(s,wife.id),
      contacts:[contacts.mother,contacts.wife,contacts.father,contacts.brother],
      expectedContacts:[mother.id,wife.id,father.id,brother.id],
      home:[s.player.provinceId,s.player.homeSettlement,site.site,county.id,FB.provinceAtGrid(site.x,site.y).id],
      father:father.name,publicRealm:!!s.realms.player,sourceRealm:!!s.realms.vladimir_1241,
      private:[s.player.tier,s.player.profession,s.player.gold,s.player.provs.length,s.player.landPlots.length,s.player.holdings.length],
      phase:s.stories.alexander_household_1241.phase,marker:s.start.existingPerson.memberId};
  });
  expect(result).toMatchObject({same:true,one:1,identity:['Alexander Yaroslavich',1221,20,'rus','orthodox'],parents:true,spouse:true,brother:true,
    homes:['rostov','rostov','suzdal','suzdal'],household:true,home:['rostov',0,'pereslavl_zalessky_1241','rostov','rostov'],
    father:'Yaroslav Vsevolodovich',publicRealm:false,sourceRealm:true,private:[2,'soldier',25,0,0,0],phase:'household',marker:'alexander'});
  expect(result.contacts).toEqual(result.expectedContacts);
});

test('the Story card fixes Alexander and starts the same original household through the picker',async function ({page},info) {
  await openGame(page,info);
  const full=page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('[data-bookmark="1241"]').click();
  const card=page.locator('[data-scenario="alexander_1241"]');
  await expect(card).toContainText('Story start');
  await card.click();
  await expect(page.locator('#cg-name')).toHaveValue('Alexander Yaroslavich');
  await expect(page.locator('#cg-name-field')).toBeHidden();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  expect(await page.evaluate(function () {
    FB.game.setPaused(true);const s=FB.state;
    return {same:s.player.charId===s.start.existingPerson.charId,member:s.start.existingPerson.memberId,home:s.player.provinceId};
  })).toEqual({same:true,member:'alexander',home:'rostov'});
});

test('a complete stay route needs no request, grants nothing and finishes the three optional goals',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,id='alexander_household_1241';
    function facts() {return JSON.stringify([s.chars,s.realms,s.owner,s.holder,s.armies,s.player.gold,s.player.prestige,s.player.piety,s.player.travel]);}
    const before=facts(),path=['keep_home','leave_kin_plans','stay_after_quarrel','defer_local_plans','finish_stay'];
    const chosen=path.map(function (c) {return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c));});
    const record=JSON.stringify(s.stories[id]);FB.stories.get(id).day(s,s.stories[id]);
    return {chosen:chosen,phase:s.stories[id].phase,unchanged:before===facts(),stable:record===JSON.stringify(s.stories[id]),
      goals:Object.values(s.stories.opening_alexander_1241.goals).map(function (g) {return g.status;})};
  });
  expect(result).toEqual({chosen:Array(5).fill(true),phase:'stayed',unchanged:true,stable:true,goals:['completed','completed','completed']});
});

test('request delivery is finite, cannot be answered before arrival and refusal pays nothing',async function ({page},info) {
  await start(page,info);
  for (const c of ['take_stock','consider_kin','leave_door_open']) expect(await choose(page,c)).toBe(true);
  expect(await page.evaluate(function () {
    const s=FB.state,id='alexander_household_1241';
    const early=FB.stories.quote(s,id,'consider_recall').allowed;
    s.turn=29;FB.stories.get(id).day(s,s.stories[id]);const before=s.stories[id].phase;
    s.turn=30;FB.stories.get(id).day(s,s.stories[id]);const delivered=s.stories[id].phase;
    const money=s.player.gold,authority=JSON.stringify([s.realms,s.owner,s.holder,s.armies]);
    const q=FB.stories.quote(s,id,'refuse_recall'),refused=FB.stories.apply(s,id,'refuse_recall',q);
    const repeat=FB.stories.apply(s,id,'refuse_recall',q);
    return {early:early,before:before,delivered:delivered,refused:refused,repeat:repeat,phase:s.stories[id].phase,
      unchanged:money===s.player.gold && authority===JSON.stringify([s.realms,s.owner,s.holder,s.armies])};
  })).toEqual({early:false,before:'waiting',delivered:'request',refused:true,repeat:false,phase:'refused',unchanged:true});
});

test('delayed and unopened requests expire once at the campaign boundary rather than resetting with choices',async function ({page},info) {
  await waitForRequest(page,info);
  expect(await choose(page,'delay_answer')).toBe(true);
  expect(await page.evaluate(function () {
    const s=FB.state,id='alexander_household_1241',saved=JSON.parse(FB.save.serialize());
    s.turn=179;FB.stories.get(id).day(s,s.stories[id]);const open=s.stories[id].phase;
    const q=FB.stories.quote(s,id,'reconsider_recall');s.turn=180;
    const stale=FB.stories.apply(s,id,'reconsider_recall',q);FB.stories.get(id).day(s,s.stories[id]);
    const closed=s.stories[id].phase,bytes=JSON.stringify([s.stories,s.player.gold]);FB.stories.get(id).day(s,s.stories[id]);
    const stable=bytes===JSON.stringify([s.stories,s.player.gold]);
    FB.save.restore(saved);const restored=FB.state;restored.turn=180;FB.stories.get(id).day(restored,restored.stories[id]);
    return {open:open,stale:stale,closed:closed,stable:stable,restored:restored.stories[id].phase};
  })).toEqual({open:'delayed',stale:false,closed:'expired',stable:true,restored:'expired'});
});

test('empty purses, stale reviews and expiry block departure while staying remains free',async function ({page},info) {
  await road(page,info);
  expect(await page.evaluate(function () {
    const s=FB.state,id='alexander_household_1241';s.player.gold=0;
    const empty=FB.stories.quote(s,id,'go_north').allowed,stay=FB.stories.quote(s,id,'stay_instead').allowed;
    s.player.gold=100;const q=FB.stories.quote(s,id,'go_north');s.player.gold=0;
    const stale=FB.stories.apply(s,id,'go_north',q),noTravel=!s.player.travel;
    const stayed=FB.stories.apply(s,id,'stay_instead',FB.stories.quote(s,id,'stay_instead'));
    return {empty:empty,stay:stay,stale:stale,noTravel:noTravel,stayed:stayed,gold:s.player.gold,phase:s.stories[id].phase};
  })).toEqual({empty:false,stay:true,stale:false,noTravel:true,stayed:true,gold:0,phase:'stay_plan'});
});

test('changed Novgorod control withdraws the request and invalidates an earlier road review',async function ({page},info) {
  await road(page,info);
  expect(await page.evaluate(function () {
    const s=FB.state,id='alexander_household_1241';s.player.gold=1000;
    const q=FB.stories.quote(s,id,'go_north'),money=s.player.gold;
    s.owner.novgorod='vladimir_1241';
    const stale=FB.stories.apply(s,id,'go_north',q);
    FB.stories.get(id).day(s,s.stories[id]);
    return {stale:stale,phase:s.stories[id].phase,uncharged:money===s.player.gold,noJourney:!s.player.travel};
  })).toEqual({stale:false,phase:'withdrawn',uncharged:true,noJourney:true});
});

test('a paid journey reaches Novgorod once while kin, public offices and the permanent home stay separate',async function ({page},info) {
  await road(page,info);
  const result=await page.evaluate(function () {
    let s=FB.state;const id='alexander_household_1241';s.player.gold=1000;
    const kin=s.start.existingPerson.household.slice(1).map(function (r) {return [r.charId,FB.characterResidence(s,s.chars[r.charId])];});
    const authority=JSON.stringify([s.realms,s.owner,s.holder,s.armies]),people=Object.keys(s.chars).length;
    const q=FB.stories.quote(s,id,'go_north'),money=s.player.gold,began=FB.stories.apply(s,id,'go_north',q);
    const cost=money-s.player.gold,repeated=FB.stories.apply(s,id,'go_north',q);
    const journey=JSON.stringify(s.player.travel),funds=s.player.gold;FB.save.restore(JSON.parse(FB.save.serialize()));s=FB.state;
    const retained=journey===JSON.stringify(s.player.travel) && funds===s.player.gold && people===Object.keys(s.chars).length;
    let days=0;for (;days<90 && s.player.travel.phase==='outbound';days++) {s.turn++;FB.travelTick(s);}
    FB.stories.get(id).day(s,s.stories[id]);const arrived=s.stories[id].phase;
    const committed=FB.stories.apply(s,id,'begin_visit',FB.stories.quote(s,id,'begin_visit'));
    const capstone=s.eventQueue.some(function (e) {return e.id==='alexander_visit_arrival_1241';});
    return {began:began,cost:cost,quoted:q.facts.terms.cost,repeated:repeated,retained:retained,arrived:arrived,
      committed:committed,phase:s.stories[id].phase,home:s.player.provinceId,present:s.player.travel.currentId,
      kinStayed:kin.every(function (r) {return FB.characterResidence(s,s.chars[r[0]])===r[1];}),
      sameAuthority:authority===JSON.stringify([s.realms,s.owner,s.holder,s.armies]),capstone:capstone,days:days};
  });
  expect(result.cost).toBe(result.quoted);
  expect(result.days).toBeLessThanOrEqual(90);
  expect(result).toMatchObject({began:true,repeated:false,retained:true,arrived:'arrival',committed:true,phase:'visited',
    home:'rostov',present:'novgorod',kinStayed:true,sameAuthority:true,capstone:true});
});

test('cancelled travel and unrelated departure cannot become a recalled appointment or an arrival',async function ({page},info) {
  await road(page,info);
  expect(await page.evaluate(function () {
    const s=FB.state,id='alexander_household_1241',save=JSON.parse(FB.save.serialize());
    s.player.gold=1000;const began=FB.stories.apply(s,id,'go_north',FB.stories.quote(s,id,'go_north'));
    FB.travelCancel(s);FB.stories.get(id).day(s,s.stories[id]);const cancelled=s.stories[id].phase;
    FB.save.restore(save);const restored=FB.state;restored.player.provinceId='suzdal';
    const moved=FB.stories.apply(restored,id,'stay_instead',FB.stories.quote(restored,id,'stay_instead'));
    FB.stories.get(id).day(restored,restored.stories[id]);
    return {began:began,cancelled:cancelled,moved:moved,phase:restored.stories[id].phase};
  })).toEqual({began:true,cancelled:'cancelled',moved:false,phase:'remote'});
});

test('midpoint, terminal and absent records restore without people, requests or rewards being replayed',async function ({page},info) {
  await waitForRequest(page,info);
  const saved=await page.evaluate(function () {
    FB.state.player.gold=2;
    return {save:FB.save.serialize(),facts:JSON.stringify([FB.state.start,FB.state.chars,FB.state.stories,FB.state.player.gold])};
  });
  await restoreBookmark(page,saved.save);
  expect(await page.evaluate(function (before) {return before===JSON.stringify([FB.state.start,FB.state.chars,FB.state.stories,FB.state.player.gold]);},saved.facts)).toBe(true);
  expect(await choose(page,'refuse_recall')).toBe(true);
  const final=await page.evaluate(function () {
    const s=FB.state,save=JSON.parse(FB.save.serialize()),record=JSON.stringify([s.chars,s.stories,s.player.gold]);
    FB.save.restore(save);const exact=record===JSON.stringify([FB.state.chars,FB.state.stories,FB.state.player.gold]);
    delete save.state.stories.alexander_household_1241;delete save.state.stories.opening_alexander_1241;
    FBDATA.bookmarks['1241'].hidden=true;return {exact:exact,save:JSON.stringify(save)};
  });
  expect(final.exact).toBe(true);
  await restoreBookmark(page,final.save);
  expect(await page.evaluate(function () {return !FB.state.stories.alexander_household_1241 && !FB.state.stories.opening_alexander_1241;})).toBe(true);
});

test('a campaign begun in frederick_v2 keeps its original Rostov slots when the fresh default advances',async function ({page},info) {
  await openGame(page,info);
  await page.evaluate(function () {FBDATA.bookmarks['1241'].revision='frederick_v2';});
  const full=page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('[data-bookmark="1241"]').click();
  await expect(page.locator('[data-scenario="alexander_1241"]')).toHaveCount(0);
  await page.locator('[data-scenario="novgorod_household_1241"]').click();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  const saved=await page.evaluate(function () {
    FB.game.setPaused(true);const s=FB.state;
    const prior={revision:s.start.revision,slots:FB.world.byId.rostov.settlements.map(function (r) {return r.site;}),
      chars:JSON.stringify(s.chars),stories:JSON.stringify(s.stories)};
    FBDATA.bookmarks['1241'].revision='alexander_v2';
    return {save:FB.save.serialize(),prior:prior};
  });
  await restoreBookmark(page,saved.save);
  expect(await page.evaluate(function (before) {
    const s=FB.state;
    return {old:before.revision==='frederick_v2' && s.start.revision===before.revision,
      fresh:FB.bookmark('1241').revision,head:FB.world.byId.rostov.settlements[0].site,
      same:JSON.stringify(before.slots)===JSON.stringify(FB.world.byId.rostov.settlements.map(function (r) {return r.site;})) &&
        before.chars===JSON.stringify(s.chars) && before.stories===JSON.stringify(s.stories),
      absent:!s.stories.alexander_household_1241 && !s.stories.opening_alexander_1241 && !s.start.existingPerson};
  },saved.prior)).toEqual({old:true,fresh:'alexander_v2',head:'rostov_head',same:true,absent:true});
});

test('death and a changed protagonist archive this personal opening without repeating it for an heir',async function ({page},info) {
  await start(page,info);
  expect(await page.evaluate(function () {
    const id='alexander_household_1241',profile='opening_alexander_1241',save=JSON.parse(FB.save.serialize());
    let s=FB.state;s.player.dead=true;
    FB.stories.get(id).day(s,s.stories[id]);FB.stories.get(profile).day(s,s.stories[profile]);
    const dead=s.stories[id].phase,goals=Object.values(s.stories[profile].goals).map(function (g) {return g.status;});
    FB.save.restore(save);s=FB.state;s.player.charId=s.chars[s.player.charId].spouseId;
    FB.stories.get(id).day(s,s.stories[id]);FB.stories.get(profile).day(s,s.stories[profile]);
    return {dead:dead,goals:goals,successor:s.stories[id].phase};
  })).toEqual({dead:'interrupted',goals:['archived','archived','archived'],successor:'interrupted'});
});

test('the shared review cancels without a decision and restores focus to the originating Story card',async function ({page},info) {
  await start(page,info);
  await page.locator('[data-tab="actions"]').click();
  await page.evaluate(function () {FB.ui.refresh();});
  const card=page.locator('[data-story-card="'+ID+'"]');
  await card.click();await page.locator('[data-story-choice="take_stock"]').click();
  await expect(page.locator('#gm-story-confirm')).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.locator('[data-story-choice="keep_home"]')).toBeVisible();
  await page.keyboard.press('Escape');await expect(card).toBeFocused();
  expect(await page.evaluate(function () {return {phase:FB.state.stories.alexander_household_1241.phase,gold:FB.state.player.gold};})).toEqual({phase:'household',gold:25});
});
