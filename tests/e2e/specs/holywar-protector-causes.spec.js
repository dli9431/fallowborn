'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,openTitle,prepareGameContent} = require('../support/game/navigation');
const {startDeterministicGame} = require('../support/game/start');
const {beginBookmark,beginBookmarkFromTitle,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const lantern = require('../fixtures/authoring/holywar-protector-lantern.json');

dependsOnRuntime(__filename,['index.html','data/holy_war_causes.js','data/technology.js',
  'data/bookmark_1204.js','data/bookmark_1204_campaigns.js','data/bookmark_1204_terrain.js',
  'data/actions.js','data/cultures.js','data/papacy.js','data/political_institutions.js',
  'js/holywar.js','js/actions.js','js/ui_modals.js','js/ui_misc.js','js/ui_topbar.js','js/modifiers.js',
  'js/settlement.js','js/armies.js','js/ai_decisions.js','js/day_phases.js','js/treasury.js',
  'js/mods.js','js/save.js','js/save_v4.js','js/starts.js','js/model.js','js/world.js',
  'js/papacy.js','js/schema.js','js/governments.js','js/story_history.js','js/bookmark_sources.js','js/main.js']);

async function helpers(page) {
  await page.evaluate(function () {
    window.causeTest = {
      stage:function (date) {
        const s = FB.state, n = function (d) {return d.year*360+d.season*90+d.day-1;};
        s.turn += n(date)-n(s.date); s.date = date;
      },
      snapshot:function () {return JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter(),Object.assign({},localStorage)]);},
      native:function () {
        this.stage({year:1209,season:0,day:1});
        const s = FB.state, p = FB.ensurePapacy(s,'catholic');
        p.obediences[p.romanObedience].authority = 80;
        s.greatHolyWarHistory.cooldownUntil.catholic = 0;
        s.realms.toulouse_1204.treasury.gold = 1000;
        return FB.greatHolyWarTargets(s,'catholic',true).find(function (t) {return !!t.causeId;});
      },
      roundTrip:function () {
        // New council accounts acquire fiscal projections on repair. Existing
        // targets, every balance and every receipt still compare exactly.
        const lazyTargets = Object.create(null);
        Object.keys(FB.state.realms).forEach(function (id) {
          const row = FB.state.realms[id].treasury;
          if (row) lazyTargets[id] = ['necessary','reserveTarget'].filter(function (key) {return row[key] === undefined;});
        });
        const snapshot = function () {
          const copy = JSON.parse(JSON.stringify([FB.state.greatHolyWar,FB.state.greatHolyWarHistory,
          FB.state.holyWarCauseResponses,FB.state.owner,FB.state.holder,FB.state.countySupport || {},
          Object.keys(FB.state.realms).map(function (id) {return [id,FB.state.realms[id].treasury];}),
          FB.state.player.gold,Object.keys(FB.state.chars).sort(),FB.getRngState() >>> 0,FB.getUidCounter()]));
          // Generic settlement repair materializes the existing zero-blessing default.
          const council = copy[0] && copy[0].settlement && copy[0].settlement.case;
          if (council) council.claims.forEach(function (c) {if (c.blessing === undefined) c.blessing = 0;});
          // Empty campaign history is also lazily initialized at restore.
          const history = copy[1];
          if (history) {
            if (history.sequence === undefined) history.sequence = 0;
            ['firstCall','firstLaunched','unlockChecked','sacredLossSince','cooldownUntil','headState'].forEach(function (key) {
              if (history[key] === undefined) history[key] = {};
            });
            if (history.campaigns === undefined) history.campaigns = [];
          }
          copy[6].forEach(function (entry) {
            if (!entry[1]) return;
            (lazyTargets[entry[0]] || []).forEach(function (key) {
              if (entry[1][key] !== undefined && (!Number.isFinite(entry[1][key]) || entry[1][key] < 0))
                throw new Error('Invalid lazy fiscal target ' + entry[0] + '.' + key);
              delete entry[1][key];
            });
          });
          return copy;
        };
        function difference(a,b,at) {
          if (a === b) return null;
          if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return at + ': ' + JSON.stringify(a) + ' -> ' + JSON.stringify(b);
          const keys = Array.from(new Set(Object.keys(a).concat(Object.keys(b)))).sort();
          for (const key of keys) {const d = difference(a[key],b[key],at + '.' + key); if (d) return d;}
          return null;
        }
        const before = snapshot();
        FB.save.restore(JSON.parse(FB.save.serialize()));
        const once = difference(before,snapshot(),'first');
        if (once) throw new Error('Round-trip changed ' + once);
        FB.save.restore(JSON.parse(FB.save.serialize()));
        const twice = difference(before,snapshot(),'second');
        if (twice) throw new Error('Round-trip changed ' + twice);
        return true;
      }
    };
  });
}
async function native(page,info) {
  await beginBookmark(page,info,'1204');
  await helpers(page);
}
async function imported(page,info,ruler,options) {
  await openGame(page,info);
  await prepareGameContent(page);
  const data = JSON.parse(JSON.stringify(lantern));
  if (options && options.publicWard) data.bookmarks.harbor_world.realms[1].publicTreasury = {schema:1};
  if (options && options.vacant) data.bookmarks.harbor_world.religiousHeads.harbor_head = null;
  expect(await page.evaluate(function (data) {return FB.mods.validate(data);},data)).toEqual([]);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(options ? {name:'lantern-demands.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(data))} : path.resolve(__dirname,'../fixtures/authoring/holywar-protector-lantern.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  if (!ruler) await beginBookmarkFromTitle(page,'harbor_world','harbor_household');
  else {
    const county = ruler === 'ward' ? 'harbor_ridge' : 'harbor_quay';
    const scenario = ruler === 'ward' ? 'lantern_ward_ruler' : 'lantern_keeper_ruler';
    const name = ruler === 'ward' ? 'Orin_Vale' : 'Mira_Reed';
    const full = page.locator('#btn-choose-beginning');
    if (await full.isVisible()) await full.click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('LANTERN-harbor_world-' + scenario + '-' + county + '-f-' + name + '-standard');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.getByRole('button',{name:'Begin',exact:true}).click();
    await page.evaluate(function () {FB.game.setPaused(true);});
  }
  await helpers(page);
  await page.evaluate(function () {
    causeTest.stage({year:901,season:0,day:1});
    const rid = FB.startRealmId(FB.state,'harbor_upland');
    if (rid === 'player' && !FB.treasurySeparated(FB.state,rid)) FB.state.player.gold = 200;
    else FB.state.realms[rid].treasury.gold = 200;
  });
}

test('southern French cause requires its window, papal authority and an actual Catholic protector',async function ({page},info) {
  await native(page,info);
  const result = await page.evaluate(function () {
    const s = FB.state, t = causeTest.native(), id = t.targetId;
    const authority = FB.ensurePapacy(s,'catholic'), obedience = authority.obediences[authority.romanObedience];
    const has = function () {return FB.greatHolyWarTargets(s,'catholic',true).some(function (r) {return r.targetId === id;});};
    const before = causeTest.snapshot(), rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.holyWarCauseReview(s,t.causeId,t.declaredRealmId); has();
    const pure = before === causeTest.snapshot() && rng === FB.getRngState() && uid === FB.getUidCounter();
    const wrongCaller = !FB.canCallGreatHolyWar(s,'catholic',id,'france_1204',true);
    obedience.authority = 49; const weak = !has(); obedience.authority = 80;
    const savedHead = s.religiousHeads.catholic; s.religiousHeads.catholic = null;
    const vacancy = !has(); s.religiousHeads.catholic = savedHead;
    s.realms.toulouse_1204.religion = 'sunni'; const differentFaith = !has(); s.realms.toulouse_1204.religion = 'catholic';
    const holders = JSON.stringify(s.holder); t.objectiveCounties.forEach(function (pid) {s.holder[pid] = s.owner[pid];});
    const noProtector = !has(); s.holder = JSON.parse(holders);
    causeTest.stage({year:1208,season:3,day:90}); const early = !has();
    causeTest.stage({year:1229,season:3,day:90}); const finalDay = has();
    causeTest.stage({year:1230,season:0,day:1}); const late = !has();
    return {pure,wrongCaller,weak,vacancy,differentFaith,noProtector,early,finalDay,late,
      target:t.protectorRealmId,kingdom:t.kingdomId,counties:t.objectiveCounties.sort(),holy:t.holyCounties,
      ruler:s.realms.toulouse_1204.ruler.name,technology:FBDATA.techImpactReviews.features.holy_war_protector_causes.mode};
  });
  expect(result).toEqual({pure:true,wrongCaller:true,weak:true,vacancy:true,differentFaith:true,noProtector:true,
    early:true,finalDay:true,late:true,target:'toulouse_1204',kingdom:'aquitaine',
    counties:['albi','beziers','cahors','carcassonne','rodez','toulouse'],holy:[],ruler:'Raymond VI',technology:'none'});
});

test('an unrelated selected date validates native causes without loading their world',async function ({page},info) {
  await openTitle(page,info); await startDeterministicGame(page);
  expect(await page.evaluate(function () {
    return {unloaded:!FB.bookmarkSources.manifestReport().dates.find(function (d) {return d.id === '1204';}).loaded,
      faults:FB.holyWarCauseCatalogFaults(FBDATA),targets:FB.greatHolyWarTargets(FB.state,'catholic',true).filter(function (t) {return !!t.causeId;})};
  })).toEqual({unloaded:true,faults:[],targets:[]});
});

test('submission is conserved, costly, stale-safe and durable without conquest',async function ({page},info) {
  await native(page,info);
  const result = await page.evaluate(function () {
    const s = FB.state,t = causeTest.native(), q = FB.holyWarCauseReview(s,t.causeId,t.declaredRealmId);
    const owner = JSON.stringify([s.owner,s.holder]), beforeGold = s.realms.toulouse_1204.treasury.gold;
    const payee = s.realms[q.headRealmId].treasury.gold;
    const support = q.provinceIds.map(function (pid) {return FB.countyPopularSupport(s,pid);});
    s.realms.toulouse_1204.treasury.gold++;
    const before = causeTest.snapshot(), stale = !FB.respondHolyWarCause(s,q,true) && before === causeTest.snapshot();
    s.realms.toulouse_1204.treasury.gold--;
    const fresh = FB.holyWarCauseReview(s,t.causeId,t.declaredRealmId);
    const accepted = FB.respondHolyWarCause(s,fresh,true), after = causeTest.snapshot();
    const repeated = !FB.respondHolyWarCause(s,fresh,true) && after === causeTest.snapshot();
    return {stale,accepted,repeated,noLand:owner === JSON.stringify([s.owner,s.holder]),
      cost:beforeGold-s.realms.toulouse_1204.treasury.gold,paid:s.realms[q.headRealmId].treasury.gold-payee,
      support:q.provinceIds.every(function (pid,i) {return FB.countyPopularSupport(s,pid) === support[i]-10;}),
      unavailable:!FB.canCallGreatHolyWar(s,'catholic',t.targetId,q.headRealmId,true),saved:causeTest.roundTrip()};
  });
  expect(result).toEqual({stale:true,accepted:true,repeated:true,noLand:true,cost:80,paid:80,support:true,unavailable:true,saved:true});
});

test('resistance calls an ordinary coalition, fields hosts and resumes active service across two restores',async function ({page},info) {
  await native(page,info);
  const result = await page.evaluate(function () {
    const s = FB.state,t = causeTest.native(),q = FB.holyWarCauseReview(s,t.causeId,t.declaredRealmId);
    s.realms.toulouse_1204.treasury.gold = 0;
    FB.greatHolyWarYearly(s);
    const c = s.greatHolyWar, before = JSON.stringify([s.owner,s.holder]);
    const resisted = s.holyWarCauseResponses[0].disposition === 'resisted';
    let rings = 0;
    FB.renderGreatHolyWar({canvas:{width:1000,height:1000},beginPath:function () {},
      arc:function () {rings++;},stroke:function () {},fill:function () {}},function () {return [100,100];},1,1);
    const ai = c.participants.attackers.length > 0 && c.participants.attackers.every(function (p) {
      return !!p.desire && p.desire.kind !== 'sacred' && [4,8,12].indexOf(p.vowSeasons) >= 0;
    });
    const defense = c.participants.defenders.some(function (p) {return p.realm === 'france_1204' && p.mandatory;});
    const disjoint = c.participants.attackers.every(function (p) {return !c.participants.defenders.some(function (d) {return d.realm === p.realm;});});
    s.chars[s.player.charId].religion = 'catholic'; s.player.tier = 1;
    const joined = FB.joinGreatHolyWar(s,'attackers','player',{seasons:4,desire:{kind:'county',id:'beziers'}});
    const prepSaved = causeTest.roundTrip();
    const live = FB.state; Object.keys(live.realms).forEach(function (id) {if (live.realms[id].treasury) live.realms[id].treasury.gold = 100000;});
    causeTest.stage(FB.dateAtTurn(live,live.greatHolyWar.launchTurn));
    FB.greatHolyWarTick(live); FB.armyTick(live);
    return {ai,resisted,defense,disjoint,joined,prepSaved,rings,active:live.greatHolyWar.phase,
      fielded:live.armies.some(function (h) {return h.men > 0 && h.warId === 'holy';}),
      noLand:before === JSON.stringify([live.owner,live.holder]),activeSaved:causeTest.roundTrip()};
  });
  expect(result).toEqual({ai:true,resisted:true,defense:true,disjoint:true,joined:true,prepSaved:true,rings:6,active:'active',fielded:true,noLand:true,activeSaved:true});
});

['regional','sacred'].forEach(function (ground) {
test(ground === 'regional' ? 'only occupied regional objectives enter the existing settlement council' :
  'sacred-site council awards commit recipient courts before restoration',async function ({page},info) {
  await native(page,info);
  const result = await page.evaluate(function (ground) {
    const s = FB.state, regional = causeTest.native();
    const t = ground === 'regional' ? regional : FB.greatHolyWarTargets(s,'catholic',true).find(function (t) {
      return !t.causeId && t.kingdomId === 'syria';
    });
    const c = FB.callGreatHolyWar(s,'catholic',t.targetId || t.kingdomId,'papacy_1204');
    const captured = ground === 'regional' ? ['beziers','carcassonne','toulouse','albi'] : c.objectiveCounties.slice();
    s.chars[s.player.charId].religion = 'catholic'; s.player.tier = 1;
    FB.joinGreatHolyWar(s,'attackers','player',{seasons:4,desire:{kind:'county',id:captured[0]}});
    c.contribution.player = 10000; s.player.greatHolyWar.vowTerms.mustered = true;
    c.phase = 'active'; c.launchedTurn = s.turn; c.deadlineTurn = s.turn+2880;
    captured.forEach(function (pid) {c.occupations[pid].occupied = true; c.occupations[pid].occupiedBy = 'player';});
    const before = JSON.parse(JSON.stringify(s.owner)), beforeHeld = JSON.parse(JSON.stringify(s.holder));
    FB.greatHolyWarTick(s);
    const settlement = c.settlement;
    const bounded = settlement.captured.slice().sort().join(',') === captured.slice().sort().join(',') &&
      settlement.case.assets.every(function (a) {return !a.land || a.awardIds.every(function (pid) {return captured.indexOf(pid) >= 0;});});
    const council = FB.greatHolyWarSettlementNeedsPlayer(s), saved = causeTest.roundTrip();
    const action = FB.instants.find(function (a) {return a.id === 'great_holy_war_settlement';});
    if (!action.show(FB.state)) throw new Error('Council deed unavailable');
    action.run();
    const sheet = document.getElementById('gm-body').textContent.indexOf('Ordered claims') >= 0;
    FB.ui.closeModal();
    let steps = 0;
    while (FB.state.greatHolyWar && FB.state.greatHolyWar.settlement.case.status === 'open' && steps++ < 40)
      FB.greatHolyWarSettlementMove(FB.state,'acquiesce');
    // The sacred case declines personal land, exercising sponsored recipient courts.
    if (FB.state.greatHolyWar && FB.state.greatHolyWar.settlement.pendingPlayer) FB.greatHolyWarSettlementChoice(FB.state,ground === 'regional');
    const outside = Object.keys(before).filter(function (pid) {return captured.indexOf(pid) < 0;}).every(function (pid) {
      return FB.state.owner[pid] === before[pid] && FB.state.holder[pid] === beforeHeld[pid];
    });
    const awardedCourts = Object.keys(FB.state.realms).filter(function (id) {return id.indexOf(c.id + '_') === 0 && FB.state.realms[id].alive;});
    const courtsReady = awardedCourts.length > 0 && awardedCourts.every(function (id) {
      return !!FB.realmRulerCharacterSnapshot(FB.state,id) && FB.realmFamilySnapshot(FB.state,id).every(function (m) {
        return m.alive === false || !!(m.charId && FB.state.chars[m.charId]);
      });
    });
    return {bounded,council,sheet,saved,outside,courtsReady,completed:!FB.state.greatHolyWar,
      awarded:captured.every(function (pid) {return FB.state.owner[pid] !== before[pid];}),resaved:causeTest.roundTrip()};
  },ground);
  expect(result).toEqual({bounded:true,council:true,sheet:true,saved:true,outside:true,courtsReady:true,completed:true,awarded:true,resaved:true});
});
});

test('regional vows offer actual land and honor interests without nonexistent sacred custody',async function ({page},info) {
  await native(page,info);
  await page.evaluate(function () {
    const s = FB.state,t = causeTest.native();
    FB.callGreatHolyWar(s,'catholic',t.targetId,'papacy_1204');
    s.player.tier = 1; s.chars[s.player.charId].religion = 'catholic';
    FB.instants.find(function (a) {return a.id === 'join_great_holy_war';}).run();
  });
  await page.locator('[data-ghw-seasons="4"]').click();
  await expect(page.locator('[data-ghw-desire="sacred"]')).toHaveCount(0);
  await expect(page.locator('[data-ghw-desire="county"]')).toBeVisible();
  expect(await page.evaluate(function () {
    return FB.joinGreatHolyWar(FB.state,'attackers','player',{seasons:4,desire:{kind:'sacred',id:null}}) &&
      FB.state.player.greatHolyWar.vowTerms.desire.kind === 'honor';
  })).toBe(true);
});

test('active submission ends the cause without confiscation or duplicate payment',async function ({page},info) {
  await native(page,info);
  const result = await page.evaluate(function () {
    const s = FB.state,t = causeTest.native(),c = FB.callGreatHolyWar(s,'catholic',t.targetId,'papacy_1204');
    c.phase = 'active'; c.launchedTurn = s.turn; c.deadlineTurn = s.turn+2880;
    c.occupations.beziers.occupied = true;
    const principalBound = FB.holyWarCauseReferencesCharacter(s,c.cause.rulerId);
    const land = JSON.stringify([s.owner,s.holder]),q = FB.holyWarCauseReview(s,t.causeId,t.declaredRealmId);
    const ok = FB.respondHolyWarCause(s,q,true),after = causeTest.snapshot();
    return {ok,principalBound,ended:!s.greatHolyWar,land:land === JSON.stringify([s.owner,s.holder]),
      outcome:s.greatHolyWarHistory.campaigns.slice(-1)[0].outcome,
      once:!FB.respondHolyWarCause(s,q,true) && after === causeTest.snapshot(),saved:causeTest.roundTrip()};
  });
  expect(result).toEqual({ok:true,principalBound:true,ended:true,land:true,outcome:'submitted',once:true,saved:true});
});

test('ordinary fictional JSON uses independent terms and AI submission through the same transaction',async function ({page},info) {
  await imported(page,info);
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'lantern_protection', rid = 'harbor_upland';
    const assignments = s.religiousHeads;
    s.religiousHeads = Object.assign({},assignments,{harbor_head:rid});
    const selfExcluded = !FB.holyWarCauseReview(s,id,rid) && !FB.greatHolyWarTargets(s,'harbor_belief',true).some(function (t) {return t.causeId === id;});
    if (assignments === undefined) delete s.religiousHeads;
    else s.religiousHeads = assignments;
    const originalLiege = s.realms[rid].liege;
    s.realms[rid].liege = 'harbor_commune';
    const ownBlocExcluded = !FB.holyWarCauseReview(s,id,rid) && !FB.greatHolyWarTargets(s,'harbor_belief',true).some(function (t) {return t.causeId === id;});
    if (originalLiege === undefined) delete s.realms[rid].liege;
    else s.realms[rid].liege = originalLiege;
    const q = FB.holyWarCauseReview(s,id,rid),gold = s.realms[rid].treasury.gold;
    const support = FB.countyPopularSupport(s,'harbor_ridge'),land = JSON.stringify([s.owner,s.holder]);
    const t = FB.greatHolyWarTargets(s,'harbor_belief',true).find(function (r) {return r.causeId === id;});
    const independent = t.objectiveCounties.join(',') === 'harbor_ridge' && q.gold === 23 && q.supportLoss === 4;
    FB.greatHolyWarYearly(s); const after = causeTest.snapshot(); FB.greatHolyWarYearly(s);
    return {independent,selfExcluded,ownBlocExcluded,disposition:s.holyWarCauseResponses[0].disposition,cost:gold-s.realms[rid].treasury.gold,
      support:FB.countyPopularSupport(s,'harbor_ridge') === support-4,
      noCampaign:!s.greatHolyWar,noLand:land === JSON.stringify([s.owner,s.holder]),once:after === causeTest.snapshot(),saved:causeTest.roundTrip()};
  });
  expect(result).toEqual({independent:true,selfExcluded:true,ownBlocExcluded:true,disposition:'submitted',cost:23,support:true,noCampaign:true,noLand:true,once:true,saved:true});
});

