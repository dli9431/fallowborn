'use strict';

const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame, prepareGameContent } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'css/style.css', 'data/bookmarks.js', 'data/economy.js', 'data/map_data.js', 'data/technology.js',
  'js/actions.js', 'js/balance.js', 'js/economy.js', 'js/events.js', 'js/items.js', 'js/justice.js',
  'js/lordships.js', 'js/model.js', 'js/mods.js', 'js/save.js', 'js/save_v4.js',
  'js/ui_misc.js', 'js/ui_modals.js', 'js/world.js',
  'tests/e2e/fixtures/authoring/family-redemption-river.json'
]);

async function begin(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
}

async function stageFamily(page) {
  return page.evaluate(function () {
    const s = FB.state, p = s.player, head = s.chars[p.charId];
    FB.game.setPaused(true);
    head.born = s.date.year - 35;
    p.gold = 1000;
    const lord = FB.syncHomeCountyLord(s);
    const target = { kind:'character', id:lord.id };
    FB.adjustStanding(s, target, -FB.standingOf(s, target), 'test:family_redemption');
    function person(name, age, opts) {
      return FB.makeCharacter(s, Object.assign({
        name:name, sex:'m', born:s.date.year - age, culture:head.culture,
        religion:head.religion, station:0, unfree:true, traits:[]
      }, opts));
    }
    const parent = person('Alder', 60);
    head.fatherId = parent.id;
    const child = person('Birch', 14, { motherId:head.id });
    const other = person('Cedar', 12, { motherId:head.id });
    const remote = person('Dale', 11, { motherId:head.id });
    const away = Object.keys(FB.world.byId).find(function (id) {
      return id !== p.provinceId;
    });
    remote.householdResidenceId = away;
    const stranger = person('Elm', 30);
    FB.touchFamily();
    function standing(c) {
      return FB.standingOf(s, { kind:'character', id:c.id });
    }
    return {
      parent:parent.id, child:child.id, other:other.id, remote:remote.id,
      stranger:stranger.id, lord:lord.id, lordName:FB.fullName(lord),
      sponsor:head.id, away:away, turn:s.turn,
      standing:{ parent:standing(parent), child:standing(child), other:standing(other) }
    };
  });
}

async function openDeed(page, id) {
  await page.evaluate(function (id) { FB.ui.showCharModal(id); }, id);
  const action = page.locator('[data-interaction-action="management.family.manumission"]');
  await action.focus();
  await action.press('Enter');
  await expect(page.getByRole('heading', { name:'Family Manumission' })).toBeVisible();
  return action;
}

function choice(page, id) {
  return page.locator('[data-family-manumission-relative="' + id + '"]');
}

