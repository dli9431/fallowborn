'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {startHistoricalGame} = require('../support/game/historical-start');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const example = require('../fixtures/authoring/event-review-foundation.json');
const examplePath = path.resolve(__dirname,'../fixtures/authoring/event-review-foundation.json');
dependsOnRuntime(__filename,['js/schema.js','js/events.js','js/ui_modals.js','js/ui_misc.js',
  'js/systems.js','js/world.js','js/mods.js','js/save.js','js/save_v4.js','js/stories.js',
  'js/story_track.js','js/story_household.js','js/industry_laws.js','js/model.js',
  'js/government_council.js','js/keys.js','js/economy.js','css/style.css',
  'data/economy.js','data/systems.js','data/events_common.js','data/industry_laws.js']);

// A trusted owner fixture delegates to an existing canonical story transaction.
// It is installed in classic-script order, before the production registry seals.
function registerOwnerFixture() {
  const args = {type:'object',fields:{storyId:{type:'string',ref:{table:'storyInstances'}},
    choiceId:{type:'string'},participant:{value:'witness'}},test:function (a,c) {
    return c.runtime || !!(c.event && (c.event.participants || []).some(function (p) {
      return p.slot === a.participant && p.required === true && p.source === 'context';
    }));
  }};
  function adapter() {
    return {owner:'household_reviews',systemId:'event_story_tracks',args:args,partySlots:{witness:true},
      bind:function (s,a,ctx) {
        const id = ctx.counterpartyId || s.player.charId;
        return {reviewSource:id,participants:{witness:id}};
      },
      quote:function (s,a,ctx) {
        const id = ctx.participants && ctx.participants.witness;
        if (!id || ctx.reviewSource !== id || !s.chars[id] || s.chars[id].dead ||
            !FB.stories.choices(s,a.storyId).some(function (c) {return c.id === a.choiceId;})) return null;
        const q = FB.stories.quote(s,a.storyId,a.choiceId);
        return q && {allowed:q.allowed,story:q,person:id,turn:s.turn};
      },
      apply:function (s,a,q) {return FB.stories.apply(s,a.storyId,a.choiceId,q.story);},
      details:function (s,a,q) {return [FB.fullName(s.chars[q.person]),FB.T('No payment is required.')];}
    };
  }
  const malformed = [];
  function rejects(edit) {
    const a = adapter();edit(a);
    try {FB.eventReviews.register('invalid_review_' + malformed.length,a);malformed.push(false);}
    catch (error) {malformed.push(true);}
  }
  [null,undefined,'',12,[]].forEach(function (v) {rejects(function (a) {a.systemId = v;});});
  [null,[],{}, {witness:false},{Witness:true},{a:true,b:true,c:true,d:true,e:true}].forEach(function (v) {
    rejects(function (a) {a.partySlots = v;});
  });
  rejects(function (a) {a.bind = {};});rejects(function (a) {a.report = null;});
  rejects(function (a) {a.owner = '';});
  const readerMalformed = [];
  [null,undefined,'',12,[]].forEach(function (v) {
    try {FB.eventStateReaders.register({id:'invalid_reader_' + readerMalformed.length,
      system:'household_reviews',systemId:v,args:{type:'object',fields:{}},read:function () {return true;}});
      readerMalformed.push(false);
    } catch (error) {readerMalformed.push(true);}
  });
  FB.eventReviews.register('review_party_choice',adapter());
  FB.eventReviews.register('review_missing_system',Object.assign(adapter(),{systemId:'absent_review_system'}));
  FB.eventStateReaders.register({id:'review_party_ready',system:'household_reviews',systemId:'event_story_tracks',args:args,
    read:function (s,a,ctx) {return !!adapter().quote(s,a,ctx);}});
  window.ownerFixtureRegistrations = {malformed:malformed,readerMalformed:readerMalformed};
}

async function ownerFixture(page) {
  const source = fs.readFileSync(path.resolve(__dirname,'../../../js/schema.js'),'utf8');
  await page.route('**/js/schema.js',function (route) {
    return route.fulfill({contentType:'application/javascript',body:source + '\n(' + registerOwnerFixture.toString() + ')();\n'});
  });
}
async function start(page,info,imported) {
  await ownerFixture(page);
  await openGame(page,info);
  if (imported) {
    expect(await page.evaluate(function (mod) {return FB.mods.validate(mod);},example)).toEqual([]);
    await page.evaluate(function () {FB.ui.showMods();});
    await page.locator('#modfile').setInputFiles(examplePath);
    await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
  }
  await startHistoricalGame(page,info,{bookmark:'1204',code:'REVIEW-1204-baron-london-m-Reader'});
}
async function ready(page) {
  await expect.poll(function () {return page.evaluate(function () {return !FB.ui.eventInputGuarded();});}).toBe(true);
}

