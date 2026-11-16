'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const example = require('../fixtures/authoring/mobile-leadership-glassroad.json');

dependsOnRuntime(__filename,['data/starts_mobile_leaders.js','data/story_mobile_leadership.js',
  'data/bookmark_1204_terrain.js','data/mobile_confederations.js','js/starts.js','js/main.js',
  'js/stories.js','js/story_household.js','js/story_opening_goals.js','js/mobile_confederations.js',
  'js/mobile_command.js','js/story_ruler_agenda.js','js/story_campaign.js','js/expedition_programs.js',
  'js/armies.js','js/federates.js','js/government_selection.js','js/governments.js','js/authority.js',
  'js/actions.js','js/market.js','js/population.js','js/wars.js','js/ai_decisions.js','data/ai_decisions.js','js/treasury.js','js/mods.js','js/save.js','js/save_v4.js']);

async function begin(page,info,role) {
  await openGame(page,info);
  if (role) {
    await page.evaluate(function () {FB.ui.showMods();});
    expect(await page.evaluate(function (input) {return FB.mods.validate(input);},example)).toEqual([]);
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/mobile-leadership-glassroad.json'));
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  }
  await prepareGameContent(page);
  await page.evaluate(function () {FB.ui.closeModal();FB.ui.showScreen('title');});
  if (await page.locator('#btn-choose-beginning').isVisible()) await page.locator('#btn-choose-beginning').click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  const code=role ? 'CAMP-dune_world-dune_'+role+'_start-dune_well-f-'+
    (role==='leader' ? 'Sela_Vey' : 'Nari_Ash')+'-standard' :
    'CAMP-1204-qipchaq_member_1204-lower_syr_darya-m-Principal-standard';
  await page.locator('#ng-seed').fill(code);await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.evaluate(function () {FB.game.start();FB.game.setPaused(true);});
  await page.evaluate(function (role) {
    window.campCase=role ? {rid:'dune_coalition',track:'dune_principal_household',profile:'opening_dune_'+role+'_start'} :
      {rid:'qipchaq_following_1204',track:'qipchaq_camp_household_1204',profile:'opening_qipchaq_member_1204'};
    window.campFacts=function () {
      const s=FB.state,c=campCase;
      return JSON.stringify([s.player.gold,FB.treasuryAvailable(s,c.rid),FB.mobile.row(s,c.rid),
        s.stories[c.track],s.stories[c.profile],FB.getRngState(),FB.getUidCounter()]);
    };
  },role);
}

for (const role of [null,'leader','member']) test((role ? 'JSON '+role : 'native member')+
  ' completes a household goal only after the canonical paid service',async function ({page},info) {
  await begin(page,info,role);
  const opening=await page.evaluate(function () {
    const s=FB.state,c=campCase,r=FB.mobile.row(s,c.rid),id=s.player.charId;
    const before=campFacts(),q=FB.stories.quote(s,c.track,'paid_service');
    return {phase:s.stories[c.track].phase,status:s.stories[c.profile].goals.service.status,
      member:r.members.some(function (m) {return m.principal.id===id;}),leader:r.leaderId===id,
      pure:before===campFacts(),allowed:q.allowed,choices:FB.stories.choices(s,c.track).map(function (c) {return c.id;})};
  });
  expect(opening).toEqual({phase:'work',status:'pending',member:true,leader:role==='leader',pure:true,
    allowed:true,choices:['paid_service']});
  // The shared confirmation can be dismissed without paying or satisfying a goal.
  const before=await page.evaluate(function () {return campFacts();});
  await page.evaluate(function () {FB.ui.showStorySheet(campCase.track);});
  await page.locator('[data-story-choice="paid_service"]').click();
  await expect(page.locator('#gm-story-confirm')).toBeVisible();
  await page.evaluate(function () {FB.ui.closeModal();});
  expect(await page.evaluate(function () {return campFacts();})).toBe(before);

  const blocked=await page.evaluate(function () {
    const s=FB.state,c=campCase,r=FB.mobile.row(s,c.rid),food=r.food;
    r.food=0;const before=campFacts(),q=FB.stories.quote(s,c.track,'paid_service');
    const refused=!FB.stories.apply(s,c.track,'paid_service',q),pure=before===campFacts();r.food=food;
    const old=FB.stories.quote(s,c.track,'paid_service');s.player.gold++;
    const changed=campFacts(),stale=!FB.stories.apply(s,c.track,'paid_service',old),stalePure=changed===campFacts();s.player.gold--;
    return {refused:refused,pure:pure,stale:stale,stalePure:stalePure,status:s.stories[c.profile].goals.service.status};
  });
  expect(blocked).toEqual({refused:true,pure:true,stale:true,stalePure:true,status:'pending'});
  const result=await page.evaluate(function () {
    const s=FB.state,c=campCase,r=FB.mobile.row(s,c.rid),gold=s.player.gold,food=r.food,
      funds=FB.treasuryAvailable(s,c.rid),people=FB.mobile.total(s,c.rid),leader=r.leaderId;
    const q=FB.stories.quote(s,c.track,'paid_service'),paid=FB.stories.apply(s,c.track,'paid_service',q);
    const once=campFacts(),repeated=FB.stories.apply(s,c.track,'paid_service',q);
    return {paid:paid,phase:s.stories[c.track].phase,status:s.stories[c.profile].goals.service.status,
      wage:s.player.gold-gold,cost:funds-FB.treasuryAvailable(s,c.rid),food:food-r.food,
      people:FB.mobile.total(s,c.rid)===people,leader:r.leaderId===leader,
      marked:r.worked[s.player.charId]===s.turn,repeated:repeated,repeatPure:once===campFacts()};
  });
  expect(result).toMatchObject({paid:true,phase:'paid',status:'completed',food:1,people:true,leader:true,
    marked:true,repeated:false,repeatPure:true});
  expect(result.wage).toBeCloseTo(0.2);expect(result.cost).toBeCloseTo(0.2);
  const restored=await page.evaluate(function () {
    const before=campFacts(),id=FB.state.player.charId;
    FB.save.restore(JSON.parse(FB.save.serialize()));const once=campFacts();
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {once:before===once,twice:once===campFacts(),identity:FB.state.player.charId===id,valid:FB.mobile.validate(FB.state)};
  });
  expect(restored).toEqual({once:true,twice:true,identity:true,valid:true});
});