test('submission keeps its original principal and inherited exemption through ordinary ruler death',async function ({page},info) {
  await imported(page,info);
  const result = await page.evaluate(function () {
    const s = FB.state, rid = 'harbor_upland', q = FB.holyWarCauseReview(s,'lantern_protection',rid);
    const ruler = s.chars[q.rulerId], line = ruler.royalLine;
    const unreferenced = !FB.holyWarCauseReferencesCharacter(s,ruler.id);
    FB.respondHolyWarCause(s,q,true);
    const record = JSON.stringify(s.holyWarCauseResponses[0]), generation = FB.realmRulerGeneration(s,rid);
    const bound = FB.holyWarCauseReferencesCharacter(s,ruler.id) && FB.courtRecordRetained(s,ruler);
    FB.courtMemberDied(s,s.realms[line.realmId].succession.members[line.memberId],ruler);
    FB.ensureRealmCourt(s,rid);
    const next = FB.realmRulerCharacterSnapshot(s,rid);
    return {unreferenced,bound,retained:!!s.chars[ruler.id] && ruler.dead,
      changed:next.id !== ruler.id && FB.realmRulerGeneration(s,rid) > generation,
      original:JSON.stringify(s.holyWarCauseResponses[0]) === record,
      inherited:!FB.holyWarCauseReview(s,'lantern_protection',rid),saved:causeTest.roundTrip()};
  });
  expect(result).toEqual({unreferenced:true,bound:true,retained:true,changed:true,original:true,inherited:true,saved:true});
});

