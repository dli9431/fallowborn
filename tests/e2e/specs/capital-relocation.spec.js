'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/modifiers.js',
  'data/actions.js',
  'js/actions.js',
  'js/mapview.js',
  'js/world.js',
  'js/lordships.js', 'js/travel.js', 'js/save.js', 'js/main.js',
  'js/ui_modals.js',
  'js/ui_panels.js', 'js/ui_misc.js', 'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');

async function startCapitalRealm(page, testInfo, options) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  return page.evaluate(function (setupOptions) {
    var s = FB.state;
    var p = s.player;
    var counties = ['london', 'canterbury', 'rochester'];
    p.tier = 4;
    p.prestige = setupOptions && setupOptions.prestige !== undefined
      ? setupOptions.prestige : 500;
    FB.setCountySupport(FB.state, p.provinceId, 20);
    p.liege = null;
    p.provs = counties.slice();
    p.capitalRelocation = null;
    p.panelIntrosSeen = p.panelIntrosSeen || {};
    p.panelIntrosSeen.prov = 1;
    for (var i = 0; i < counties.length; i++) {
      s.owner[counties[i]] = 'player';
      s.holder[counties[i]] = 'player';
    }
    FB.foundPlayerRealm(s);
    s.realms.player.capital = counties[0];
    s.realms.player.rank = 1;
    p.provinceId = counties[0];

    s.realms.test_vassal_a = {
      id:'test_vassal_a',
      name:'Ashdown',
      color:'#765432',
      capital:'paris',
      aggression:0,
      rank:1,
      liege:'player',
      alive:true,
      favor:0,
      ruler:{
        name:'Aldred',
        sex:'m',
        culture:'english',
        age:35,
        mar:5,
        generation:1
      }
    };
    s.realms.test_vassal_b = {
      id:'test_vassal_b',
      name:'Briarwood',
      color:'#654321',
      capital:'roma',
      aggression:0,
      rank:1,
      liege:'player',
      alive:true,
      favor:0,
      ruler:{
        name:'Beorn',
        sex:'m',
        culture:'english',
        age:42,
        mar:6,
        generation:1
      }
    };
    p.liegeOps = {
      test_vassal_a:20,
      test_vassal_b:-10
    };
    // Use the canonical writer so the synthetic values carry the current
    // faith baseline just like values created through ordinary play.
    FB.setRealmRulerStanding(s, 'test_vassal_a', 20);
    FB.setRealmRulerStanding(s, 'test_vassal_b', -10);

    s.buildings.london = [{ s:0, id:'fields' }];
    s.buildings.canterbury = [{ s:0, id:'market' }];
    p.landPlots = [
      { provinceId:'london', settlement:0 },
      { provinceId:'canterbury', settlement:0 }
    ];
    p.manor = { provinceId:'london', settlement:0 };

    var oldLord = FB.getRole(s, 'lord', true);
    var oldSteward = FB.getRole(s, 'steward', true);
    var oldPriest = FB.getRole(s, 'priest', true);
    var home = FB.world.byId.london;
    var friend = FB.makeCharacter(s, {
      name:'Edith',
      sex:'f',
      culture:home.culture,
      religion:home.religion,
      born:s.date.year - 28,
      role:'friend',
      station:2,
      quality:2
    });
    friend.opinion = 55;
    s.roles.friend = friend.id;
    p.friendContacts = {};
    p.friendContacts[friend.id] = {
      firstTurn:s.turn,
      lastTurn:s.turn
    };
    p.socialAttention = {};
    p.socialAttention[friend.id] = {
      startedTurn:s.turn,
      lastTurn:s.turn
    };

    p.guildMonopolies = {
      incoming:{
        profession:'craftsman',
        grantorKind:'local',
        grantorId:'old_lord',
        grantorName:'The London Guild Court',
        grantorRulerName:'Old Lord',
        recipientKind:'household',
        advocateId:null,
        advocateName:'',
        scope:'province',
        scopeId:'london',
        tier:3,
        years:4,
        durationDays:1440,
        startTurn:s.turn,
        endTurn:s.turn + 1440,
        enterpriseBonus:0.15,
        rulerFee:25,
        taxBonus:0.02,
        popularOpinion:-5
      },
      outgoing:null
    };
    FB.invalidateRealmCache();
    FB.map.playerProv = p.provinceId;
    FB.ui.mapDirty();
    p.roleOrientationsSeen = p.roleOrientationsSeen || {};
    p.roleOrientationsSeen['role-tier-' + p.tier] = 1;
    FB.ui.refresh();
    return {
      fromId:'london',
      destinationId:'canterbury',
      thirdId:'rochester',
      friendId:friend.id,
      oldLordId:oldLord.id,
      oldStewardId:oldSteward.id,
      oldPriestId:oldPriest.id
    };
  }, options || {});
}