test('camp declarations have no acknowledgment completion and reject unknown payment operations atomically',async function ({page},info) {
  await openGame(page,info);await prepareGameContent(page);
  const result=await page.evaluate(function (input) {
    const before=FB.contentValues.canonical(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter();
    const native=FBDATA.householdTracks_mobile_leadership.qipchaq_camp_household_1204;
    const workOnly=[native,input.storyInstances.dune_principal_household].every(function (d) {
      return Object.keys(d.stages).every(function (id) {return d.stages[id].choices.every(function (c) {
        return c.operation.kind==='mobile_work';
      });});
    });
    const bad=JSON.parse(JSON.stringify(input));
    bad.storyInstances.dune_principal_household.stages.work.choices[0].operation.kind='unregistered_payment';
    const faults=FB.mods.validate(bad);
    return {workOnly:workOnly,rejected:faults.length>0,pure:before===FB.contentValues.canonical(FBDATA) &&
      rng===FB.getRngState() && uid===FB.getUidCounter()};
  },example);
  expect(result).toEqual({workOnly:true,rejected:true,pure:true});
});

async function leadership(page,info,native) {
  if (native) {
    await openGame(page,info);await prepareGameContent(page);
    await page.evaluate(function () {FB.ui.closeModal();FB.ui.showScreen('title');});
    if (await page.locator('#btn-choose-beginning').isVisible()) await page.locator('#btn-choose-beginning').click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('CAMP-1204-qipchaq_leader_1204-lower_syr_darya-m-Principal-standard');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.evaluate(function () {FB.game.start();FB.game.setPaused(true);});
  }
  else await begin(page,info,'leader');
  await page.evaluate(function (native) {
    FB.game.setPaused(true);FB.game.auto.hosts='manual';
    window.L={rid:native ? 'qipchaq_following_1204' : 'dune_coalition',
      agenda:native ? 'qipchaq_leadership_1204' : 'dune_leadership',
      profile:native ? 'opening_qipchaq_leader_1204' : 'opening_dune_leadership',
      campaign:native ? 'qipchaq_land_campaign_1204' : 'dune_land_campaign',
      target:native ? 'kath_district' : 'dune_pass',
      snapshot:function () {
        const s=FB.state,M=FB.mobile;
        return FB.contentValues.canonical([M.row(s,this.rid),M.migration(s,this.rid),M.host(s,this.rid),
          s.stories,s.owner,s.holder,s.player.charId,s.player.gold,s.player.provinceId,
          Object.keys(s.realms).sort().map(function (rid) {return [rid,FB.treasuryAvailable(s,rid)];}),
          FB.getRngState(),FB.getUidCounter()]);
      },
      quote:function (id) {return FB.stories.quote(FB.state,this.agenda,id);},
      act:function (id) {
        const q=this.quote(id);
        if (!q.allowed || !FB.stories.apply(FB.state,this.agenda,id,q)) throw new Error('Story review refused: '+id+' '+JSON.stringify({allowed:q.allowed,record:FB.state.stories[this.agenda],source:q.facts && q.facts.source}));
        return q;
      },
      mobile:function (action,terms,actor) {
        const s=FB.state,q=FB.mobile.review(s,{realmId:this.rid,action:action,terms:terms,
          actor:actor || {kind:'character',id:s.player.charId}});
        if (!q.review.allowed || !FB.mobile.commit(s,q)) throw new Error('Canonical review refused: '+action+' '+JSON.stringify(q.review));
        return q;
      },
      assent:function () {
        this.mobile('assent',{assent:true});FB.mobile.memberResponses(FB.state,this.rid);
      },
      prepare:function (kind) {this.act('propose_'+kind);this.assent();},
      roundtrip:function () {
        const before=this.snapshot();FB.save.restore(JSON.parse(FB.save.serialize()));const once=this.snapshot();
        FB.save.restore(JSON.parse(FB.save.serialize()));
        if (before!==once || once!==this.snapshot()) throw new Error('Leadership restore changed canonical facts');
        return FB.mobile.validate(FB.state);
      },
      day:function () {
        const s=FB.state;s.turn++;s.date.day++;
        if (s.date.day>90) {s.date.day=1;s.date.season++;if (s.date.season>3) {s.date.season=0;s.date.year++;}}
        FB.mobile.day(s);FB.federatePrepareDay(s);FB.armyTick(s);FB.federateDay(s);FB.stories.day(s);
      },
      expireCommitments:function () {
        const s=FB.state,M=FB.mobile,end=M.agreements(s,this.rid).filter(function (a) {return a.kind!=='access' && a.status==='active';})
          .reduce(function (n,a) {return Math.max(n,a.endTurn);},s.turn);
        if (end>s.turn) {
          // Stage the exact agreement boundary; the daily travel loop is tested separately.
          const date=s.date.year*360+s.date.season*90+s.date.day-1+end-s.turn;
          s.turn=end;s.date.year=Math.floor(date/360);s.date.season=Math.floor(date%360/90);s.date.day=date%90+1;
          M.day(s);FB.stories.day(s);
        }
      },
      throughDistribution:function () {
        const s=FB.state,M=FB.mobile;
        this.prepare('demand');this.act('commit_demand');
        const a=M.row(s,this.rid).agreements.filter(function (a) {return !!a.extraction && a.status==='offered';})[0];
        this.mobile('accept',{agreementId:a.id},{kind:'realm',id:a.partnerId});
        this.expireCommitments();this.prepare('raid');this.act('commit_raid');this.act('commit_distribution');
      },
      access:function () {
        if (!FB.mobile.host(FB.state,this.rid)) this.mobile('recruit',{count:40,unitId:'levy'});
        this.act('propose_access');this.assent();this.act('send_access');
        const r=FB.mobile.row(FB.state,this.rid),a=r.agreements[r.agreements.length-1];
        this.mobile('accept',{agreementId:a.id},{kind:'realm',id:a.partnerId});
        // Long native routes may need several independent ordinary concessions.
        // Each belongs to the actual intervening holder; no route permission is staged.
        const s=FB.state,M=FB.mobile,host=M.host(s,this.rid),plan=FB.armyOrderPlan(s,host,this.target);
        [host.at].concat(plan.path || []).forEach(function (pid) {
          if (M.provisioningAccess(s,L.rid,pid)) return;
          const ground=M.profile(s,L.rid).seasonalRound.grounds.find(function (g) {return g.countyId===pid;});
          const t=ground ? M.roundAccessTerms(s,L.rid,ground.id) :
            {kind:'access',partnerId:s.holder[pid],countyIds:[pid],capacity:M.total(s,L.rid),
              allowRecruit:false,price:0,duration:90};
          L.mobile('propose',{operation:'agreement',proposal:t});L.assent();L.mobile('offer',t);
          const offered=M.row(s,L.rid).agreements.slice(-1)[0];
          L.mobile('accept',{agreementId:offered.id},{kind:'realm',id:offered.partnerId});
        });
      }
    };
  },native);
}

for (const native of [false,true]) test((native ? 'native' : 'ordinary JSON')+
  ' goals teach canonical demand, raid, distribution and actual seasonal arrival',async function ({page},info) {
  await leadership(page,info,native);
  const initial=await page.evaluate(function () {
    const s=FB.state,before=L.snapshot(),q=L.quote('observed_demand');
    const denied=!FB.stories.apply(s,L.agenda,'observed_demand',q),pure=before===L.snapshot();
    L.act('defer_demand');
    const stage=s.stories[L.agenda];
    return {leader:FB.mobile.leader(s,L.rid).id===s.player.charId,institution:L.rid!=='player',
      campaign:!!s.stories[L.campaign] && s.stories[L.campaign].phase==='pending',
      objective:FB.stories.get(L.campaign).declaration.target.provinceId===L.target,
      denied:denied,pure:pure,deferred:stage.step===0 && stage.decisions.length===0,
      pending:Object.keys(s.stories[L.profile].goals).every(function (id) {return s.stories[L.profile].goals[id].status==='pending';}),
      valid:L.roundtrip()};
  });
  expect(initial).toEqual({leader:true,institution:true,campaign:true,objective:true,denied:true,pure:true,deferred:true,pending:true,valid:true});
  // Review/cancel uses the existing retained story confirmation at phone width.
  await page.setViewportSize({width:390,height:820});
  await page.evaluate(function () {FB.ui.showStorySheet(L.agenda);});
  const before=await page.evaluate(function () {return L.snapshot();});
  await page.locator('[data-story-choice="propose_demand"]').click();
  await expect(page.locator('#gm-story-confirm')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-story-choice="propose_demand"]')).toBeFocused();
  expect(await page.evaluate(function () {return L.snapshot();})).toBe(before);
  await page.evaluate(function () {FB.ui.closeModal();});
  const demand=await page.evaluate(function () {
    let s=FB.state,M=FB.mobile;
    const noAssent=L.quote('commit_demand'),unapproved=!noAssent.allowed;
    L.prepare('demand');
    const fresh=L.quote('commit_demand');s.player.gold++;
    const before=L.snapshot(),stale=!FB.stories.apply(s,L.agenda,'commit_demand',fresh),pure=before===L.snapshot();s.player.gold--;
    L.act('commit_demand');
    const r=M.row(s,L.rid),a=r.agreements.filter(function (a) {return a.extraction && a.status==='offered';})[0];
    const offeredPending=s.stories[L.agenda].step===0 && s.stories[L.profile].goals.demand.status==='pending';
    const publicBefore=FB.treasuryAvailable(s,L.rid),outside=FB.treasuryAvailable(s,a.partnerId),privateGold=s.player.gold;
    L.mobile('accept',{agreementId:a.id},{kind:'realm',id:a.partnerId});
    const paid=FB.treasuryAvailable(s,L.rid)-publicBefore===a.price && outside-FB.treasuryAvailable(s,a.partnerId)===a.price;
    const once=L.snapshot(),q=M.review(s,{realmId:L.rid,action:'accept',terms:{agreementId:a.id},actor:{kind:'realm',id:a.partnerId}});
    const duplicate=!M.commit(s,q) && once===L.snapshot();
    const malformed=JSON.parse(FB.save.serialize());
    delete malformed.state.authority.governments[L.rid].mobile.agreements.find(function (a) {return !!a.extraction;}).extraction.paidTurn;
    let rejected=false;try {FB.save.restore(malformed);} catch (e) {rejected=true;}
    return {unapproved:unapproved,stale:stale,pure:pure,offeredPending:offeredPending,paid:paid,duplicate:duplicate,
      paymentProof:rejected && once===L.snapshot(),private:s.player.gold===privateGold,step:s.stories[L.agenda].step,status:s.stories[L.profile].goals.demand.status,restore:L.roundtrip()};
  });
  expect(demand).toEqual({unapproved:true,stale:true,pure:true,offeredPending:true,paid:true,duplicate:true,
    paymentProof:true,private:true,step:1,status:'completed',restore:true});
  const transactions=await page.evaluate(function () {
    L.expireCommitments();
    const s=FB.state,M=FB.mobile,r=M.row(s,L.rid),privateGold=s.player.gold;
    const host=M.host(s,L.rid),pid=host.at,holder=s.holder[pid],publicBefore=FB.treasuryAvailable(s,L.rid),
      outsideBefore=FB.treasuryAvailable(s,holder),stock=FB.marketProvisionSnapshot(s,pid).stock,
      campFood=r.food,people=M.total(s,L.rid),land=JSON.stringify([s.owner,s.holder]);
    L.prepare('raid');const raid=L.act('commit_raid'),receipt=r.lastRaid;
    const noRaidGift=privateGold===s.player.gold,conserved=FB.treasuryAvailable(s,L.rid)-publicBefore===
      outsideBefore-FB.treasuryAvailable(s,holder) && r.food-campFood===stock-FB.marketProvisionSnapshot(s,pid).stock &&
      people-M.total(s,L.rid)===receipt.casualties && land===JSON.stringify([s.owner,s.holder]);
    const raided=s.stories[L.agenda].step===2 && s.stories[L.profile].goals.raid.status==='completed';
    const raidPure=L.snapshot(),repeat=!FB.stories.apply(s,L.agenda,'commit_raid',raid) && raidPure===L.snapshot();
    const distribution=L.quote('commit_distribution'),cost=distribution.facts.source.reviewed.review.distribution,
      publicGold=FB.treasuryAvailable(s,L.rid),food=r.food;
    L.act('commit_distribution');
    const exact=Math.abs(publicGold-FB.treasuryAvailable(s,L.rid)-cost.gold)<.000001 && food-r.food===cost.food;
    const once=L.snapshot(),noRepeat=!FB.stories.apply(s,L.agenda,'commit_distribution',distribution) && once===L.snapshot();
    return {raided:raided,canonical:!!receipt.principal && receipt.turn===s.turn,repeat:repeat,exact:exact,noRepeat:noRepeat,
      noRaidGift:noRaidGift,conserved:conserved,step:s.stories[L.agenda].step,status:s.stories[L.profile].goals.distribution.status,restore:L.roundtrip()};
  });
  expect(transactions).toEqual({raided:true,canonical:true,repeat:true,exact:true,noRepeat:true,noRaidGift:true,conserved:true,
    step:3,status:'completed',restore:true});
  const departure=await page.evaluate(function () {
    L.access();const s=FB.state,M=FB.mobile,r=M.row(s,L.rid),at=M.migration(s,L.rid).at;
    L.act('stay_ground');
    const stayPending=s.stories[L.agenda].step===3 && s.stories[L.profile].goals.move.status==='pending';
    const food=r.food,q=L.act('commit_move');
    const once=L.snapshot(),bad=JSON.parse(FB.save.serialize());
    bad.state.authority.governments[L.rid].mobile.round.journey.hostId='missing_host';
    let rejected=false;try {FB.save.restore(bad);} catch (e) {rejected=true;}
    return {stayPending:stayPending,stillAtOrigin:M.migration(s,L.rid).at===at,
      journeyProof:rejected && once===L.snapshot(),
      food:food-r.food===q.facts.source.reviewed.review.round.food,step:s.stories[L.agenda].step,
      pending:s.stories[L.profile].goals.move.status==='pending',clock:M.host(s,L.rid).moveLeft,
      days:q.facts.source.reviewed.review.round.days,restore:L.roundtrip()};
  });
  expect(departure).toMatchObject({stayPending:true,stillAtOrigin:true,journeyProof:true,food:true,step:3,pending:true,restore:true});
  expect(departure.clock).toBeGreaterThan(0);
  const arrival=await page.evaluate(function () {
    let days=0;
    while (FB.state.stories[L.agenda].step===3 && days<90) {L.day();days++;}
    const s=FB.state,M=FB.mobile;
    const settledBefore=M.row(s,L.rid).accounting.settled,privateGold=s.player.gold;
    L.act('stay_mobile');L.act('defer_settlement');
    return {days:days,host:M.host(s,L.rid).at,camp:M.migration(s,L.rid).at,target:L.target,
      status:s.stories[L.profile].goals.move.status,step:s.stories[L.agenda].step,
      arrived:M.row(s,L.rid).round.journey.status,stay:s.stories[L.agenda].status==='agenda_open' &&
        M.row(s,L.rid).accounting.settled===settledBefore && s.player.gold===privateGold,restore:L.roundtrip()};
  });
  expect(arrival).toMatchObject({host:arrival.target,camp:arrival.target,status:'completed',step:4,arrived:'arrived',stay:true,restore:true});
  expect(arrival.days).toBe(departure.days);
});

test('denied and refused demands, stale leadership and stopped programs cannot manufacture completed stages',async function ({page},info) {
  await leadership(page,info,false);
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile;
    L.prepare('demand');L.act('commit_demand');
    const a=M.row(s,L.rid).agreements.slice(-1)[0];
    L.mobile('decline',{agreementId:a.id},{kind:'realm',id:a.partnerId});
    const before=L.snapshot(),q=L.quote('observed_demand');
    const refused=!q.allowed && !FB.stories.apply(s,L.agenda,'observed_demand',q) && before===L.snapshot();
    const pending=s.stories[L.agenda].step===0 && s.stories[L.profile].goals.demand.status==='pending';
    L.prepare('demand');const old=L.quote('commit_demand');
    FB.advanceRealmSuccession(s,L.rid,{cause:'vacancy'});
    const changed=L.snapshot(),stale=!FB.stories.apply(s,L.agenda,'commit_demand',old) && changed===L.snapshot();
    FB.stories.day(s);
    return {refused:refused,pending:pending,stale:stale,status:s.stories[L.agenda].status,
      goals:Object.keys(s.stories[L.profile].goals).map(function (id) {return s.stories[L.profile].goals[id].status;}),restore:L.roundtrip()};
  });
  expect(result).toEqual({refused:true,pending:true,stale:true,status:'agenda_interrupted',goals:Array(4).fill('archived'),restore:true});
});

