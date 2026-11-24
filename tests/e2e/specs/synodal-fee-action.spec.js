'use strict';

const path = require('path');
const { test, expect } = require('../support/fixture');
const { startHistoricalGame } = require('../support/game/historical-start');
const { useReviewStartRules } = require('../support/game/released-starts');
const { openGame, prepareGameContent } = require('../support/game/navigation');
const { beginBookmarkFromTitle, restoreBookmark } = require('../support/game/bookmark-acceptance');
const { waitForUiRefresh } = require('../support/game/ui');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

test.describe.configure({ mode:'parallel' });

dependsOnRuntime(__filename, [
  'data/actions.js','data/events_paths.js','data/religious_cases.js','data/bookmark_1204.js',
  'js/actions.js','js/events.js','js/schema.js','js/religious_cases.js','js/episcopal_claims.js',
  'js/government_ecclesiastical.js','js/papacy.js','js/economy.js','js/justice.js','js/treasury.js',
  'js/ui_panels.js','js/ui_modals.js','js/ui_religious_institutions.js','js/mods.js','js/save.js','js/save_v4.js'
]);

async function startRome(page,info) {
  await startHistoricalGame(page,info,{ bookmark:'1204',code:'SYNOD-1204-baron-roma-m-Court' });
}

async function prepareBishop(page,county,otherSee) {
  await page.evaluate(function ({county,otherSee}) {
    const s = FB.state, c = s.chars[s.player.charId];
    if (otherSee) {
      if (!FB.installBishopric(s,c,{ seeProvinceId:county },{ noReward:true })) throw new Error('Bishopric unavailable');
    } else {
      // Stage the conclave result, then install the real winner through its owner.
      const p = s.papacy, bishop = FB.ecclesiasticalGovernment.incumbent(s,'papacy_1204');
      FB.appointCardinal(s,c,p.romanObedience,bishop.id);
      FB.startPapalElection(s,p.romanObedience,'death');
      const election = p.elections[p.romanObedience];
      election.phase = 'name';
      election.winnerId = c.id;
      if (!FB.choosePapalName(s,p.romanObedience,FB.papalRegnalChoices(s,c.id)[0].name)) throw new Error('Papal election failed');
    }
    s.player.provinceId = county;
    s.player.gold = 100;
    FB.game.setPaused(true);
    FB.game.uiPrefs.groupDeedsByActionType = false;
    Object.assign(FB.game.auto,{ all:false,major:false,minor:false,war:false });
    FB.ui.refresh();
  },{ county,otherSee });
  await waitForUiRefresh(page);
}

async function faithDeeds(page) {
  if (!await page.locator('#tab-actions').isVisible()) await page.locator('[data-tab="actions"]').click();
  const toggle = page.locator('#tab-actions [data-action-group="faith"]');
  await expect(toggle).toBeVisible();
  if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
}

async function ready(page) {
  await expect.poll(function () { return page.evaluate(function () { return !FB.ui.eventInputGuarded(); }); }).toBe(true);
}

function feeOption(page) {
  return page.locator('#ev-options').getByRole('button',{ name:/Enact the lower settlement fee/ });
}

async function convene(page) {
  await faithDeeds(page);
  await page.locator('#tab-actions [data-action-id="convene_synod"]').click();
  await expect(page.locator('#ev-title')).toHaveText('The Diocesan Synod');
  await ready(page);
}