async function startGrantedCapitalRealm(page, testInfo, places) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  return page.evaluate(function (pair) {
    var s = FB.state;
    var p = s.player;
    FB.game.setPaused(true);
    var grantorId = FB.settlementCountyHolder(s, pair.home);
    p.tier = 3;
    p.provinceId = pair.home;
    p.homeSettlement = 1;
    p.provs = [];
    p.liege = grantorId;
    p.travel = null;
    p.travelSettlement = { turn:s.turn, destinationId:pair.home };
    p.capitalRelocation = null;
    p.prestige = 500;
    p.landPlots = [{ provinceId:pair.home, settlement:1 }];
    p.manor = { provinceId:pair.home, settlement:1 };
    p.panelIntrosSeen = { prov:1 };
    p.roleOrientationsSeen = { 'role-tier-4':1 };
    var baronyGranted = FB.assignSettlementLordship(s, pair.home, 1, p.charId);
    [pair.capital, pair.other].forEach(function (pid) {
      s.holder[pid] = grantorId;
      s.owner[pid] = FB.topRealm(s, grantorId);
    });
    FB.invalidateSettlementLordships(s);
    var countyGranted = FB.countyInvestiture(s, pair.capital, grantorId, grantorId);
    var otherGranted = FB.countyInvestiture(s, pair.other, grantorId, grantorId);
    FB.map.playerProv = p.provinceId;
    FB.ui.mapDirty();
    FB.ui.refresh();
    return {
      baronyGranted:baronyGranted,
      countyGranted:countyGranted,
      otherGranted:otherGranted,
      home:p.provinceId,
      capital:s.realms.player.capital,
      homeHolder:FB.settlementCountyHolder(s, pair.home),
      grantorId:grantorId,
      homeName:FB.world.byId[pair.home].name,
      capitalName:FB.world.byId[pair.capital].name
    };
  }, places);
}

const grantedCapitalPairs = [
  { home:'london', capital:'canterbury', other:'rochester' },
  { home:'paris', capital:'troyes', other:'chalons' }
];