test('cancelled seasonal orders never supply arrival evidence and stop stays usable',async function ({page},info) {
  await leadership(page,info,false);
  const result=await page.evaluate(function () {
    L.throughDistribution();L.access();L.act('commit_move');
    const s=FB.state,M=FB.mobile,a=M.host(s,L.rid);
    const cancelled=FB.orderArmy(s,a,a.at);FB.stories.day(s);
    const noArrival=s.stories[L.agenda].step===3 && s.stories[L.profile].goals.move.status==='pending' &&
      !M.storyEvidence(s,L.rid,'arrival',s.player.charId,FB.realmRulerGeneration(s,L.rid),0);
    L.act('defer_move');L.act('agenda_stop_program');
    return {cancelled:cancelled,noArrival:noArrival,journey:M.row(s,L.rid).round.journey.status,
      stopped:s.stories[L.agenda].status,step:s.stories[L.agenda].step,restore:L.roundtrip()};
  });
  expect(result).toEqual({cancelled:true,noArrival:true,journey:'interrupted',stopped:'agenda_stopped',step:3,restore:true});
});

test('succession during a seasonal journey interrupts the original agenda and archives its unfinished goal',async function ({page},info) {
  await leadership(page,info,false);
  const result=await page.evaluate(function () {
    L.throughDistribution();L.access();L.act('commit_move');
    const M=FB.mobile;let s=FB.state,r=M.row(s,L.rid);
    FB.advanceRealmSuccession(s,L.rid,{cause:'vacancy'});
    FB.stories.day(s);const vacancy=L.roundtrip();
    s=FB.state;r=M.row(s,L.rid);const other=r.members[1];
    r.members.forEach(function (m) {L.mobile('support',{candidateId:other.principal.id},m.principal);});
    L.mobile('select',{candidateId:other.principal.id},other.principal);L.day();
    return {vacancy:vacancy,member:s.player.charId!==M.leader(s,L.rid).id,agenda:s.stories[L.agenda].status,
      move:s.stories[L.profile].goals.move.status,journey:r.round.journey.status,restore:L.roundtrip()};
  });
  expect(result).toEqual({vacancy:true,member:true,agenda:'agenda_interrupted',move:'archived',journey:'interrupted',restore:true});
});