test('imported protector can cancel, resist and submit through Answer the holy war',async function ({page},info) {
  await imported(page,info,'ward');
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(function () {
    const a = FB.instants.find(function (a) {return a.id === 'join_great_holy_war';});
    if (!a.show(FB.state)) throw new Error('Answer deed unavailable'); a.run();
  });
  await expect(page.locator('[data-cause-submit]')).toBeVisible();
  await expect(page.locator('[data-cause-submit]')).toContainText('Submit to the religious demands');
  expect(await page.locator('#gm-body').evaluate(function (body) {
    return body.scrollWidth <= body.clientWidth+1 && Array.from(body.querySelectorAll('[data-cause-submit],[data-cause-resist]')).every(function (b) {
      return b.getBoundingClientRect().height >= 44;
    });
  })).toBe(true);
  const before = await page.evaluate(function () {return causeTest.snapshot();});
  await page.getByRole('button',{name:'Close',exact:true}).click();
  expect(await page.evaluate(function () {return causeTest.snapshot();})).toBe(before);
  await page.evaluate(function () {FB.ui.showGreatHolyWarJoin();});
  await page.locator('[data-cause-resist]').click();
  await page.locator('#cause-continue').click();
  await page.evaluate(function () {FB.greatHolyWarYearly(FB.state); FB.ui.showGreatHolyWarJoin();});
  expect(await page.evaluate(function () {
    const p = FB.state.player.greatHolyWar;
    return p && p.camp === 'defenders' && p.mode === 'host' && p.mandatory;
  })).toBe(true);
  await expect(page.locator('#cause-join-defense')).toHaveCount(0);
  await page.locator('[data-cause-submit]').click();
  await expect(page.locator('#gm-body')).toContainText('without a territorial grant');
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await expect(page.getByRole('button',{name:/^Gold:/})).toContainText('177');
  expect(await page.evaluate(function () {return {ended:!FB.state.greatHolyWar,saved:causeTest.roundTrip(),
    response:FB.state.holyWarCauseResponses[0].disposition};})).toEqual({ended:true,saved:true,response:'submitted'});
});