test('the character deed previews and redeems exactly the chosen relatives in one day',
  async function ({ page }, testInfo) {
    await begin(page, testInfo);
    const ids = await stageFamily(page);
    const money = await page.evaluate(function () {
      return [125, 63, 188, 812, 875].map(function (amount) { return FB.money(amount); });
    });
    const action = await openDeed(page, ids.parent);
    const quote = page.locator('#family-manumission-quote');
    const confirm = page.locator('#family-manumission-confirm');
    await expect(page.locator('#family-manumission-recipient')).toContainText(ids.lordName);
    await expect(page.locator('#family-manumission-recipient')).toContainText('Lawful recipient');
    await expect(choice(page, ids.parent)).toBeChecked();
    await expect(choice(page, ids.parent).locator('..')).toContainText(money[0]);
    await expect(choice(page, ids.child).locator('..')).toContainText(money[1]);
    await expect(choice(page, ids.remote)).toHaveCount(0);
    await expect(choice(page, ids.stranger)).toHaveCount(0);
    await expect(quote).toContainText(money[4]);
    await choice(page, ids.parent).uncheck();
    await expect(confirm).toBeDisabled();
    await expect(page.locator('#family-manumission-warning')).toContainText('Choose at least one');
    await choice(page, ids.parent).check();
    await choice(page, ids.child).press('Space');
    await expect(choice(page, ids.child)).toBeChecked();
    await expect(quote).toContainText(money[2]);
    await expect(quote).toContainText(money[3]);
    const costs = page.locator('#family-manumission-cost-details');
    await expect(costs).toContainText('Alder');
    await expect(costs).toContainText('Birch');
    await expect(costs).toContainText(money[0]);
    await expect(costs).toContainText(money[1]);

    await page.locator('#gm-body [data-modal-nav="back"]').click();
    await expect(action).toBeFocused();
    expect(await page.evaluate(function () { return FB.state.turn; })).toBe(ids.turn);
    await action.press('Enter');
    await expect(choice(page, ids.child)).not.toBeChecked();
    await choice(page, ids.child).check();
    await confirm.click();
    const result = await page.evaluate(function (ids) {
      const s = FB.state;
      function facts(id) {
        const c = s.chars[id];
        return { bound:FB.isUnfreeCharacter(s, c), station:FB.stationOf(c),
          deed:c.manumission || null, standing:FB.standingOf(s, { kind:'character', id:id }) };
      }
      return {
        day:s.turn, funds:s.player.gold,
        parent:facts(ids.parent), child:facts(ids.child), other:facts(ids.other),
        remote:facts(ids.remote), stranger:facts(ids.stranger),
        news:s.log.filter(function (entry) {
          return entry.msg && entry.msg.key === 'news.freedom.family_manumission';
        }).map(function (entry) { return entry.msg.params.price; })
      };
    }, ids);
    const deed = { turn:ids.turn, lordId:ids.lord, sponsorId:ids.sponsor };
    expect(result).toMatchObject({
      day:ids.turn + 1, funds:812,
      parent:{ bound:false, station:1, standing:ids.standing.parent + 20, deed:{ ...deed, price:125 } },
      child:{ bound:false, station:1, standing:ids.standing.child + 20, deed:{ ...deed, price:63 } },
      other:{ bound:true, station:0, standing:ids.standing.other, deed:null },
      remote:{ bound:true, station:0, deed:null },
      stranger:{ bound:true, station:0, deed:null }, news:[125, 63]
    });
  });

test('a stale review keeps the selected group intact and spends no money or day',
  async function ({ page }, testInfo) {
    await begin(page, testInfo);
    const ids = await stageFamily(page);
    await openDeed(page, ids.parent);
    await choice(page, ids.child).check();
    const snapshot = await page.evaluate(function (ids) {
      FB.state.chars[ids.child].householdResidenceId = ids.away;
      return JSON.stringify([FB.state, FB.getRngState(), FB.getUidCounter()]);
    }, ids);
    const confirm = page.locator('#family-manumission-confirm');
    await confirm.click();
    await expect(confirm).toBeDisabled();
    await expect(choice(page, ids.parent)).toBeChecked();
    await expect(choice(page, ids.child)).toBeChecked();
    await expect(page.locator('#family-manumission-warning')).toContainText('must live in and be present');
    expect(await page.evaluate(function () {
      return JSON.stringify([FB.state, FB.getRngState(), FB.getUidCounter()]);
    })).toBe(snapshot);
  });