for (const final of [false,true]) test((final ? 'final' : 'partial')+
  ' settlement advances only after the canonical population transaction',async function ({page},info) {
  await leadership(page,info,false);
  const result=await page.evaluate(function (final) {
    L.throughDistribution();L.access();L.act('commit_move');
    for (let days=0;FB.state.stories[L.agenda].step===3 && days<90;days++) L.day();
    const s=FB.state,M=FB.mobile,r=M.row(s,L.rid),count=M.total(s,L.rid),gold=s.player.gold;
    const denied=L.quote(final ? 'commit_final' : 'commit_settlement'),before=L.snapshot();
    const pure=!denied.allowed && !FB.stories.apply(s,L.agenda,denied.id,denied) && before===L.snapshot();
    // Stage lawful ownership directly; this case exercises settlement, not a conquest journey.
    FB.transferProvince(s,L.target,L.rid);s.holder[L.target]=L.rid;
    L.act(final ? 'propose_final' : 'propose_settlement');L.assent();
    const choice=final ? 'commit_final' : 'commit_settlement',preview=L.quote(choice),
      lines=FB.stories.get(L.agenda).review(s,s.stories[L.agenda],choice,preview).join(' '),
      disclosed=lines.indexOf(String(final ? count : 50)+' people')>=0 && lines.indexOf(FB.world.byId[L.target].name)>=0;
    const q=L.act(final ? 'commit_final' : 'commit_settlement'),once=L.snapshot();
    const duplicate=!FB.stories.apply(s,L.agenda,q.id,q) && once===L.snapshot();
    return {pure:pure,disclosed:disclosed,complete:s.stories[L.agenda].status,step:s.stories[L.agenda].step,
      receipt:r.lastSettlement.final===final && r.lastSettlement.count===(final ? count : 50),
      people:count-M.total(s,L.rid),settled:r.accounting.settled,duplicate:duplicate,
      private:final || s.player.gold===gold,restore:L.roundtrip()};
  },final);
  expect(result).toMatchObject({pure:true,disclosed:true,complete:'agenda_complete',step:5,receipt:true,duplicate:true,private:true,restore:true});
  expect(result.people).toBe(result.settled);
  if (!final) expect(result.people).toBe(50);
});