test('trusted metadata and event-aware schemas reject malformed native and JSON candidates without side effects',async function ({page},info) {
  await start(page,info,true);
  const result = await page.evaluate(function (mod) {
    const before = JSON.stringify(FB.state), data = JSON.stringify(FBDATA), input = JSON.stringify(mod);
    const rng = FB.getRngState(), uid = FB.getUidCounter(), sig = FB.mods.sig(), rejected = [];
    function reject(edit) {
      const m = JSON.parse(input);edit(m);
      const original = JSON.stringify(m), faults = FB.mods.validate(m);
      let failed = false;try {FB.mods.apply(m);} catch (error) {failed = true;}
      rejected.push(faults.length > 0 && failed && original === JSON.stringify(m));
    }
    reject(function (m) {delete m.events[2].participants;delete m.events[2].participantCards;});
    reject(function (m) {m.events[2].participants[0].required = false;});
    reject(function (m) {m.events[2].participants[0].source = 'role';m.events[2].participants[0].role = 'friend';});
    reject(function (m) {delete m.events[2].participantCards;});
    reject(function (m) {m.events[2].participantCards = [];});
    reject(function (m) {m.events[2].options[0].review.args.participant = 'other';});
    reject(function (m) {m.events[2].options[0].review.type = 'review_missing_system';});
    reject(function (m) {m.events[2].options[1].require = {goldMin:1};});
    reject(function (m) {m.eventPacks.harbor_review_examples.bookmarkIds = ['unregistered_bookmark'];});
    reject(function (m) {m.eventPacks.harbor_review_examples.bookmarkIds = [];});
    reject(function (m) {m.eventPacks.harbor_review_examples.bookmarkIds = ['1204','1204'];});
    reject(function (m) {m.events[2].bookmarkIds = null;});
    reject(function (m) {m.eventPacks.unused_review_pack = {eras:['high_medieval'],bookmarkIds:['unregistered_bookmark']};});
    const ev = FB.eventById('harbor_party_review'), args = ev.options[0].review.args;
    const checked = JSON.parse(JSON.stringify(ev));
    checked.options[0].require = {state:[{reader:'review_party_ready',args:args}]};
    const valid = FB.validateEventStateConditions(checked).length === 0;
    checked.participants[0].required = false;
    const invalidReader = FB.validateEventStateConditions(checked).length > 0;
    const invalidSubscription = FB.validateEventLifecycle({harbor_party_review:[{hook:'household_birth',require:{state:[{reader:'review_party_ready',args:args}]}}]},[checked]).length > 0;
    let sealed = false;try {FB.eventReviews.register('late_review',{});} catch (error) {sealed = true;}
    return {registrations:ownerFixtureRegistrations,rejected:rejected,valid:valid,invalidReader:invalidReader,
      invalidSubscription:invalidSubscription,sealed:sealed,pure:before === JSON.stringify(FB.state) && data === JSON.stringify(FBDATA) &&
        rng === FB.getRngState() && uid === FB.getUidCounter() && sig === FB.mods.sig() && input === JSON.stringify(mod)};
  },example);
  expect(result.registrations.malformed).toEqual(Array(14).fill(true));
  expect(result.registrations.readerMalformed).toEqual(Array(5).fill(true));
  expect(result.rejected).toEqual(Array(13).fill(true));
  expect(result).toMatchObject({valid:true,invalidReader:true,invalidSubscription:true,sealed:true,pure:true});
});