test('a synod opened from Deeds lowers the local quote and matching reload preserves an outstanding offer',async function ({page},info) {
  await startRome(page,info);
  await prepareBishop(page,'roma',false);
  const before = await page.evaluate(function () {
    const s = FB.state, R = FB.religiousCases, id = 'roman_clerical_violence', bishop = s.player.charId;
    s.provChars = s.provChars || {};
    function localPerson(name) {
      const c = FB.makeCharacter(s,{ name,sex:'m',culture:'italian',religion:'catholic',born:s.date.year - 30,station:0,traitsN:0 });
      c.homeProvinceId = 'roma';
      (s.provChars.roma || (s.provChars.roma = [])).push(c.id);
      return c;
    }
    function charge(defendantName) {
      const defendant = localPerson(defendantName), victim = localPerson('Local priest');
      defendant.wealth = 100;
      victim.role = 'priest';
      victim.career = { profession:'priest' };
      victim.wealth = 17;
      const source = FB.justiceRecordOffense(s,bishop,defendant.id,'abduction','material',true,victim.id,'synod-action:' + defendant.id);
      if (!source || !R.apply(s,R.quote(s,id,source.id,bishop,'charge'))) throw new Error('Could not stage a named case');
      return source.id;
    }
    const oid = charge('Local defendant'), fresh = charge('Second defendant');
    if (!R.apply(s,R.quote(s,id,oid,bishop,'settlement'))) throw new Error('Could not stage an outstanding customary offer');
    return { id,oid,fresh,bishop,turn:s.turn,gold:s.player.gold,offer:R.snapshot(s,id,oid).record.offer,
      current:FB.money(2,s),proposed:FB.money(1,s),cost:FB.money(10,s),rome:FB.world.byId.roma.name,
      see:s.realms.papacy_1204.name,compensation:FB.money(15,s) };
  });
  expect(before.offer).toMatchObject({ fee:2,amount:15,by:before.bishop });
  await convene(page);
  const facts = page.locator('#ev-text');
  await expect(facts).toContainText('Jurisdiction: ' + before.rome + ', ' + before.see);
  await expect(facts).toContainText(before.current + ' now, ' + before.proposed + ' with the ceiling');
  await expect(facts).toContainText('Gathering cost already paid: ' + before.cost);
  await expect(facts).toContainText('including open cases. Existing offers and payments keep their original terms.');
  for (const name of [/Reform clerical discipline/,/Found a cathedral school/,/Organize diocesan alms/,/Keep current terms/]) {
    await expect(page.locator('#ev-options').getByRole('button',{ name })).toBeEnabled();
  }
  await feeOption(page).click();
  await expect(page.locator('#event-review-confirm')).toBeEnabled();
  expect(await page.evaluate(function (id) { return FB.religiousCases.synodalFeeRule(FB.state,id); },before.id)).toBeNull();
  await ready(page);
  await page.locator('#event-review-confirm').click();
  await expect(page.locator('#outcome-continue')).toBeVisible();
  await expect(page.locator('#ev-text')).toContainText('The synod set the institutional fee');
  await ready(page);
  await page.locator('#outcome-continue').click();
  await expect(page.locator('#eventmodal')).toHaveClass(/hidden/);

  function readState({id,oid,fresh,bishop}) {
    const s = FB.state, R = FB.religiousCases, snap = R.snapshot(s,id,oid);
    const quote = R.quote(s,id,fresh,bishop,'settlement');
    return { gold:s.player.gold,cooldown:s.player.cooldowns.convene_synod,rule:R.synodalFeeRule(s,id),
      offer:snap.record.offer,newFee:snap.settlementFee,quotedFee:quote.allowed && quote.terms.fee,
      ready:FB.instantStatus(s,'convene_synod').can };
  }
  const after = await page.evaluate(readState,before);
  expect(after).toMatchObject({ gold:before.gold - 10,cooldown:before.turn,offer:before.offer,newFee:1,quotedFee:1,ready:false,
    rule:{ issuer:{ characterId:before.bishop },jurisdiction:{ provinceId:'roma',seeId:'papacy_1204' },terms:{ ceiling:1 } } });
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  await openGame(page,info);
  expect(await page.evaluate(function () { return FB.world === null; })).toBe(true);
  try {
    await restoreBookmark(page,saved);
  } catch (error) {
    const reason = await page.evaluate(function () {
      return FB.game.lastLoadError && FB.game.lastLoadStage + ' – ' + FB.game.lastLoadError.message;
    });
    throw new Error(reason || error.message);
  }
  expect(await page.evaluate(readState,before)).toEqual(after);
  await faithDeeds(page);
  await page.locator('#tab-actions [data-action-id="ecclesiastical_court"]').click();
  const docket = page.locator('[id="religious-' + before.oid + '"]');
  await expect(docket.locator('.kv').filter({ hasText:'Court fee for new offers' })).toContainText(before.proposed);
  await expect(docket.locator('.kv').filter({ hasText:'Court fee in the pending offer' })).toContainText(before.current);
  await expect(docket.locator('.kv').filter({ hasText:'Compensation in the offer' })).toContainText(before.compensation);
});