for (const role of ['leader','member']) test('campaign review follows the actual JSON '+role+' without realm aliasing',async function ({page},info) {
  await begin(page,info,role);
  const result=await page.evaluate(function (role) {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',id='dune_land_campaign',story=FB.stories.get(id),r=M.row(s,rid),
      causes=[{type:'aggression',target:'dune_pass',enemy:'dune_gate'}];
    function commit(action,terms,actor) {return M.commit(s,M.review(s,{realmId:rid,action:action,terms:terms,actor:actor || {kind:'character',id:r.leaderId}}));}
    commit('propose',{operation:'war',proposal:{causes:causes}});
    r.members.forEach(function (m) {commit('assent',{assent:true},m.principal);});
    const before=JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]),q=FB.stories.quote(s,id,'face_campaign');
    const pure=before===JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
    const waiting=s.stories[id].phase==='pending';
    if (role==='leader') {
      // A daily campaign observation must never consume the leader's decision.
      story.day(s,s.stories[id]);
      const explicit=s.stories[id].phase==='pending';
      const fresh=FB.stories.quote(s,id,'face_campaign');s.player.gold++;
      const changed=JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]),stale=!FB.stories.apply(s,id,'face_campaign',fresh) &&
        changed===JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);s.player.gold--;
      const allowed=FB.stories.quote(s,id,'face_campaign'),started=FB.stories.apply(s,id,'face_campaign',allowed),rec=s.stories[id];
      const war=FB.ordinaryWarById(s,rec.warId),consent=rec.playerDecisionGeneration===FB.realmRulerGeneration(s,rid);
      const once=JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]),duplicate=!FB.stories.apply(s,id,'face_campaign',allowed) &&
        once===JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
      const saved=JSON.stringify([rec,r,s.player.gold,FB.getRngState(),FB.getUidCounter()]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const restore=saved===JSON.stringify([FB.state.stories[id],M.row(FB.state,rid),FB.state.player.gold,FB.getRngState(),FB.getUidCounter()]);
      return {pure:pure,waiting:waiting,explicit:explicit,stale:stale,allowed:q.allowed,started:started,
        institution:!!war && war.attacker===rid && FB.startRealmId(FB.state,rid)===rid,consent:consent,duplicate:duplicate,restore:restore};
    }
    const denied=!FB.stories.apply(s,id,'face_campaign',q) && before===JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
    const choices=FB.stories.choices(s,id).length;
    story.day(s,s.stories[id]);
    return {pure:pure,waiting:waiting,allowed:q.allowed,denied:denied,choices:choices,ai:s.stories[id].phase==='started',institution:FB.startRealmId(s,rid)===rid};
  },role);
  if (role==='leader') expect(result).toEqual({pure:true,waiting:true,explicit:true,stale:true,allowed:true,started:true,
    institution:true,consent:true,duplicate:true,restore:true});
  else expect(result).toEqual({pure:true,waiting:true,allowed:false,denied:true,choices:0,ai:true,institution:true});
});