test('exact party binding, direct and legacy gates, stale rejection and automated refusal remain pure',async function ({page},info) {
  await start(page,info,true);
  const result = await page.evaluate(function () {
    const s = FB.state, ev = FB.eventById('harbor_party_review'), opt = ev.options[0];
    FB.stories.start(s,{tracks:['harbor_routine']});
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const original = {}, ctx = FB.eventContextFor(s,ev,original), reviewed = FB.eventReviews.quote(s,opt,ctx);
    const repeated = Array(5).fill(0).every(function () {return JSON.stringify(FB.eventReviews.quote(s,opt,ctx)) === JSON.stringify(reviewed);});
    const queuedBefore = s.eventQueue.slice();
    s.player.flags.review_fixture_birth = 1;
    const published = FB.queueLifecycleEvents(s,'household_birth',{}).filter(function (q) {return q.id === ev.id;});
    const moment = published.length === 1 && published[0].ctx.participants.witness === ctx.participants.witness;
    s.eventQueue = queuedBefore;delete s.player.flags.review_fixture_birth;
    const calls = [{reader:'review_party_ready',args:opt.review.args}];
    const reader = FB.eventStateReaders.test(s,calls,ctx);
    const noRecast = FB.eventContextFor(s,ev,{participants:{witness:'absent_person'}}) === false &&
      FB.eventContextFor(s,ev,{participants:{}}) === false && FB.eventContextFor(s,ev,{},true) === false;
    const rebound = FB.eventContextFor(s,ev,JSON.parse(JSON.stringify(ctx)),true);
    const exact = JSON.stringify(rebound) === JSON.stringify(ctx) && JSON.stringify(original) === '{}';
    const conflicting = !FB.eventContextFor(s,ev,{reviewSource:'changed_source'});
    const protagonist = !FB.eventReviews.quote(s,opt,Object.assign({},ctx,{protagonistId:'former_person'}));
    const person = s.chars[ctx.participants.witness], wasDead = person.dead;
    const hadDead = Object.prototype.hasOwnProperty.call(person,'dead');person.dead = true;
    const deadState = JSON.stringify(s);
    const dead = !FB.eventContextStillValid(s,ev,ctx) && !FB.eventReviews.quote(s,opt,ctx) &&
      !FB.resolveEventOption(s,ev,opt,ctx,{reviewed:reviewed}) && deadState === JSON.stringify(s);
    if (hadDead) person.dead = wasDead;else delete person.dead;
    const raw = FBDATA.bookmarks[s.start.id], systems = raw.systems;
    raw.systems = Object.assign({},systems,{event_story_tracks:false});
    const disabled = !FB.eventReviews.quote(s,opt,ctx) && !FB.eventStateReaders.test(s,calls,ctx) &&
      !FB.eventStateReaders.test(s,[Object.assign({},calls[0],{not:true})],ctx);
    raw.systems = systems;
    const metadata = FBDATA.systems.event_story_tracks, owner = metadata.eventReaderOwner;
    metadata.eventReaderOwner = 'unrelated_owner';
    const explicit = !!FB.eventReviews.quote(s,opt,ctx) && FB.eventStateReaders.test(s,calls,ctx);
    const legacy = !FB.eventStateReaders.ownerEnabled(s,'story_tracks') &&
      !FB.eventReviews.quote(s,FB.eventById('harbor_household_review').options[0],ctx);
    metadata.eventReaderOwner = owner;
    let messages = 0;const message = FB.eventMessage;
    FB.eventMessage = function () {messages++;return message.apply(this,arguments);};
    let missing, stale, denied;
    try {
      missing = !FB.resolveEventOption(s,ev,opt,ctx,{});
      const changed = JSON.parse(JSON.stringify(reviewed));changed.quote.turn++;
      stale = !FB.resolveEventOption(s,ev,opt,ctx,{reviewed:changed});
      denied = !FB.resolveEventOption(s,ev,opt,Object.assign({},ctx,{reviewSource:'different_person'}),{reviewed:reviewed});
    } finally {FB.eventMessage = message;}
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const fork = JSON.parse(before), q = FB.stories.quote(fork,'harbor_routine','keep_routine');
    const canonical = FB.stories.apply(fork,'harbor_routine','keep_routine',q);
    const auto = JSON.parse(before), automatic = FB.resolveEventOption(auto,ev,opt,ctx,{automated:true});
    const committed = FB.resolveEventOption(s,ev,opt,ctx,{reviewed:reviewed});
    const settled = JSON.stringify(s), duplicate = !FB.resolveEventOption(s,ev,opt,ctx,{reviewed:reviewed}) && settled === JSON.stringify(s);
    const refusal = FB.resolveEventOption(s,ev,opt,ctx,{automated:true});
    return {repeated:repeated,moment:moment,reader:reader,noRecast:noRecast,exact:exact,conflicting:conflicting,protagonist:protagonist,dead:dead,disabled:disabled,explicit:explicit,legacy:legacy,
      missing:missing,stale:stale,denied:denied,messages:messages,pure:pure,duplicate:duplicate,
      parity:!!canonical && !!committed && !!automatic && JSON.stringify(s.stories.harbor_routine) === JSON.stringify(fork.stories.harbor_routine) &&
        JSON.stringify(auto.stories.harbor_routine) === JSON.stringify(fork.stories.harbor_routine),refusal:refusal.optionIndex === 1};
  });
  expect(result).toEqual({repeated:true,moment:true,reader:true,noRecast:true,exact:true,conflicting:true,protagonist:true,dead:true,disabled:true,explicit:true,legacy:true,
    missing:true,stale:true,denied:true,messages:0,pure:true,duplicate:true,parity:true,refusal:true});
});