test('imported religious head selects the cause through Call holy war',async function ({page},info) {
  await imported(page,info,'keeper');
  await page.evaluate(function () {
    const a = FB.instants.find(function (a) {return a.id === 'call_great_holy_war';});
    if (!a.show(FB.state)) throw new Error('Call deed unavailable'); a.run();
  });
  const target = page.locator('[data-ghw-kingdom="cause:lantern_protection:harbor_upland"]');
  await expect(target).toContainText('The Lantern ward demands');
  await target.click();
  expect(await page.evaluate(function () {return {caller:FB.state.greatHolyWar.callerRealm,
    target:FB.state.greatHolyWar.cause.protectorRealmId,saved:causeTest.roundTrip()};})).toEqual({caller:'player',target:'harbor_upland',saved:true});
});

test('an explicitly separated player treasury never borrows submission money from the private purse',async function ({page},info) {
  await imported(page,info,'ward',{publicWard:true});
  expect(await page.evaluate(function () {
    const s = FB.state; s.player.gold = 1000000; s.realms.player.treasury.gold = 0;
    const blocked = FB.holyWarCauseReview(s,'lantern_protection','harbor_upland'),before = causeTest.snapshot();
    const noPrivate = !blocked.canSubmit && !FB.respondHolyWarCause(s,blocked,true) && before === causeTest.snapshot();
    s.realms.player.treasury.gold = 23;
    const q = FB.holyWarCauseReview(s,'lantern_protection','harbor_upland'),payee = s.realms[q.headRealmId].treasury.gold;
    return {noPrivate,accepted:FB.respondHolyWarCause(s,q,true),public:s.realms.player.treasury.gold,
      private:s.player.gold,paid:s.realms[q.headRealmId].treasury.gold-payee,saved:causeTest.roundTrip()};
  })).toEqual({noPrivate:true,accepted:true,public:0,private:1000000,paid:23,saved:true});
});