test('typed mobile declarations and saved completion evidence reject malformed inputs atomically',async function ({page},info) {
  await leadership(page,info,false);
  const definitions=await page.evaluate(function (input) {
    const before=FB.contentValues.canonical([FBDATA,FB.state]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const edits=[function (d) {d.storyInstances.dune_leadership.stages[0].choices[0].terms.price=-1;},
      function (d) {d.storyInstances.dune_leadership.stages[0].choices[0].terms.grant=10;},
      function (d) {d.storyInstances.dune_leadership.stages[0].choices[0].operation='agenda_priority';},
      function (d) {d.storyInstances.dune_leadership.stages[0].completion.kind='acknowledged';},
      function (d) {d.storyInstances.opening_dune_leadership.goals[0].criterion.stageId='absent';},
      function (d) {d.storyInstances.dune_leadership.stages[3].choices[0].terms.groundId='absent';},
      function (d) {d.storyInstances.dune_land_campaign.mobileReview.schema=2;},
      function (d) {d.storyInstances.dune_land_campaign.mobileReview.actorId='dune_deputy';},
      function (d) {d.storyInstances.dune_leadership.stages[0].choices[0].action='constructor';},
      function (d) {d.storyInstances.dune_leadership.stages[0].choices[0].terms.price=6;}];
    return {bad:edits.map(function (edit) {const d=JSON.parse(JSON.stringify(input));edit(d);return FB.mods.validate(d).length>0;}),
      pure:before===FB.contentValues.canonical([FBDATA,FB.state]) && rng===FB.getRngState() && uid===FB.getUidCounter(),
      pontic:['pontic_leader_476','pontic_member_476'].map(function (id) {
        const sc=FBDATA.startScenarios.find(function (sc) {return sc.id===id;}),bm=FB.bookmark('476');
        const eligible=!!FB.mobilePrincipalStartProfile(sc,bm,FB.stories);
        if (!eligible) throw new Error('Following start refused: '+JSON.stringify({id:id,start:sc || null,
          revision:bm.revision,realm:bm.realms.find(function (r) {return r.id==='pontic_following_476';}),
          storyline:FB.stories.isStoryline('pontic_camp_household_476')}));
        return eligible && (!bm.starts || bm.starts.indexOf(id)>=0);
      }),
      regional:['saragur_leader_476','saragur_member_476','oghur_leader_476','oghur_member_476'].map(function (id) {
        const sc=FBDATA.startScenarios.find(function (sc) {return sc.id===id;}),bm=FB.bookmark('476');
        return !!FB.mobilePrincipalStartProfile(sc,bm,FB.stories) && (!bm.starts || bm.starts.indexOf(id)>=0);
      }),
      legacy:!!FBDATA.storyInstances.qipchaq_principal_agenda_1204 && !!FBDATA.storyInstances.opening_qipchaq_principal_1204};
  },example);
  expect(definitions).toEqual({bad:Array(10).fill(true),pure:true,pontic:[true,true],regional:Array(4).fill(true),legacy:true});
  const saved=await page.evaluate(function () {
    L.throughDistribution();
    const valid=JSON.parse(FB.save.serialize()),original=L.snapshot();
    const edits=[function (s) {delete s.stories[L.agenda].decisions[0].evidence;},
      function (s) {s.stories[L.agenda].decisions[0].evidence.kind='arrival';},
      function (s) {s.stories[L.agenda].decisions[0].evidence.actorId='absent';},
      function (s) {s.stories[L.agenda].decisions[0].choiceId='defer_demand';},
      function (s) {s.stories[L.profile].goals.move={status:'completed',turn:s.turn};},
      function (s) {s.authority.governments[L.rid].mobile.lastRaid.principal.generation=0;},
      function (s) {s.authority.governments[L.rid].mobile.cohesion.lastDistribution.principal.characterId='absent';},
      function (s) {s.stories[L.agenda].decisions[0].evidence.id='agreement_999999';},
      function (s) {s.stories[L.agenda].decisions[0].evidence.turn=s.turn;}];
    const bad=edits.map(function (edit) {
      const save=JSON.parse(JSON.stringify(valid));edit(save.state);let rejected=false;
      try {FB.save.restore(save);} catch (e) {rejected=true;}
      return rejected && original===L.snapshot();
    });
    return {bad:bad,restore:L.roundtrip()};
  });
  expect(saved).toEqual({bad:Array(9).fill(true),restore:true});
});

test('campaign consent follows elected succession and current incapacity without granting a member control',async function ({page},info) {
  await leadership(page,info,false);
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,r=M.row(s,L.rid),id=L.campaign,story=FB.stories.get(id),other=r.members[1],
      terms={causes:[{type:'aggression',target:'dune_pass',enemy:'dune_gate'}]};
    L.mobile('propose',{operation:'war',proposal:terms});L.assent();
    const q=FB.stories.quote(s,id,'face_campaign'),allowed=q.allowed;
    FB.advanceRealmSuccession(s,L.rid,{cause:'vacancy'});
    r.members.forEach(function (m) {L.mobile('support',{candidateId:other.principal.id},m.principal);});
    L.mobile('select',{candidateId:other.principal.id},other.principal);
    const before=L.snapshot(),stale=!FB.stories.apply(s,id,'face_campaign',q) && before===L.snapshot();
    const noControl=FB.stories.choices(s,id).length===0;
    L.mobile('propose',{operation:'war',proposal:terms},other.principal);
    r.members.forEach(function (m) {L.mobile('assent',{assent:true},m.principal);});
    story.day(s,s.stories[id]);
    const started=s.stories[id].phase==='started' && s.stories[id].actorId===other.principal.id &&
      s.stories[id].actorGeneration===FB.realmRulerGeneration(s,L.rid),warId=s.stories[id].warId;
    s.chars[other.principal.id].captive=true;story.day(s,s.stories[id]);
    const interrupted=s.stories[id].result==='interrupted' && s.stories[id].reason==='authority_lost';
    return {allowed:allowed,stale:stale,noControl:noControl,started:started,interrupted:interrupted,
      independent:!!FB.ordinaryWarById(s,warId),restore:L.roundtrip()};
  });
  expect(result).toEqual({allowed:true,stale:true,noControl:true,started:true,interrupted:true,independent:true,restore:true});
});