test('cancellation, missing assent, stale terms, stale authority and keeping custom write no decree',async function ({page},info) {
  await startRome(page,info);
  await prepareBishop(page,'roma',false);
  const beforeTurn = await page.evaluate(function () {
    // Observe the real paid deed's queued context without changing delivery.
    const queueEvent = FB.queueEvent;
    FB.queueEvent = function (state,id) {
      const item = queueEvent.apply(this,arguments);
      if (id === 'bishop_synod') {
        window.synodAgenda = item.ctx;
        FB.queueEvent = queueEvent;
      }
      return item;
    };
    return FB.state.turn;
  });
  await convene(page);
  const attempt = await page.evaluate(function () {
    const s = FB.state, ev = FB.eventById('bishop_synod');
    const option = ev.options.find(function (o) { return o.review && o.review.type === 'synodal_fee'; });
    const ctx = window.synodAgenda, q = FB.eventReviews.quote(s,option,ctx), before = JSON.stringify(s);
    const candidate = JSON.parse(JSON.stringify(ev));
    delete candidate.options[ev.options.indexOf(option)].manualOnly;
    const candidateDenied = FB.validateEventReviews(candidate,{ data:FBDATA }).length > 0;
    const noReview = FB.resolveEventOption(s,ev,option,ctx,{ automated:false });
    const automated = FB.resolveEventOption(s,ev,option,ctx,{ automated:true,reviewed:q });
    return { offered:q.quote.allowed,noReview,automated,candidateDenied,pure:before === JSON.stringify(s) };
  });
  expect(attempt).toEqual({ offered:true,noReview:false,automated:false,candidateDenied:true,pure:true });
  await feeOption(page).click();
  await ready(page);
  await page.locator('#event-review-cancel').click();
  await expect(feeOption(page)).toBeFocused();
  await ready(page);

  for (const change of ['turn','generation']) {
    await feeOption(page).click();
    await expect(page.locator('#event-review-confirm')).toBeEnabled();
    await ready(page);
    await page.evaluate(function (change) {
      if (change === 'turn') FB.state.turn++;
      else FB.state.realms.papacy_1204.ruler.generation++;
    },change);
    await page.locator('#event-review-confirm').click();
    await expect(page.locator('#ev-text')).toContainText('The terms or authority changed.');
    await expect(feeOption(page)).toBeFocused();
    await ready(page);
  }
  await page.locator('#ev-options').getByRole('button',{ name:/Keep current terms/ }).click();
  await expect(page.locator('#eventmodal')).toHaveClass(/hidden/);
  expect(await page.evaluate(function () {
    const s = FB.state, R = FB.religiousCases;
    return { fee:R.effectiveSettlementFee(s,'roman_clerical_violence'),gold:s.player.gold,
      cooldown:s.player.cooldowns.convene_synod,rules:s.authority.synodalFees || [] };
  })).toEqual({ fee:2,gold:90,cooldown:beforeTurn,rules:[] });
});

test('a bishop outside the declared see can convene for alms without gaining fee jurisdiction',async function ({page},info) {
  await startRome(page,info);
  await prepareBishop(page,'spoleto',true);
  await convene(page);
  await expect(feeOption(page)).toHaveCount(0);
  const piety = await page.evaluate(function () { return FB.state.player.piety; });
  await page.locator('#ev-options').getByRole('button',{ name:/Organize diocesan alms/ }).click();
  const result = await page.evaluate(function () {
    const s = FB.state;
    return { gold:s.player.gold,piety:s.player.piety,fee:FB.religiousCases.effectiveSettlementFee(s,'roman_clerical_violence'),
      rule:s.authority.synodalFees || [] };
  });
  expect(result).toEqual({ gold:90,piety:piety + 8,fee:2,rule:[] });
});

test('an ordinary JSON profile offers its own local waiver through the same Deed',async function ({page},info) {
  await useReviewStartRules(page);
  await openGame(page,info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/synodal-fee-spoleto.json'));
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }),page.locator('#mod-apply').click()]);
  await beginBookmarkFromTitle(page,'1204','baron');
  await prepareBishop(page,'spoleto',false);
  await convene(page);
  await expect(page.locator('#ev-text')).toContainText('Spoleto clerical discipline');
  await feeOption(page).click();
  await ready(page);
  await page.locator('#event-review-confirm').click();
  await expect(page.locator('#outcome-continue')).toBeVisible();
  expect(await page.evaluate(function () {
    const s = FB.state, R = FB.religiousCases;
    return { gold:s.player.gold,rules:s.authority.synodalFees.map(function (r) { return r.jurisdiction.provinceId; }),
      fees:['roman_clerical_violence','spoleto_synodal_discipline'].map(function (id) { return R.effectiveSettlementFee(s,id); }) };
  })).toEqual({ gold:90,rules:['spoleto'],fees:[2,0] });
});