for (const pair of grantedCapitalPairs) {
  test('a household in ' + pair.home + ' can join its granted capital in ' + pair.capital,
    async function ({ page }, testInfo) {
      var setup = await startGrantedCapitalRealm(page, testInfo, pair);
      expect(setup.baronyGranted).toBe(true);
      expect(setup.countyGranted).toBe(true);
      expect(setup.otherGranted).toBe(true);
      expect(setup.home).toBe(pair.home);
      expect(setup.capital).toBe(pair.capital);
      expect(setup.homeHolder).toBe(setup.grantorId);

      var result = await page.evaluate(function (places) {
        // Existing split-home saves must be usable without a migration or
        // clearing the character's earlier commoner settlement choice.
        FB.save.restore(JSON.parse(FB.save.serialize()));
        var s = FB.state, p = s.player;
        function property() {
          return JSON.stringify([s.owner, s.holder, p.provs, s.buildings,
            s.settlementLordships.counties[places.home], p.landPlots,
            p.manor, p.enterprises, p.travelSettlement,
            FB.directSettlements(s), FB.recruitmentTerritory(s, 'player').counties]);
        }
        var before = {
          home:p.provinceId, capital:s.realms.player.capital, turn:s.turn,
          prestige:p.prestige, support:FB.countySupportBase(s, places.home),
          property:property()
        };
        var statusBefore = JSON.stringify(s);
        var status = FB.capitalRelocationStatus(s, places.capital);
        var readOnly = statusBefore === JSON.stringify(s);
        var moved = FB.relocatePlayerCapital(s, places.capital);
        var entry = s.log.find(function (item) {
          return item.msg && item.msg.key === 'news.world.household_to_capital';
        });
        var after = {
          home:p.provinceId, capital:s.realms.player.capital, turn:s.turn,
          prestige:p.prestige, support:FB.countySupportBase(s, places.home),
          property:property()
        };
        var locked = FB.capitalRelocationStatus(s, places.other);
        var repeatedBefore = JSON.stringify(s);
        var repeated = FB.relocatePlayerCapital(s, places.other);
        var repeatAtomic = repeatedBefore === JSON.stringify(s);
        var marker = JSON.parse(JSON.stringify(p.capitalRelocation));
        FB.save.restore(JSON.parse(FB.save.serialize()));
        return {
          before:before, after:after, status:status, readOnly:readOnly,
          moved:moved, locked:locked, repeated:repeated, repeatAtomic:repeatAtomic,
          marker:marker, message:entry ? FB.newsText(entry, s, p.charId) : '',
          restoredMarker:FB.state.player.capitalRelocation,
          restoredLock:FB.capitalRelocationStatus(FB.state, places.other).ok
        };
      }, pair);

      expect(result.before.home).toBe(pair.home);
      expect(result.before.capital).toBe(pair.capital);
      expect(result.status.ok).toBe(true);
      expect(result.status.householdOnly).toBe(true);
      expect(result.readOnly).toBe(true);
      expect(result.moved).toBe(true);
      expect(result.after.home).toBe(pair.capital);
      expect(result.after.capital).toBe(pair.capital);
      expect(result.after.turn).toBe(result.before.turn);
      expect(result.after.prestige).toBe(result.before.prestige - result.status.prestigeCost);
      expect(result.after.support).toBe(result.before.support + result.status.popularOpinion);
      expect(result.after.property).toBe(result.before.property);
      expect(result.message).toContain('from ' + setup.homeName + ' to its existing capital at ' + setup.capitalName);
      expect(result.locked.reason).toBe('This ruler has already moved the capital once.');
      expect(result.repeated).toBe(false);
      expect(result.repeatAtomic).toBe(true);
      expect(result.marker.fromId).toBe(pair.home);
      expect(result.marker.destinationId).toBe(pair.capital);
      expect(result.restoredMarker).toEqual(result.marker);
      expect(result.restoredLock).toBe(false);
    });

  test('Land distinguishes home and granted capital for ' + pair.home + ' to ' + pair.capital,
    async function ({ page }, testInfo) {
      if (pair.home === 'paris') await page.setViewportSize({ width:390, height:740 });
      var setup = await startGrantedCapitalRealm(page, testInfo, pair);
      await waitForUiRefresh(page);
      await page.evaluate(function (homeId) { FB.ui.selectProvince(homeId); }, pair.home);
      await expect(page.locator('#tab-prov .panelh').first()).toContainText(setup.homeName + ' ⚑ (home)');
      await page.evaluate(function (capitalId) { FB.ui.selectProvince(capitalId); }, pair.capital);
      await expect(page.locator('#tab-prov .panelh').first()).toContainText(setup.capitalName + ' ⚑ (capital)');
      var move = page.locator('#btn-relocate-capital');
      await expect(move).toBeEnabled();
      await expect(move).toContainText('Move household here');
      await expect(move).toContainText('200 prestige');
      await move.scrollIntoViewIfNeeded();
      var beforeCancel = await page.evaluate(function () {
        return { state:JSON.stringify(FB.state), scroll:document.getElementById('sidebody').scrollTop };
      });
      expect(beforeCancel.scroll).toBeGreaterThan(0);
      await move.click();
      await expect(page.getByRole('heading', { name:'Move household to ' + setup.capitalName + '?' })).toBeVisible();
      await expect(page.locator('[data-capital-relocation]')).toContainText('Your capital is already at ' + setup.capitalName);
      await expect(page.locator('#capital-relocation-confirm')).toContainText('Move the household to ' + setup.capitalName);
      await expect(page.locator('#capital-relocation-cancel')).toContainText('Keep the household in ' + setup.homeName);
      await page.locator('#capital-relocation-cancel').click();
      await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
      await expect(move).toBeFocused();
      expect(await page.evaluate(function () { return JSON.stringify(FB.state); })).toBe(beforeCancel.state);
      await expect.poll(function () {
        return page.evaluate(function () { return document.getElementById('sidebody').scrollTop; });
      }).toBe(beforeCancel.scroll);
      await move.click();
      await expect(page.locator('#capital-relocation-confirm')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
      await waitForUiRefresh(page);
      await expect(page.locator('#tab-prov .panelh').first()).toContainText(setup.capitalName + ' ⚑ (capital and home)');
      await expect(page.locator('#btn-relocate-capital')).toHaveCount(0);
      await page.evaluate(function (otherId) { FB.ui.selectProvince(otherId); }, pair.other);
      await expect(page.locator('#btn-relocate-capital')).toBeDisabled();
      await expect(page.locator('#btn-relocate-capital')).toContainText('This ruler has already moved the capital once.');
    });
}

test('joining the existing capital retains ownership, prestige, travel and campaign blockers',
  async function ({ page }, testInfo) {
    await startGrantedCapitalRealm(page, testInfo, grantedCapitalPairs[0]);
    var results = await page.evaluate(function () {
      var s = FB.state, p = s.player, out = [];
      function attempt(name, destination) {
        var before = JSON.stringify(s);
        var status = FB.capitalRelocationStatus(s, destination || 'canterbury');
        var moved = FB.relocatePlayerCapital(s, destination || 'canterbury');
        out.push({ name:name, ok:status.ok, reason:status.reason,
          moved:moved, unchanged:before === JSON.stringify(s) });
      }
      attempt('current-home', 'london');
      s.holder.canterbury = p.liege;
      attempt('ownership');
      s.holder.canterbury = 'player';
      p.prestige = 199;
      attempt('prestige');
      p.prestige = 500;
      p.travel = { homeId:'london', destinationId:'canterbury', currentId:'london', phase:'outbound' };
      attempt('travel');
      p.travel = null;
      p.flags.on_campaign = 1;
      attempt('campaign');
      delete p.flags.on_campaign;
      p.capitalRelocation = { charId:p.charId, turn:s.turn, fromId:'rochester', destinationId:'london' };
      attempt('lifetime');
      return out;
    });
    expect(results.map(function (item) { return item.name; })).toEqual([
      'current-home', 'ownership', 'prestige', 'travel', 'campaign', 'lifetime'
    ]);
    expect(results[0].reason).toBe('Your household already lives in this county.');
    for (const result of results) {
      expect(result.ok, result.name).toBe(false);
      expect(result.reason, result.name).not.toBe('This county is already your capital and home.');
      expect(result.moved, result.name).toBe(false);
      expect(result.unchanged, result.name).toBe(true);
    }
  });

test('valid capital relocation applies exact consequences without moving land or property',
  async function ({ page }, testInfo) {
    const ids = await startCapitalRealm(page, testInfo);
    const result = await page.evaluate(function (setup) {
      var s = FB.state;
      var p = s.player;
      var before = {
        turn:s.turn,
        owner:JSON.stringify(s.owner),
        holder:JSON.stringify(s.holder),
        provs:JSON.stringify(p.provs),
        buildings:JSON.stringify(s.buildings),
        landPlots:JSON.stringify(p.landPlots),
        manor:JSON.stringify(p.manor),
        realm:{
          name:s.realms.player.name,
          rank:s.realms.player.rank,
          liege:s.realms.player.liege,
          religion:s.realms.player.religion
        },
        county:{
          culture:FB.world.byId[setup.destinationId].culture,
          religion:FB.world.byId[setup.destinationId].religion
        }
      };
      var status = FB.capitalRelocationStatus(s, setup.destinationId);
      var moved = FB.relocatePlayerCapital(s, setup.destinationId);
      var afterFirst = FB.save.serialize();
      var repeat = FB.relocatePlayerCapital(s, setup.fromId);
      var afterRepeat = FB.save.serialize();
      var capitalEntry = null;
      for (var i = s.log.length - 1; i >= 0; i--) {
        if (s.log[i].msg &&
            s.log[i].msg.key === 'news.world.capital_relocated') {
          capitalEntry = s.log[i];
          break;
        }
      }
      return {
        status:status,
        moved:moved,
        repeat:repeat,
        repeatAtomic:afterFirst === afterRepeat,
        home:p.provinceId,
        capital:s.realms.player.capital,
        prestige:p.prestige,
        pop:FB.countySupportBase(FB.state, p.provinceId),
        favorA:FB.realmOpinionOf(s, 'test_vassal_a'),
        favorB:FB.realmOpinionOf(s, 'test_vassal_b'),
        marker:p.capitalRelocation,
        turn:s.turn,
        incoming:p.guildMonopolies.incoming,
        friendRole:s.roles.friend,
        friendHome:s.chars[setup.friendId].homeProvinceId,
        newLord:s.roles.lord,
        newSteward:s.roles.steward,
        newPriest:s.roles.priest,
        oldLordHome:s.chars[setup.oldLordId].homeProvinceId,
        oldStewardHome:s.chars[setup.oldStewardId].homeProvinceId,
        oldPriestHome:s.chars[setup.oldPriestId].homeProvinceId,
        chronicle:capitalEntry ? FB.newsText(
          capitalEntry, s, p.charId) : '',
        preserved:{
          owner:before.owner === JSON.stringify(s.owner),
          holder:before.holder === JSON.stringify(s.holder),
          provs:before.provs === JSON.stringify(p.provs),
          buildings:before.buildings === JSON.stringify(s.buildings),
          landPlots:before.landPlots === JSON.stringify(p.landPlots),
          manor:before.manor === JSON.stringify(p.manor),
          realm:before.realm.name === s.realms.player.name &&
            before.realm.rank === s.realms.player.rank &&
            before.realm.liege === s.realms.player.liege &&
            before.realm.religion === s.realms.player.religion,
          county:before.county.culture ===
              FB.world.byId[setup.destinationId].culture &&
            before.county.religion ===
              FB.world.byId[setup.destinationId].religion
        }
      };
    }, ids);

    expect(result.status.ok).toBe(true);
    expect(result.status.prestigeCost).toBe(200);
    expect(result.status.popularOpinion).toBe(-15);
    expect(result.status.vassalFavor).toBe(-15);
    expect(result.status.vassalIds).toEqual([
      'test_vassal_a',
      'test_vassal_b'
    ]);
    expect(result.moved).toBe(true);
    expect(result.home).toBe('canterbury');
    expect(result.capital).toBe('canterbury');
    expect(result.prestige).toBe(300);
    expect(result.pop).toBe(5);
    expect(result.favorA).toBe(5);
    expect(result.favorB).toBe(-25);
    expect(result.marker).toEqual({
      charId:result.marker.charId,
      turn:0,
      fromId:'london',
      destinationId:'canterbury'
    });
    expect(result.incoming).toBeNull();
    expect(result.friendRole).toBe(ids.friendId);
    expect(result.friendHome).toBe('london');
    expect(result.newLord).not.toBe(ids.oldLordId);
    expect(result.newSteward).not.toBe(ids.oldStewardId);
    expect(result.newPriest).not.toBe(ids.oldPriestId);
    expect(result.oldLordHome).toBe('london');
    expect(result.oldStewardHome).toBe('london');
    expect(result.oldPriestHome).toBe('london');
    expect(result.chronicle).toContain(
      'moves from London to Canterbury');
    expect(result.turn).toBe(0);
    expect(result.preserved).toEqual({
      owner:true,
      holder:true,
      provs:true,
      buildings:true,
      landPlots:true,
      manor:true,
      realm:true,
      county:true
    });
    expect(result.repeat).toBe(false);
    expect(result.repeatAtomic).toBe(true);
  });

test('invalid capital targets and ruler conditions reject without partial mutation',
  async function ({ page }, testInfo) {
    await startCapitalRealm(page, testInfo);
    const results = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var out = [];
      function attempt(name, destination) {
        var before = JSON.stringify(s);
        var status = FB.capitalRelocationStatus(s, destination);
        var moved = FB.relocatePlayerCapital(s, destination);
        out.push({
          name:name,
          ok:status.ok,
          reason:status.reason,
          moved:moved,
          unchanged:before === JSON.stringify(s)
        });
      }

      attempt('foreign', 'paris');
      s.holder.canterbury = 'test_vassal_a';
      attempt('vassal-held', 'canterbury');
      s.holder.canterbury = 'player';
      attempt('current', 'london');
      attempt('missing', 'not_a_county');
      attempt('malformed', null);

      p.tier = 3;
      attempt('baron', 'canterbury');
      p.tier = 4;

      p.prestige = 199;
      attempt('prestige', 'canterbury');
      p.prestige = 500;

      p.travel = {
        homeId:'london',
        destinationId:'paris',
        currentId:'london',
        phase:'outbound'
      };
      attempt('travel', 'canterbury');
      p.travel = null;

      p.war = { enemy:'wessex' };
      attempt('war', 'canterbury');
      p.war = null;

      p.flags.on_campaign = 1;
      attempt('service', 'canterbury');
      delete p.flags.on_campaign;

      p.capitalRelocation = {
        charId:p.charId,
        turn:0,
        fromId:'rochester',
        destinationId:'london'
      };
      attempt('lifetime', 'canterbury');
      return out;
    });

    expect(results.map(function (item) { return item.name; })).toEqual([
      'foreign',
      'vassal-held',
      'current',
      'missing',
      'malformed',
      'baron',
      'prestige',
      'travel',
      'war',
      'service',
      'lifetime'
    ]);
    for (const result of results) {
      expect(result.ok, result.name).toBe(false);
      expect(result.moved, result.name).toBe(false);
      expect(result.unchanged, result.name).toBe(true);
      expect(result.reason, result.name).not.toBe('');
    }
  });