for (const native of [true,false]) test((native ? 'native' : 'ordinary JSON') + ' canonical payment and queued parties survive two exact current-content restores',async function ({page},info) {
  await start(page,info,true);
  const result = await page.evaluate(function (native) {
    const s = FB.state, p = s.player, me = s.chars[p.charId];
    FB.stories.start(s,{tracks:['harbor_routine']});
    p.tier = 1;p.profession = 'merchant';p.gold = 2000;
    FB.setCareer(s,me,'merchant','journeyman');me.skills.dip = 12;me.skills.ste = 12;
    const tech = FB.realmTechRecord(s,FB.techRealmId(s));
    ['urban_markets','annual_fairs'].forEach(function (id) {if (tech.completed.indexOf(id) < 0) tech.completed.push(id);});
    FB.fns.local_council_elected(s);FB.enterpriseList(s);FB.enterpriseLaborRecords(s);
    const e = FB.buyEnterprise(s,'market_stall_business',0);
    if (!e) throw new Error('Stall purchase failed');
    const id = native ? 'london_stall_license' : 'harbor_stall_permission', chance = FB.localCouncilMotionChance(s);
    for (let i = 0; i < 128; i++) {const seed = FB.getRngState();if (FB.rng() < chance) {FB.setRngState(seed);break;}}
    const motion = FB.industryLaws.quoteMotion(s,id);
    if (!FB.proposeLocalCouncilMotion(s,motion.terms.motionId,motion).passed) throw new Error('Law vote failed');
    s.turn = 31;p.provinceId = 'york';
    FB.localFolkArrive(s,'york');
    const ev = FB.eventById(native ? 'operating_terms_notice' : 'harbor_permission_review');
    const opt = ev.options.find(function (o) {return !!o.review;}), ctx = FB.eventContextFor(s,ev,{enterpriseUid:e.uid,locationId:'london'});
    const q = FB.eventReviews.quote(s,opt,ctx), before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const missing = !FB.resolveEventOption(s,ev,opt,ctx,{}) && before === JSON.stringify(s);
    const available = p.gold;p.gold = 0;
    const deniedState = JSON.stringify(s), deniedQuote = FB.eventReviews.quote(s,opt,ctx);
    const denied = !!deniedQuote && !deniedQuote.quote.allowed &&
      !FB.resolveEventOption(s,ev,opt,ctx,{reviewed:deniedQuote}) && deniedState === JSON.stringify(s) &&
      rng === FB.getRngState() && uid === FB.getUidCounter();
    p.gold = available;
    p.gold--;const changed = JSON.stringify(s);
    const stale = !FB.resolveEventOption(s,ev,opt,ctx,{reviewed:q}) && changed === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const fresh = FB.eventReviews.quote(s,opt,ctx), fork = JSON.parse(changed);
    const deed = FB.industryLaws.quoteOperation(fork,fork.player.enterprises.find(function (v) {return v.uid === e.uid;}),'pay',0);
    if (!FB.industryLaws.commitOperation(fork,deed)) throw new Error('Canonical payment failed');
    FB.setRngState(rng);FB.setUidCounter(uid);
    const paid = p.gold, receipt = FB.resolveEventOption(s,ev,opt,ctx,{reviewed:fresh});
    const parity = !!receipt && p.gold === fork.player.gold && JSON.stringify(s.industryLaws) === JSON.stringify(fork.industryLaws);
    const queued = FB.queueEvent(s,'harbor_party_review',{});
    if (!queued) throw new Error('Exact party context was not queued');
    window.reviewCheckpoint = {gold:p.gold,permits:JSON.stringify(s.industryLaws.permits),queue:JSON.stringify(s.eventQueue),
      chars:Object.keys(s.chars).sort(),person:queued.ctx.participants.witness,story:JSON.stringify(s.stories.harbor_routine),
      rng:FB.getRngState() >>> 0,uid:FB.getUidCounter(),sig:FB.mods.sig()};
    return {missing:missing,denied:denied,stale:stale,parity:parity,legacyEnvelope:!Object.prototype.hasOwnProperty.call(q,'participants'),
      charge:paid - p.gold,saved:FB.save.serialize()};
  },native);
  expect(result).toMatchObject({missing:true,denied:true,stale:true,parity:true,legacyEnvelope:true});expect(result.charge).toBeGreaterThan(0);
  for (let i = 0; i < 2; i++) {
    await restoreBookmark(page,i ? await page.evaluate(function () {return FB.save.serialize();}) : result.saved);
    expect(await page.evaluate(function () {
      const s = FB.state, c = reviewCheckpoint;
      const ctx = s.eventQueue.find(function (q) {return q.id === 'harbor_party_review';}).ctx;
      return c.gold === s.player.gold && c.permits === JSON.stringify(s.industryLaws.permits) &&
        c.queue === JSON.stringify(s.eventQueue) && c.person === ctx.participants.witness && !!s.chars[c.person] &&
        JSON.stringify(c.chars) === JSON.stringify(Object.keys(s.chars).sort()) && c.story === JSON.stringify(s.stories.harbor_routine) &&
        c.rng === (FB.getRngState() >>> 0) && c.uid === FB.getUidCounter() && c.sig === FB.mods.sig();
    })).toBe(true);
  }
});