test('adopting a head court preserves an explicitly vacant religious office',async function ({page},info) {
  await imported(page,info,'keeper',{vacant:true});
  expect(await page.evaluate(function () {
    return FB.state.religiousHeads.harbor_head === null && !FB.religiousHeadSnapshot(FB.state,'harbor_belief') &&
      !FB.canCallGreatHolyWar(FB.state,'harbor_belief','cause:lantern_protection:harbor_upland','player',true) && causeTest.roundTrip();
  })).toBe(true);
});

test('malformed cause definitions reject atomically, including same-import references',async function ({page},info) {
  await openGame(page,info); await prepareGameContent(page);
  const result = await page.evaluate(function (source) {
    const mutations = [function (d) {d.kind='confiscation';},function (d) {d.freeVictory=true;},
      function (d) {d.submission.gold=-1;},function (d) {d.ai.submitChance=2;},
      function (d) {d.protectorRealmIds=['missing'];},function (d) {d.provinceIds=['missing'];},
      function (d) {d.firstDate.day=10;},function (d) {d.provinceIds.push(d.provinceIds[0]);}];
    const accepted = FB.mods.validate(source);
    const failures = mutations.map(function (change) {
      const mod = JSON.parse(JSON.stringify(source)); change(mod.holyWarCauses.lantern_protection);
      const bytes = JSON.stringify(mod),before = JSON.stringify([FBDATA,FB.state,Object.assign({},localStorage)]),rng = FB.getRngState(),uid = FB.getUidCounter();
      const faults = FB.mods.validate(mod);
      let rejected = false; try {FB.mods.apply(mod);} catch (error) {rejected=true;}
      return faults.some(function (e) {return /holyWarCauses/.test(e);}) && bytes === JSON.stringify(mod) &&
        rejected && before === JSON.stringify([FBDATA,FB.state,Object.assign({},localStorage)]) && rng === FB.getRngState() && uid === FB.getUidCounter();
    });
    return {accepted,failures};
  },lantern);
  expect(result).toEqual({accepted:[],failures:Array(8).fill(true)});
});