test('save format 3 preserves the marker, old saves remain eligible, and succession resets it',
  async function ({ page }, testInfo) {
    await startCapitalRealm(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      FB.relocatePlayerCapital(s, 'canterbury');
      var usedPayload = JSON.parse(FB.save.serialize());
      var savedMarker = JSON.parse(JSON.stringify(
        usedPayload.state.player.capitalRelocation));
      var exportedPayload = FB.save.parseExport(FB.save.exportState());
      FB.save.restore(exportedPayload);
      var exportedMarker = JSON.parse(JSON.stringify(
        FB.state.player.capitalRelocation));

      FB.save.restore(usedPayload);
      var restoredMarker = JSON.parse(JSON.stringify(
        FB.state.player.capitalRelocation));
      var restoredLock = FB.capitalRelocationStatus(
        FB.state, 'london').ok;

      var oldPayload = JSON.parse(JSON.stringify(usedPayload));
      delete oldPayload.state.player.capitalRelocation;
      FB.save.restore(oldPayload);
      FB.state.player.prestige = 500;
      var oldSaveEligible = FB.capitalRelocationStatus(
        FB.state, 'london').ok;

      FB.save.restore(usedPayload);
      var heir = FB.heirsOf(FB.state)[0];
      heir.dead = false;
      var succeeded = FB.game.succeedTo(heir.id);
      FB.state.player.prestige = 500;
      return {
        savedMarker:savedMarker,
        exportedMarker:exportedMarker,
        restoredMarker:restoredMarker,
        restoredLock:restoredLock,
        oldSaveEligible:oldSaveEligible,
        succeeded:succeeded,
        successorId:FB.state.player.charId,
        formerId:savedMarker.charId,
        successorMarker:FB.state.player.capitalRelocation,
        successorEligible:FB.capitalRelocationStatus(
          FB.state, 'london').ok
      };
    });

    expect(result.savedMarker).toEqual({
      charId:result.formerId,
      turn:0,
      fromId:'london',
      destinationId:'canterbury'
    });
    expect(result.restoredMarker).toEqual(result.savedMarker);
    expect(result.exportedMarker).toEqual(result.savedMarker);
    expect(result.restoredLock).toBe(false);
    expect(result.oldSaveEligible).toBe(true);
    expect(result.succeeded).toBe(true);
    expect(result.successorId).not.toBe(result.formerId);
    expect(result.successorMarker).toBeNull();
    expect(result.successorEligible).toBe(true);
  });