test('confirmation rejects mixed, unaffordable and stale terms without a partial commit',
  async function ({ page }, testInfo) {
    await begin(page, testInfo);
    const ids = await stageFamily(page);
    const result = await page.evaluate(function (ids) {
      const s = FB.state, p = s.player, child = s.chars[ids.child];
      function snapshot() {
        return JSON.stringify([s, FB.getRngState(), FB.getUidCounter()]);
      }
      const before = snapshot();
      const quote = FB.familyManumissionQuote(s, [ids.parent, ids.child]);
      const pure = before === snapshot();
      function refused(change, revert, terms) {
        change();
        const prior = snapshot();
        const accepted = FB.resolveFamilyManumissionGroup(s, terms || quote.terms);
        const unchanged = snapshot() === prior;
        revert();
        return accepted === false && unchanged;
      }
      const target = { kind:'character', id:ids.lord };
      const captive = { captiveId:ids.child, captorId:ids.lord, source:'abduction' };
      const headCaptive = { captiveId:ids.sponsor, captorId:ids.lord, source:'abduction' };
      const blank = function () {};
      const duplicate = Object.assign({}, quote.terms, {
        members:[quote.terms.members[0], quote.terms.members[0]]
      });
      const mixed = Object.assign({}, quote.terms, {
        members:[quote.terms.members[0], { id:ids.remote, kind:'descendant', price:63 }]
      });
      const wrongRecipient = Object.assign({}, quote.terms, { lordId:ids.stranger });
      return {
        pure:pure, initiallyReady:quote.ready,
        duplicate:refused(blank, blank, duplicate),
        otherCounty:refused(blank, blank, mixed),
        wrongRecipient:refused(blank, blank, wrongRecipient),
        lowFunds:refused(function () { p.gold = 187; }, function () { p.gold = 1000; }),
        freesOne:refused(function () { child.station = 1; }, function () { child.station = 0; }),
        lostKin:refused(function () { child.motherId = null; FB.touchFamily(); },
          function () { child.motherId = ids.sponsor; FB.touchFamily(); }),
        targetCustody:refused(function () { s.intrigue.captives.push(captive); },
          function () { s.intrigue.captives.pop(); }),
        sponsorCustody:refused(function () { s.intrigue.captives.push(headCaptive); },
          function () { s.intrigue.captives.pop(); }),
        travel:refused(function () { p.travel = {}; }, function () { p.travel = null; }),
        refusal:refused(function () { FB.adjustStanding(s, target, -21, 'test:refusal'); },
          function () { FB.adjustStanding(s, target, 21, 'test:refusal'); }),
        lordChanged:refused(function () { s.chars[ids.lord].dead = true; },
          function () { s.chars[ids.lord].dead = false; }),
        changedPrice:refused(function () { FBDATA.balance.freedomCost = 251; },
          function () { FBDATA.balance.freedomCost = 250; })
      };
    }, ids);
    expect(result).toEqual({
      pure:true, initiallyReady:true, duplicate:true, otherCounty:true, wrongRecipient:true, lowFunds:true,
      freesOne:true, lostKin:true, targetCustody:true, sponsorCustody:true,
      travel:true, refusal:true, lordChanged:true, changedPrice:true
    });
  });

test('a legacy campaign keeps negotiated freedom and can use the individual deed',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    // V3 predates revision stamps. Start in the actual retained baseline world.
    await page.evaluate(function () { FBDATA.bookmarks['867'].revision = 'baseline'; });
    await startDeterministicGame(page);
    const ids = await stageFamily(page);
    const result = await page.evaluate(function (ids) {
      let s = FB.state;
      FB.setPlayerTier(s, 0, { tenureFormationReason:'rank_change' });
      const target = { kind:'character', id:ids.lord };
      FB.adjustStanding(s, target, 45 - FB.standingOf(s, target), 'test:petition');
      const offer = FB.createFreedomOffer(s, 'petition');
      const accepted = !!FB.acceptFreedomOffer(s, { spendDay:false });
      const legacy = JSON.parse(FB.save.serialize());
      if (legacy.state.start.revision !== 'baseline') throw new Error('Expected the baseline world');
      legacy.v = 3;
      delete legacy.titleIds;
      delete legacy.authoritySchema;
      delete legacy.platformSchema;
      delete legacy.state.start.revision;
      if (legacy.state.authority) delete legacy.state.authority.schema;
      delete legacy.state.player.familyFreedom.first.memberIds;
      FB.save.restore(legacy);
      s = FB.state;
      const parent = s.chars[ids.parent], child = s.chars[ids.child];
      const history = JSON.stringify(s.player.familyFreedom);
      const funds = s.player.gold;
      const hasOldReceipt = !!parent.manumission;
      const separate = FB.resolveFamilyManumission(s, ids.parent);
      return {
        instant:offer.serviceDays === 0 && accepted,
        childCovered:s.player.familyFreedom.first.memberIds.indexOf(child.id) >= 0,
        descendantFree:!FB.isUnfreeCharacter(s, child),
        collateralCovered:s.player.familyFreedom.first.memberIds.indexOf(parent.id) >= 0,
        hasOldReceipt:hasOldReceipt,
        single:separate === parent && FB.stationOf(parent) === 1,
        exactCharge:funds - s.player.gold,
        originalHistory:history === JSON.stringify(s.player.familyFreedom),
        repeat:FB.resolveFamilyManumission(s, ids.parent)
      };
    }, ids);
    expect(result).toEqual({
      instant:true, childCovered:true, descendantFree:true, collateralCovered:false,
      hasOldReceipt:false, single:true, exactCharge:125, originalHistory:true, repeat:false
    });
  });

