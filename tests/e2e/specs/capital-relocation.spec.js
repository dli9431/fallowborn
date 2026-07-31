'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame,
  waitForUiRefresh
} = require('../support/game');

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
    p.pop = 20;
    p.liege = null;
    p.provs = counties.slice();
    p.capitalRelocation = null;
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

    s.buildings.london = [{ s:0, id:'fields' }];
    s.buildings.canterbury = [{ s:0, id:'market' }];
    p.landPlots = [
      { provinceId:'london', settlement:0 },
      { provinceId:'canterbury', settlement:0 }
    ];
    p.manor = { provinceId:'london', settlement:0 };

    var oldLord = FB.getRole(s, 'lord', true);
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
      oldPriestId:oldPriest.id
    };
  }, options || {});
}

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
        pop:p.pop,
        favorA:FB.realmOpinionOf(s, 'test_vassal_a'),
        favorB:FB.realmOpinionOf(s, 'test_vassal_b'),
        marker:p.capitalRelocation,
        turn:s.turn,
        incoming:p.guildMonopolies.incoming,
        friendRole:s.roles.friend,
        friendHome:s.chars[setup.friendId].homeProvinceId,
        newLord:s.roles.lord,
        newPriest:s.roles.priest,
        oldLordHome:s.chars[setup.oldLordId].homeProvinceId,
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
    expect(result.newPriest).not.toBe(ids.oldPriestId);
    expect(result.oldLordHome).toBe('london');
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
        pop:p.pop,
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
          pop:p.pop,
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
    await expect(page.locator('#gm-body')).toContainText(
      'from London to Canterbury');
    await expect(page.locator('#gm-body')).toContainText(
      'Popular opinion changes by -15');
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