test('losing the capital forces a free synchronized fallback without changing the marker',
  async function ({ page }, testInfo) {
    await startCapitalRealm(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var marker = {
        charId:p.charId,
        turn:0,
        fromId:'rochester',
        destinationId:'london'
      };
      p.capitalRelocation = JSON.parse(JSON.stringify(marker));
      var before = {
        prestige:p.prestige,
        pop:FB.countySupportBase(FB.state, p.provinceId),
        favorA:FB.realmOpinionOf(s, 'test_vassal_a'),
        favorB:FB.realmOpinionOf(s, 'test_vassal_b')
      };
      FB.transferProvince(s, 'london', 'wessex');
      return {
        home:p.provinceId,
        capital:s.realms.player.capital,
        provs:p.provs.slice(),
        owner:s.owner.london,
        holder:s.holder.london,
        marker:p.capitalRelocation,
        before:before,
        after:{
          prestige:p.prestige,
          pop:FB.countySupportBase(FB.state, p.provinceId),
          favorA:FB.realmOpinionOf(s, 'test_vassal_a'),
          favorB:FB.realmOpinionOf(s, 'test_vassal_b')
        }
      };
    });

    expect(result.home).toBe('canterbury');
    expect(result.capital).toBe('canterbury');
    expect(result.provs).toEqual(['canterbury', 'rochester']);
    expect(result.owner).toBe('wessex');
    expect(result.holder).toBe('wessex');
    expect(result.marker).toEqual({
      charId:result.marker.charId,
      turn:0,
      fromId:'rochester',
      destinationId:'london'
    });
    expect(result.after).toEqual(result.before);
  });