test('forged campaign and submission saves reject before state, storage or counters change',async function ({page},info) {
  await imported(page,info);
  const result = await page.evaluate(function () {
    const s = FB.state,id = 'lantern_protection',rid = 'harbor_upland';
    FB.callGreatHolyWar(s,'harbor_belief','cause:' + id + ':' + rid,'harbor_commune');
    const campaign = JSON.parse(FB.save.serialize());
    const edits = [function (v) {v.state.greatHolyWar.cause.id='missing';},
      function (v) {v.state.greatHolyWar.objectiveCounties.push('harbor_quay');},
      function (v) {v.state.greatHolyWar.cause.schema=2;},function (v) {v.state.greatHolyWar.cause.extra=true;}];
    function rejects(source,change) {
      const v = JSON.parse(JSON.stringify(source)); change(v);
      const before = causeTest.snapshot(),live = FB.state; let rejected = false;
      try {FB.save.restore(v);} catch (error) {rejected=true;}
      return rejected && FB.state === live && before === causeTest.snapshot();
    }
    const faults = edits.map(function (f) {return rejects(campaign,f);});
    FB.respondHolyWarCause(FB.state,FB.holyWarCauseReview(FB.state,id,rid),true);
    const submitted = JSON.parse(FB.save.serialize());
    [function (v) {v.state.holyWarCauseResponses[0].gold=0;},function (v) {v.state.holyWarCauseResponses[0].provinceIds=['harbor_quay'];},
      function (v) {v.state.holyWarCauseResponses.push(v.state.holyWarCauseResponses[0]);},
      function (v) {v.state.holyWarCauseResponses[0].payeeRealmId='__proto__';},
      function (v) {v.state.holyWarCauseResponses[0].rulerId='constructor';}].forEach(function (f) {faults.push(rejects(submitted,f));});
    return faults;
  });
  expect(result).toEqual(Array(9).fill(true));
});