test('campaign refusal costs nothing and changed imported policies cannot restore a stamped save',async function ({page},info) {
  await leadership(page,info,false);
  const result=await page.evaluate(function (input) {
    const s=FB.state,id=L.campaign,gold=s.player.gold,funds=FB.treasuryAvailable(s,L.rid),
      q=FB.stories.quote(s,id,'leave_campaign'),refused=FB.stories.apply(s,id,'leave_campaign',q);
    const once=L.snapshot(),duplicate=!FB.stories.apply(s,id,'leave_campaign',q) && once===L.snapshot();
    const closed=s.stories[id].phase==='resolved' && s.stories[id].reason==='player_declined',
      noPayment=s.player.gold===gold && FB.treasuryAvailable(s,L.rid)===funds && !s.stories[id].warId;
    const valid=JSON.parse(FB.save.serialize()),changed=JSON.parse(JSON.stringify(input));
    changed.mobileProfiles.dune_compact.extractionPolicy.raid.maxFood++;
    FB.mods.apply(changed);const before=L.snapshot();let rejected=false;
    try {FB.save.restore(valid);} catch (e) {rejected=true;}
    const pure=before===L.snapshot();FB.mods.apply(input);
    return {refused:refused,duplicate:duplicate,closed:closed,noPayment:noPayment,rejected:rejected,pure:pure,restore:L.roundtrip()};
  },example);
  expect(result).toEqual({refused:true,duplicate:true,closed:true,noPayment:true,rejected:true,pure:true,restore:true});
});