test('Land relocation confirmation supports cancel, keyboard focus, and the lifetime lock',
  async function ({ page }, testInfo) {
    await startCapitalRealm(page, testInfo);
    await waitForUiRefresh(page);
    await page.evaluate(function () {
      FB.ui.selectProvince('canterbury');
    });

    const move = page.locator('#btn-relocate-capital');
    await expect(move).toBeVisible();
    await expect(move).toBeEnabled();
    await expect(move).toContainText('Move capital here');
    await expect(move).toContainText('200 prestige');
    const beforeCancel = await page.evaluate(function () {
      return JSON.stringify(FB.state);
    });

    await move.click();
    await expect(page.getByRole('heading', {
      name:'Move capital to Canterbury?'
    })).toBeVisible();
    const capitalFacts = page.locator('[data-capital-relocation]');
    await expect(capitalFacts).toContainText('London');
    await expect(capitalFacts).toContainText('Canterbury');
    await expect(capitalFacts).toContainText('Popular support');
    await expect(capitalFacts).toContainText('-15');
    await expect(page.locator('#capital-relocation-confirm')).toContainText(
      'only voluntary move');
    await expect(page.locator('#capital-relocation-confirm-details')).toBeHidden();
    await expect(page.locator('#gm-body')).toContainText(
      'Ashdown, Briarwood');
    await expect(page.locator('#gm-body')).toContainText(
      'incoming Craft monopoly');
    await expect(page.locator('#gm-body')).toContainText(
      'only voluntary capital move');
    await expect.poll(function () {
      return page.evaluate(function () {
        return document.activeElement &&
          document.activeElement.id;
      });
    }).toBe('capital-relocation-confirm');

    await page.locator('#capital-relocation-cancel').click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    expect(await page.evaluate(function () {
      return JSON.stringify(FB.state);
    })).toBe(beforeCancel);
    await expect(move).toBeFocused();

    await move.click();
    await expect.poll(function () {
      return page.evaluate(function () {
        return document.activeElement &&
          document.activeElement.id;
      });
    }).toBe('capital-relocation-confirm');
    await page.keyboard.press('Enter');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await waitForUiRefresh(page);
    await expect(page.locator('#tab-prov .panelh').first()).toContainText(
      'Canterbury ⚑ (capital and home)');
    expect(await page.evaluate(function () {
      return {
        turn:FB.state.turn,
        home:FB.state.player.provinceId,
        capital:FB.state.realms.player.capital
      };
    })).toEqual({
      turn:0,
      home:'canterbury',
      capital:'canterbury'
    });

    await page.evaluate(function () {
      FB.ui.selectProvince('rochester');
    });
    const locked = page.locator('#btn-relocate-capital');
    await expect(locked).toBeVisible();
    await expect(locked).toBeDisabled();
    await expect(locked).toContainText(
      'This ruler has already moved the capital once.');
  });