test('cause terms enter the exact imported-content fingerprint',async function ({page},info) {
  await imported(page,info);
  expect(await page.evaluate(function (source) {
    const saved = JSON.parse(FB.save.serialize()),mod = JSON.parse(JSON.stringify(source));
    mod.holyWarCauses.lantern_protection.submission.gold++;
    FB.mods.apply(mod); const before = causeTest.snapshot(),live = FB.state;
    let rejected = false; try {FB.save.restore(saved);} catch (error) {rejected=/different mod/.test(error.message);}
    return rejected && live === FB.state && before === causeTest.snapshot();
  },lantern)).toBe(true);
});

async function importedCampaignSave(page,info) {
  await imported(page,info);
  return page.evaluate(function () {
    const s = FB.state,q = FB.holyWarCauseReview(s,'lantern_protection','harbor_upland');
    FB.respondHolyWarCause(s,q,false);
    FB.callGreatHolyWar(s,'harbor_belief','cause:lantern_protection:harbor_upland','harbor_commune');
    return {text:FB.save.serialize(),facts:JSON.stringify([s.greatHolyWar,s.holyWarCauseResponses,FB.getRngState() >>> 0,FB.getUidCounter()])};
  });
}

test('fresh-page import restoration resumes a campaign and accepts a durable paid submission',async function ({page},info) {
  const first = await importedCampaignSave(page,info);
  await page.reload({waitUntil:'domcontentloaded'});
  await prepareGameContent(page); await restoreBookmark(page,first.text);
  expect(await page.evaluate(function () {return JSON.stringify([FB.state.greatHolyWar,FB.state.holyWarCauseResponses,FB.getRngState() >>> 0,FB.getUidCounter()]);})).toBe(first.facts);
  await helpers(page);
  expect(await page.evaluate(function () {
    const s = FB.state,q = FB.holyWarCauseReview(s,'lantern_protection','harbor_upland');
    const gold = s.realms.harbor_upland.treasury.gold, payee = s.realms[q.headRealmId].treasury.gold;
    if (!FB.respondHolyWarCause(s,q,true)) throw new Error('Submission did not resume');
    return {cost:gold-s.realms.harbor_upland.treasury.gold,paid:s.realms[q.headRealmId].treasury.gold-payee,
      ended:!s.greatHolyWar,twice:causeTest.roundTrip()};
  })).toEqual({cost:23,paid:23,ended:true,twice:true});
});