test('bookmark-scoped event routes and caches use saved campaign identity while legacy periods remain unscoped',async function ({page},info) {
  await start(page,info,true);
  const result = await page.evaluate(function () {
    const s = FB.state, ev = FB.eventById('harbor_party_review'), before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const current = FB.eventYearPool(s).indexOf(ev) >= 0, ctx = FB.eventContextFor(s,ev,{}), fork = JSON.parse(before);
    fork.start.id = '1096';fork.era = FB.campaignEra(s);
    const other = !FB.eventPeriodEnabled(fork,ev) && FB.eventYearPool(fork).indexOf(ev) < 0 &&
      !FB.eventContextFor(fork,ev,{}) && !FB.queueEvent(fork,ev.id,{}) &&
      !FB.eventContextStillValid(fork,ev,ctx) && !FB.eventOptionStatus(fork,ev,ev.options[0],ctx).ready &&
      !FB.resolveEventOption(fork,ev,ev.options[0],ctx,{automated:true});
    const again = FB.eventYearPool(s).indexOf(ev) >= 0;
    const legacy = Object.assign({},ev,{id:'unscoped_example',pack:undefined});
    const unscoped = FB.eventPeriodEnabled(fork,legacy);
    const bad = JSON.parse(before);delete bad.start.id;
    const missing = !FB.eventPeriodEnabled(bad,ev);
    bad.start.id = s.start.id;bad.start.revision = 'unregistered_revision';
    const unavailable = !FB.eventPeriodEnabled(bad,ev) && FB.eventYearPool(bad).indexOf(ev) < 0;
    const badPacks = FB.validateEventPacks({invalid:{eras:['high_medieval'],bookmarkIds:[]}}).length > 0 &&
      FB.validateEventPacks([]).length > 0;
    return {current:current,other:other,again:again,unscoped:unscoped,missing:missing,unavailable:unavailable,badPacks:badPacks,
      pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result).toEqual({current:true,other:true,again:true,unscoped:true,missing:true,unavailable:true,badPacks:true,pure:true});
});

for (const mobile of [false,true]) test((mobile ? 'mobile' : 'desktop') + ' confirmation and outcome retain the original portrait cards, disclosures, scroll and focus',async function ({page},info) {
  await page.setViewportSize(mobile ? {width:390,height:700} : {width:1280,height:720});
  await start(page,info,true);
  await page.evaluate(function () {
    const s = FB.state;FB.stories.start(s,{tracks:['harbor_routine']});
    Object.assign(FB.game.auto,{all:false,major:false,minor:false});
    const ev = FB.eventById('harbor_party_review');
    FB.ui.runEvents([{id:ev.id,ctx:FB.eventContextFor(s,ev,{})}]);
  });
  const option = page.locator('#ev-options .evopt').first();
  await expect(option).toBeVisible();
  if (mobile) await page.locator('.event-participant-card .settcard-info').click();
  await page.evaluate(function () {
    window.retainedParty = document.querySelector('.event-participant-card');
    // Exercise real nonzero scroll independently of fonts and tooltip layout.
    retainedParty.style.minHeight = '900px';
    window.retainedDisclosureHidden = retainedParty.querySelector('.settcard-details').classList.contains('hidden');
    window.retainedChoice = document.querySelector('#ev-options .evopt');
    window.retainedIdentity = retainedParty.querySelector('[data-event-character]').dataset.eventCharacter;
    window.retainedState = JSON.stringify(FB.state);window.retainedRng = FB.getRngState();window.retainedUid = FB.getUidCounter();
  });
  for (const via of mobile ? ['cancel','escape','back','mobile-back'] : ['cancel','escape','back']) {
    await ready(page);
    await option.evaluate(function (button) {
      button.focus({preventScroll:true});
      const card = document.querySelector('#eventmodal .modalcard');card.scrollTop = 50;
      window.originalScroll = card.scrollTop;button.click();
    });
    await expect(page.locator('#event-review-cancel')).toBeVisible();
    expect(await page.evaluate(function () {return retainedParty === document.querySelector('.event-participant-card') &&
      retainedParty.querySelector('[data-event-character]').dataset.eventCharacter === retainedIdentity;})).toBe(true);
    await expect(page.locator('.event-participant-main canvas.pface')).toBeVisible();
    await ready(page);
    await page.locator('.event-participant-card [data-event-character]').evaluate(function (button) {
      button.focus({preventScroll:true});
      const card = document.querySelector('#eventmodal .modalcard');card.scrollTop = 20;
      window.confirmScroll = card.scrollTop;button.click();
    });
    await expect(page.locator('#genmodal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    expect(await page.evaluate(function () {return document.activeElement === retainedParty.querySelector('[data-event-character]') &&
      retainedParty === document.querySelector('.event-participant-card') && confirmScroll > 0 &&
      document.querySelector('#eventmodal .modalcard').scrollTop === confirmScroll;})).toBe(true);
    await ready(page);
    if (via === 'cancel') await page.locator('#event-review-cancel').click();
    else if (via === 'escape') await page.keyboard.press('Escape');
    else if (via === 'back') await page.locator('#event-nav-back').click();
    else await page.goBack();
    await expect(option).toBeVisible();
    expect(await page.evaluate(function () {return retainedParty === document.querySelector('.event-participant-card') &&
      retainedChoice === document.querySelector('#ev-options .evopt') && document.activeElement === retainedChoice &&
      retainedParty.querySelector('.settcard-details').classList.contains('hidden') === retainedDisclosureHidden && retainedState === JSON.stringify(FB.state) &&
      retainedRng === FB.getRngState() && retainedUid === FB.getUidCounter() && originalScroll > 0 &&
      document.querySelector('#eventmodal .modalcard').scrollTop === originalScroll;})).toBe(true);
  }
  await ready(page);await option.click();await ready(page);
  await page.evaluate(function () {FB.state.turn++;window.changedState = JSON.stringify(FB.state);});
  await page.locator('#event-review-confirm').click();
  await expect(page.locator('#ev-text')).toContainText('Nothing was spent');
  expect(await page.evaluate(function () {return changedState === JSON.stringify(FB.state) && retainedParty === document.querySelector('.event-participant-card') &&
    document.activeElement === retainedChoice;})).toBe(true);
  await ready(page);await option.click();await ready(page);await page.locator('#event-review-confirm').click();
  await expect(page.locator('#outcome-continue')).toBeVisible();
  expect(await page.evaluate(function () {return retainedParty === document.querySelector('.decision-outcome-people .event-participant-card') &&
    retainedParty.querySelector('[data-event-character]').dataset.eventCharacter === retainedIdentity;})).toBe(true);
  await ready(page);
  await page.locator('.event-participant-card [data-event-character]').evaluate(function (button) {
    button.focus({preventScroll:true});
    const card = document.querySelector('#eventmodal .modalcard');card.scrollTop = 20;
    window.outcomeScroll = card.scrollTop;button.click();
  });
  await expect(page.locator('#genmodal')).toBeVisible();await page.keyboard.press('Escape');
  await expect(page.locator('#outcome-continue')).toBeVisible();
  expect(await page.evaluate(function () {return document.activeElement === retainedParty.querySelector('[data-event-character]') &&
    outcomeScroll > 0 && document.querySelector('#eventmodal .modalcard').scrollTop === outcomeScroll;})).toBe(true);
});