test('Land keeps exact disabled reasons and the confirmation fits a narrow layout',
  async function ({ page }, testInfo) {
    await page.setViewportSize({ width:390, height:740 });
    await startCapitalRealm(page, testInfo, { prestige:199 });
    await waitForUiRefresh(page);
    await page.evaluate(function () {
      FB.ui.selectProvince('canterbury');
    });
    const move = page.locator('#btn-relocate-capital');
    await expect(move).toBeDisabled();
    await expect(move).toContainText(
      'Requires 200 prestige; currently 199.');

    await page.evaluate(function () {
      FB.state.player.prestige = 500;
      FB.state.player.travel = {
        homeId:'london',
        destinationId:'paris',
        currentId:'london',
        phase:'outbound'
      };
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);
    await expect(move).toBeDisabled();
    await expect(move).toContainText(
      'Finish the current journey before moving the capital.');

    await page.evaluate(function () {
      FB.state.player.travel = null;
      FB.state.player.flags.on_campaign = 1;
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);
    await expect(move).toBeDisabled();
    await expect(move).toContainText(
      'personally at war or serving in a campaign');

    await page.evaluate(function () {
      delete FB.state.player.flags.on_campaign;
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);
    await expect(move).toBeEnabled();
    await move.click();
    const card = page.locator('#genmodal .modalcard');
    await expect(card).toBeVisible();
    const geometry = await card.evaluate(function (element) {
      var rect = element.getBoundingClientRect();
      var confirm = document.getElementById(
        'capital-relocation-confirm').getBoundingClientRect();
      var cancel = document.getElementById(
        'capital-relocation-cancel').getBoundingClientRect();
      return {
        left:rect.left,
        right:rect.right,
        top:rect.top,
        bottom:rect.bottom,
        width:rect.width,
        confirmHeight:confirm.height,
        cancelHeight:cancel.height,
        viewportWidth:window.innerWidth,
        viewportHeight:window.innerHeight
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(
      geometry.viewportWidth + 1);
    expect(geometry.top).toBeGreaterThanOrEqual(0);
    expect(geometry.bottom).toBeLessThanOrEqual(
      geometry.viewportHeight + 1);
    expect(geometry.width).toBeGreaterThan(300);
    expect(geometry.confirmHeight).toBeGreaterThanOrEqual(44);
    expect(geometry.cancelHeight).toBeGreaterThanOrEqual(44);
  });