test('ordinary JSON prices round per relative and matching saves retain paid deeds and property',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,
      '../fixtures/authoring/family-redemption-river.json'));
    await Promise.all([page.waitForEvent('load'), page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
    await startDeterministicGame(page);
    const ids = await stageFamily(page);
    const result = await page.evaluate(function (ids) {
      let s = FB.state;
      const item = FB.grantItem(s, 'keen_seax');
      const ownsItem = item && FB.transferItem(s, item, ids.parent);
      const economy = FB.ensureEconomy(s);
      economy.loans.push({
        id:economy.nextId++, kind:'merchant', lender:'merchant_house',
        principal:20, issuePrice:1, face:23.6, denomination:'nominal',
        dueTurn:s.turn + 180, dueSeason:2, dueYear:s.date.year,
        collateral:null, defaultKind:'revenue', arrears:0, status:'active'
      });
      const debt = JSON.stringify(economy.loans);
      const sig = FB.mods.sig();
      const catalogue = JSON.stringify(FBDATA.balance);
      const faults = FB.mods.validate({ name:'Invalid price type',
        balance:{ freedomRelativeFactor:'0.7' } });
      const validationPure = sig === FB.mods.sig() && catalogue === JSON.stringify(FBDATA.balance);
      const quote = FB.familyManumissionQuote(s, [ids.parent, ids.child]);
      const released = FB.resolveFamilyManumissionGroup(s, quote.terms);
      const repeated = FB.resolveFamilyManumissionGroup(s, quote.terms);
      function facts() {
        return {
          gold:s.player.gold, parent:s.chars[ids.parent].manumission,
          child:s.chars[ids.child].manumission, owner:FB.itemOwner(s, item),
          bound:[ids.parent, ids.child, ids.other].map(function (id) {
            return FB.isUnfreeCharacter(s, s.chars[id]);
          }),
          debt:JSON.stringify(FB.financeActiveLoans(s)),
          news:s.log.filter(function (entry) {
            return entry.msg && entry.msg.key === 'news.freedom.family_manumission';
          }).length
        };
      }
      const after = facts();
      const saved = JSON.parse(FB.save.serialize());
      const rng = FB.getRngState() >>> 0, uid = FB.getUidCounter();
      let rejected = false;
      try { FB.save.restore(Object.assign({}, saved, { mods:'different-redemption-prices' })); }
      catch (error) { rejected = FB.state === s; }
      FB.save.restore(saved);
      s = FB.state;
      const restored = facts();
      return {
        ready:quote.ready, prices:quote.terms.members.map(function (member) { return member.price; }),
        total:quote.price, remaining:quote.remaining, samePeople:released[0].id === ids.parent &&
          released[1].id === ids.child, replay:repeated,
        property:ownsItem && after.owner.kind === 'character' && after.owner.id === ids.parent,
        debtKept:after.debt === debt,
        after:after, restored:restored, exactSignature:saved.mods === sig && FB.mods.sig() === sig,
        rejected:rejected, clocks:rng === (FB.getRngState() >>> 0) && uid === FB.getUidCounter(),
        typed:faults.some(function (fault) { return fault.indexOf('freedomRelativeFactor') >= 0; }),
        validationPure:validationPure, tech:FBDATA.techImpactReviews.features.individual_family_manumission.mode
      };
    }, ids);
    expect(result).toMatchObject({
      ready:true, prices:[71, 41], total:112, remaining:888, samePeople:true, replay:false,
      property:true, debtKept:true, exactSignature:true, rejected:true, clocks:true, typed:true,
      validationPure:true, tech:'none',
      after:{ gold:888, bound:[false, false, true], news:2,
        parent:{ price:71, lordId:ids.lord }, child:{ price:41, lordId:ids.lord } }
    });
    expect(result.restored).toEqual(result.after);
  });