test('the gathering is the event the Deed queues and carries the fee review, whatever its id',async function ({page},info) {
  await startRome(page,info);
  await prepareBishop(page,'roma',false);
  // Rename the synod and route the Deed to it. Nothing may depend on the
  // shipped id: the review on the queued event identifies the gathering.
  const routed = await page.evaluate(function () {
    const original = FB.eventById('bishop_synod');
    if (!original || !original.options.some(function (o) { return o.review && o.review.type === 'synodal_fee'; })) {
      throw new Error('The shipped synod no longer hosts the fee review');
    }
    original.id = 'synod_of_the_lamps';
    FBDATA.deedRoutines.convene_synod.queueEvent = original.id;
    FB.invalidateEventIndex();
    window.queuedSynods = [];
    const queue = FB.queueEvent;
    FB.queueEvent = function (s,id,ctx) {
      window.queuedSynods.push({ id:id,agenda:!!(ctx && ctx.synodalFeeAgenda) });
      return queue.apply(this,arguments);
    };
    return { found:!!FB.eventById('synod_of_the_lamps'),shipped:FB.eventById('bishop_synod'),
      routine:FBDATA.deedRoutines.convene_synod.queueEvent };
  });
  expect(routed).toEqual({ found:true,shipped:null,routine:'synod_of_the_lamps' });
  await convene(page);
  await expect(feeOption(page)).toBeEnabled();
  expect(await page.evaluate(function () { return window.queuedSynods; })).toEqual([{ id:'synod_of_the_lamps',agenda:true }]);
  await feeOption(page).click();
  await expect(page.locator('#event-review-confirm')).toBeEnabled();
  await ready(page);
  await page.locator('#event-review-confirm').click();
  await expect(page.locator('#outcome-continue')).toBeVisible();
  await expect(page.locator('#ev-text')).toContainText('The synod set the institutional fee');
  expect(await page.evaluate(function () {
    const s = FB.state;
    return { gold:s.player.gold,rules:s.authority.synodalFees.map(function (r) { return r.profileId; }),
      fee:FB.religiousCases.effectiveSettlementFee(s,'roman_clerical_violence') };
  })).toEqual({ gold:90,rules:['roman_clerical_violence'],fee:1 });
});

test('a Deed routed to an event without the fee review gathers no synodal agenda',async function ({page},info) {
  await startRome(page,info);
  await prepareBishop(page,'roma',false);
  const result = await page.evaluate(function () {
    const s = FB.state, ev = FB.eventById('bishop_extraordinary_tithe');
    if (!ev || ev.options.some(function (o) { return o.review && o.review.type === 'synodal_fee'; })) {
      throw new Error('The comparison event must not host the fee review');
    }
    FBDATA.deedRoutines.convene_synod.queueEvent = ev.id;
    const queued = [], queue = FB.queueEvent;
    FB.queueEvent = function (state,id,ctx) {
      queued.push({ id:id,agenda:!!(ctx && ctx.synodalFeeAgenda) });
      return queue.apply(this,arguments);
    };
    try { FB.runInstant(s,'convene_synod'); } finally { FB.queueEvent = queue; }
    return { queued:queued,rules:s.authority.synodalFees || [] };
  });
  expect(result).toEqual({ queued:[{ id:'bishop_extraordinary_tithe',agenda:false }],rules:[] });
});

test('an ordinary JSON mod can route the Deed away from the shipped synod without widening the fee review',async function ({page},info) {
  await useReviewStartRules(page);
  await openGame(page,info);
  await prepareGameContent(page);
  const faults = await page.evaluate(function () {
    function hosted(trigger) {
      return { events:[{ id:'e2e_fee_review_host',title:'A fee review',text:'The court considers its fee.',trigger:trigger,
        options:[
          { label:'Keep current terms.',effects:{} },
          { label:'Review the lower fee.',require:{ state:[{ reader:'synodal_fee_agenda',args:{} }] },manualOnly:true,
            review:{ type:'synodal_fee',args:{},refusalOption:0 } }
        ] }] };
    }
    return {
      rerouted:FB.mods.validate({ deedRoutines:{ convene_synod:{ costs:{ gold:10 },queueEvent:'bishop_extraordinary_tithe' } } }),
      queueOnly:FB.mods.validate(hosted({ never:true })),
      random:FB.mods.validate(hosted({ flags:['bishop'],chance:0.1 })).join(' ')
    };
  });
  expect(faults.rerouted).toEqual([]);
  expect(faults.queueOnly).toEqual([]);
  // A randomly selected event that the Deed does not queue cannot host the review.
  expect(faults.random).toContain('events.e2e_fee_review_host.options[1].review.args');
});