test('fresh-page paid submission restoration retains spent resources without replay',async function ({page},info) {
  const first = await importedCampaignSave(page,info);
  const submitted = await page.evaluate(function (text) {
    FB.save.restore(JSON.parse(text));
    const s = FB.state,q = FB.holyWarCauseReview(s,'lantern_protection','harbor_upland');
    if (!FB.respondHolyWarCause(s,q,true)) throw new Error('Submission did not resume');
    return {text:FB.save.serialize(),gold:s.realms.harbor_upland.treasury.gold,
      response:JSON.stringify(s.holyWarCauseResponses),rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()};
  },first.text);
  await page.reload({waitUntil:'domcontentloaded'});
  await prepareGameContent(page); await restoreBookmark(page,submitted.text); await helpers(page);
  expect(await page.evaluate(function () {
    return {gold:FB.state.realms.harbor_upland.treasury.gold,response:JSON.stringify(FB.state.holyWarCauseResponses),
      rng:FB.getRngState() >>> 0,uid:FB.getUidCounter(),ended:!FB.state.greatHolyWar,twice:causeTest.roundTrip(),
      english:!!FB.englishMessage('news.holywar.cause_submission')};
  })).toEqual({gold:submitted.gold,response:submitted.response,rng:submitted.rng,uid:submitted.uid,ended:true,twice:true,english:true});
});

test('regional calls preserve the inaugural Catholic sacred target and legacy campaign saves',async function ({page},info) {
  await native(page,info);
  expect(await page.evaluate(function () {
    let s = FB.state; const regional = causeTest.native();
    s.greatHolyWarHistory.firstCall.catholic = false;
    s.greatHolyWarHistory.firstLaunched.catholic = false;
    const regionalCall = FB.callGreatHolyWar(s,'catholic',regional.targetId,'papacy_1204');
    Object.keys(s.realms).forEach(function (id) {if (s.realms[id].treasury) s.realms[id].treasury.gold = 100000;});
    causeTest.stage(FB.dateAtTurn(s,regionalCall.launchTurn)); FB.greatHolyWarTick(s);
    const firstFlags = regionalCall.phase === 'active' && !s.greatHolyWarHistory.firstCall.catholic && !s.greatHolyWarHistory.firstLaunched.catholic;
    FB.resolveGreatHolyWar(s,'defenders','resolve');
    const firstSaved = causeTest.roundTrip(); s = FB.state;
    const inaugural = FB.greatHolyWarTargets(s,'catholic',true).filter(function (r) {return !r.causeId;}).map(function (r) {return r.kingdomId;}).join(',') === 'syria';
    s.greatHolyWarHistory.cooldownUntil.catholic = 0;
    const t = FB.greatHolyWarTargets(s,'catholic',true).find(function (r) {return r.kingdomId === 'syria' && !r.causeId;});
    const c = FB.callGreatHolyWar(s,'catholic','syria','papacy_1204');
    const faithTargets = t.objectiveCounties.every(function (pid) {return !FB.faithInFold(s,'catholic',FB.realmReligionId(s,s.owner[pid]));});
    const compatible = c && !Object.prototype.hasOwnProperty.call(c,'cause') && c.holyCounties.indexOf('jerusalem') >= 0;
    const saved = causeTest.roundTrip(),before = JSON.stringify([FB.state.owner,FB.state.holder]);
    FB.resolveGreatHolyWar(FB.state,'defenders','resolve');
    return firstFlags && firstSaved && inaugural && faithTargets && compatible && saved && before === JSON.stringify([FB.state.owner,FB.state.holder]) && causeTest.roundTrip();
  })).toBe(true);
});
