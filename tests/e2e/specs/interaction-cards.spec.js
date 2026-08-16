'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame,
  waitForUiRefresh
} = require('../support/game');

async function startInteractionGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
}

async function ordinaryContact(page) {
  return page.evaluate(function () {
    var s = FB.state;
    var p = s.player;
    var me = s.chars[p.charId];
    var home = FB.world.byId[p.provinceId];
    FB.ensureItems(s);
    p.items = [];
    p.socialAttention = {};
    p.friendContacts = {};
    var c = FB.makeCharacter(s, {
      name:'Interaction Witness',
      sex:me.sex === 'm' ? 'f' : 'm',
      culture:home.culture,
      religion:home.religion,
      born:s.date.year - 27,
      station:Math.min(2, FB.playerStation(s) + 1),
      quality:2,
      traits:[],
      opinion:0
    });
    c.homeProvinceId = p.provinceId;
    p.friendContacts[c.id] = {
      startedTurn:s.turn,
      lastTurn:s.turn
    };
    return c.id;
  });
}

test('character cards use the shared grammar and authoritative blocked reasons',
  async function ({ page }, testInfo) {
    await startInteractionGame(page, testInfo);
    var cid = await ordinaryContact(page);
    var result = await page.evaluate(function (id) {
      var s = FB.state;
      var c = s.chars[id];
      function findAction(model, actionId) {
        return model.actions.filter(function (action) {
          return action.id === actionId;
        })[0];
      }
      var threshold = FB.relationshipOpinionThreshold();
      FB.adjustStanding(s, { kind:'character', id:id },
        threshold - 1 - FB.standingOf(s, {
          kind:'character', id:id
        }), 'test:friend_block');
      var ref = FB.grantItem(s, 'ash_spear', { quality:'plain' });
      s.player.loadouts = s.player.loadouts || {};
      s.player.loadouts[s.player.charId] = {
        leftHand:ref
      };
      s.player.gold = 0;
      var giftStatus = FB.characterGiftStatus(s, id);
      var itemStatus = FB.itemGiftStatus(
        s, ref, 'character', id);
      var itemMutationBlocked = !FB.giveItem(s, ref, id);
      var friendshipStatus = FB.friendshipStatus(s, c);
      var model = FB.ui.characterInteractionCard(s, id);
      var gift = model.actions.filter(function (action) {
        return action.id === 'gift.character';
      })[0];
      var friend = model.actions.filter(function (action) {
        return action.id === 'relationship.friend.name';
      })[0];
      var complete = model.actions.every(function (action) {
        return typeof action.id === 'string' &&
          typeof action.group === 'string' &&
          typeof action.label === 'string' &&
          typeof action.detail === 'string' &&
          typeof action.enabled === 'boolean' &&
          Object.prototype.hasOwnProperty.call(action, 'blockedReason') &&
          typeof action.consequence === 'string' &&
          typeof action.route === 'string';
      });
      s.player.gold = 50;
      s.player.loadouts[s.player.charId] = {};
      FB.adjustStanding(s, { kind:'character', id:id }, 1,
        'test:friend_ready');
      var ready = FB.ui.characterInteractionCard(s, id);
      var itemReady = FB.itemGiftStatus(
        s, ref, 'character', id).ready;
      FB.ui.showCharModal(id);
      return {
        target:model.target,
        complete:complete,
        gift:{
          enabled:gift.enabled,
          reason:gift.blockedReason,
          authority:giftStatus.reason
        },
        item:{
          ready:itemStatus.ready,
          reason:itemStatus.reason,
          mutationBlocked:itemMutationBlocked,
          readyAfterReturn:itemReady
        },
        friend:{
          enabled:friend.enabled,
          reason:friend.blockedReason,
          authority:friendshipStatus.reason
        },
        giftReady:ready.actions.filter(function (action) {
          return action.id === 'gift.character';
        })[0].enabled,
        friendReady:ready.actions.filter(function (action) {
          return action.id === 'relationship.friend.name';
        })[0].enabled
      };
    }, cid);

    expect(result.target).toEqual({ kind:'character', id:cid });
    expect(result.complete).toBe(true);
    expect(result.gift.enabled).toBe(false);
    expect(result.gift.reason).toBe(result.gift.authority);
    expect(result.item.ready).toBe(false);
    expect(result.item.reason).toContain('armory');
    expect(result.item.mutationBlocked).toBe(true);
    expect(result.item.readyAfterReturn).toBe(true);
    expect(result.friend.enabled).toBe(false);
    expect(result.friend.reason).toBe(result.friend.authority);
    expect(result.giftReady).toBe(true);
    expect(result.friendReady).toBe(true);

    var groups = await page.locator(
      '.interaction-action-group').evaluateAll(function (nodes) {
      return nodes.map(function (node) {
        return node.dataset.interactionGroup;
      });
    });
    var order = [
      'relationship', 'gift', 'travel', 'diplomacy',
      'feudal', 'war', 'management'
    ];
    expect(groups).toEqual(groups.slice().sort(function (a, b) {
      return order.indexOf(a) - order.indexOf(b);
    }));
    await expect(page.locator(
      '[data-interaction-action="gift.character"]')).toContainText(
      'Offer a gift');
    await expect(page.locator(
      '[data-interaction-action="gift.character"]')).toHaveAttribute(
      'aria-label', /Standing/);
    await expect(page.locator(
      '.character-interaction-modal [data-character-home]')).toHaveCount(1);

    var blockedRow = await page.evaluate(function () {
      return FB.ui.interactionActionRow({
        id:'test.blocked', label:'Unavailable test',
        detail:'Normal helper text.', enabled:false,
        blockedReason:'A blocking reason.',
        consequence:'Normal consequence text.'
      });
    });
    expect(blockedRow).toContain('Unavailable: A blocking reason.');
    expect(blockedRow).not.toContain('Normal helper text.');
    expect(blockedRow).not.toContain('Normal consequence text.');
  });

test('personal attention, courtship, friendship, and rivalry variants stay distinct',
  async function ({ page }, testInfo) {
    await startInteractionGame(page, testInfo);
    var cid = await ordinaryContact(page);
    var result = await page.evaluate(function (id) {
      var s = FB.state;
      var c = s.chars[id];
      function findAction(model, actionId) {
        return model.actions.filter(function (action) {
          return action.id === actionId;
        })[0];
      }
      var threshold = FB.relationshipOpinionThreshold();
      s.player.socialAttention[id] = {
        startedTurn:s.turn,
        lastTurn:s.turn
      };
      s.player.courtingId = id;
      s.player.flags.courting = 1;
      FB.adjustStanding(s, { kind:'character', id:id },
        threshold - FB.standingOf(s, {
          kind:'character', id:id
        }), 'test:proposal_ready');
      var courtship = FB.ui.characterInteractionCard(s, id);
      var proposal = findAction(courtship, 'relationship.proposal');
      var proposalAuthority = FB.proposalStatus(s, c).ready;
      var stop = findAction(courtship, 'relationship.attention.stop');

      FB.clearCourtship(s);
      s.player.socialAttention = {};
      FB.startRivalry(s, c, 'player', 'test', null);
      var rivalry = FB.ui.characterInteractionCard(s, id);
      c.spouseId = s.player.charId;
      var spouseContext = FB.ui.characterInteractionCard(s, id).context.filter(
        function (row) {
          return row.label === FB.T('Relationship');
        })[0].value;
      c.spouseId = null;
      return {
        commitments:courtship.commitments.map(function (item) {
          return item.id;
        }),
        proposalReady:proposal && proposal.enabled,
        proposalAuthority:proposalAuthority,
        attentionStopEnabled:stop && stop.enabled,
        rivalCommitment:rivalry.commitments.some(function (item) {
          return item.id === 'rivalry';
        }),
        settlement:!!findAction(rivalry, 'relationship.rival.settle'),
        insult:!!findAction(rivalry, 'relationship.hostility.insult'),
        spouseContext:spouseContext
      };
    }, cid);

    expect(result.commitments).toEqual(expect.arrayContaining([
      'personal-attention', 'courtship'
    ]));
    expect(result.proposalReady).toBe(true);
    expect(result.proposalAuthority).toBe(true);
    expect(result.attentionStopEnabled).toBe(false);
    expect(result.rivalCommitment).toBe(true);
    expect(result.settlement).toBe(true);
    expect(result.insult).toBe(true);
    expect(result.spouseContext).toBe('Your spouse');
  });

test('realm cards distinguish lieges, vassals, neighbors, allies, and war enemies',
  async function ({ page }, testInfo) {
    await startInteractionGame(page, testInfo);
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var homeId = p.provinceId;
      var home = FB.world.byId[homeId];
      var ids = Object.keys(s.realms).filter(function (id) {
        return id !== 'player' && s.realms[id] &&
          s.realms[id].alive && s.realms[id].ruler;
      });
      var liegeId = ids[0];
      p.liege = liegeId;
      var liegeModel = FB.ui.realmInteractionCard(s, liegeId);

      var vassalId = 'interaction_vassal';
      s.realms[vassalId] = {
        id:vassalId,
        name:'Test March',
        color:'#765432',
        capital:homeId,
        aggression:0,
        rank:1,
        liege:'player',
        alive:true,
        favor:0,
        ruler:{
          name:'Marcher Witness',
          sex:'m',
          culture:home.culture,
          age:38,
          mar:6,
          trait:'patient',
          generation:1
        }
      };
      p.liegeOps = p.liegeOps || {};
      FB.setRealmRulerStanding(s, vassalId, 45);
      FB.invalidateRealmCache();
      var vassalModel = FB.ui.realmInteractionCard(s, vassalId);

      p.liege = null;
      p.tier = 6;
      p.provs = [homeId];
      s.owner[homeId] = 'player';
      s.holder[homeId] = 'player';
      FB.foundPlayerRealm(s);
      s.realms.player.alive = true;
      s.realms.player.rank = 3;
      s.realms.player.capital = homeId;
      s.realms.player.liege = null;
      var neighborId = ids.filter(function (id) {
        return id !== liegeId;
      })[0] || liegeId;
      s.realms[neighborId].liege = null;
      Object.keys(s.realms).forEach(function (id) {
        if (s.realms[id]) s.realms[id].war = null;
      });
      var adjacent = Object.keys(FB.world.adj[homeId] || {})[0];
      if (adjacent) {
        s.owner[adjacent] = neighborId;
        s.holder[adjacent] = neighborId;
      }
      s.realms[neighborId].rank = 3;
      FB.setRealmRulerStanding(s, neighborId, 60);
      p.war = null;
      s.alliances = [];
      s.pacts = s.pacts || {};
      delete s.pacts[neighborId];
      FB.invalidateRealmCache();
      var neighborModel = FB.ui.realmInteractionCard(s, neighborId);

      p.gold = 100;
      var originalChance = FB.chance;
      FB.chance = function () { return false; };
      var goldBeforeOffer = p.gold;
      var rejectedOfferExecuted = FB.offerAlliance(s, neighborId);
      FB.chance = originalChance;
      var rejectedOfferSpent = goldBeforeOffer - p.gold;
      var rejectedOfferFormedAlliance = !!FB.allianceSnapshot(
        s, 'player');

      FB.formAlliance(s, 'player', neighborId, 'envoy');
      var allyModel = FB.ui.realmInteractionCard(s, neighborId);
      s.player.war = { enemy:neighborId };
      var warModel = FB.ui.realmInteractionCard(s, neighborId);
      function relationship(model) {
        return model.context.filter(function (row) {
          return row.label === FB.T('Political relationship');
        })[0].value;
      }
      return {
        liege:relationship(liegeModel),
        vassal:relationship(vassalModel),
        neighbor:relationship(neighborModel),
        ally:relationship(allyModel),
        war:relationship(warModel),
        vassalFeudal:vassalModel.actions.some(function (action) {
          return action.group === 'feudal';
        }),
        allyCommitment:allyModel.commitments.some(function (item) {
          return item.id === 'alliance';
        }),
        warCommitment:warModel.commitments.some(function (item) {
          return item.id === 'war';
        }),
        rejectedOfferExecuted:rejectedOfferExecuted,
        rejectedOfferSpent:rejectedOfferSpent,
        rejectedOfferFormedAlliance:rejectedOfferFormedAlliance
      };
    });

    expect(result).toEqual({
      liege:'Direct liege',
      vassal:'Direct vassal',
      neighbor:'Neighboring sovereign',
      ally:'Defensive ally',
      war:'War enemy',
      vassalFeudal:true,
      allyCommitment:true,
      warCommitment:true,
      rejectedOfferExecuted:true,
      rejectedOfferSpent:25,
      rejectedOfferFormedAlliance:false
    });
  });

test('materialized rulers share Standing, keep one gift path, and render without mutation',
  async function ({ page }, testInfo) {
    await startInteractionGame(page, testInfo);
    var result = await page.evaluate(function () {
      var s = FB.state;
      FB.ensureItems(s);
      FB.socialAttentionEnsure(s);
      var rid = Object.keys(s.realms).filter(function (id) {
        return id !== 'player' && s.realms[id] &&
          s.realms[id].alive && s.realms[id].ruler;
      })[0];
      FB.ensureRealmSuccession(s, rid);
      var ruler = FB.materializeRealmRuler(s, rid);
      FB.ensureRealmCourtForDisplay(s, rid);
      FB.adjustStanding(s, { kind:'realm', id:rid },
        47 - FB.standingOf(s, { kind:'realm', id:rid }),
        'test:shared_card_standing');
      ruler.opinion = 52;
      ruler.spouseId = 'missing-spouse';
      delete s.player.socialGiftTurns;
      delete s.player.realmGiftTurns;
      delete s.player.giftDeliveries;
      delete s.player.foreignPolicy;
      delete s.player.cooldowns;
      delete s.player.travel;
      delete s.player.travelSettlement;
      delete s.player.travelHistory;
      delete s.player.householdStandards;
      FB.save.serialize();
      delete s.religiousHeads;
      var before = JSON.stringify(s);
      var rng = FB.getRngState();
      var uid = FB.getUidCounter();
      var legacyRenderState = JSON.parse(JSON.stringify(s));
      delete legacyRenderState.player.loadouts;
      delete legacyRenderState.itemInstances;
      delete legacyRenderState.itemNextId;
      delete legacyRenderState.player.itemMigration;
      var portraitBefore = JSON.stringify(legacyRenderState);
      var liveState = FB.state;
      var canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 72;
      try {
        FB.state = legacyRenderState;
        FB.ui.charCardHtml(legacyRenderState,
          legacyRenderState.chars[ruler.id], false, true);
        FB.ui.realmInteractionCard(legacyRenderState, rid);
      } finally {
        FB.state = liveState;
      }
      FB.paintPortrait(canvas, ruler, legacyRenderState.date.year, {
        state:legacyRenderState
      });
      var portraitStateSame =
        portraitBefore === JSON.stringify(legacyRenderState);
      FB.ui.showLiegeModal(rid);
      FB.ui.showCharModal(ruler.id);
      var realm = FB.ui.realmInteractionCard(s, rid);
      var character = FB.ui.characterInteractionCard(s, ruler.id);
      /* On mismatch, name the mutated top-level keys and show the first
         divergence so the failure report identifies the writer directly. */
      var after = JSON.stringify(s);
      var stateChangedKeys = [];
      var stateFirstDiff = null;
      if (after !== before) {
        var beforeObj = JSON.parse(before);
        var keys = {};
        Object.keys(beforeObj).concat(Object.keys(s)).forEach(function (k) {
          keys[k] = 1;
        });
        Object.keys(keys).forEach(function (k) {
          if (JSON.stringify(beforeObj[k]) !== JSON.stringify(s[k])) {
            stateChangedKeys.push(k);
          }
        });
        var at = 0;
        while (at < before.length && before[at] === after[at]) at++;
        stateFirstDiff = {
          at:at,
          before:before.slice(Math.max(0, at - 60), at + 120),
          after:after.slice(Math.max(0, at - 60), at + 120)
        };
      }
      return {
        rid:rid,
        cid:ruler.id,
        realmStanding:realm.standing.value,
        characterStanding:character.standing.value,
        realmGift:realm.actions.filter(function (action) {
          return action.id === 'gift.ruler';
        }).length,
        characterGift:character.actions.filter(function (action) {
          return action.group === 'gift';
        }).length,
        separateRealmAction:character.actions.some(function (action) {
          return action.id === 'management.realm-court';
        }),
        separateCharacterAction:realm.actions.some(function (action) {
          return action.id === 'management.personal-character';
        }),
        mergedRealmGift:character.actions.some(function (action) {
          return action.id === 'gift.ruler';
        }),
        portraitStateSame:portraitStateSame,
        stateChangedKeys:stateChangedKeys,
        stateFirstDiff:stateFirstDiff,
        stateSame:before === after,
        rngSame:rng === FB.getRngState(),
        uidSame:uid === FB.getUidCounter()
      };
    });

    expect(result.realmStanding).toBe(52);
    expect(result.characterStanding).toBe(52);
    expect(result.realmGift).toBe(1);
    expect(result.characterGift).toBe(1);
    expect(result.separateRealmAction).toBe(false);
    expect(result.separateCharacterAction).toBe(false);
    expect(result.mergedRealmGift).toBe(true);
    expect(result.portraitStateSame).toBe(true);
    expect(result.stateChangedKeys).toEqual([]);
    expect(result.stateFirstDiff).toBeNull();
    expect(result.stateSame).toBe(true);
    expect(result.rngSame).toBe(true);
    expect(result.uidSame).toBe(true);
  });

test('ruler character sheets foreground the titled ruler and linked court',
  async function ({ page }, testInfo) {
    await startInteractionGame(page, testInfo);
    var setup = await page.evaluate(function () {
      var s = FB.state;
      var rid = null;
      Object.keys(s.realms).some(function (id) {
        var realm = s.realms[id];
        if (id === 'player' || !realm || !realm.alive || !realm.ruler) {
          return false;
        }
        FB.ensureRealmCourtForDisplay(s, id);
        var consort = FB.realmConsortCharacter(s, id);
        var family = FB.realmFamilySnapshot(s, id).filter(function (member) {
          return member.charId && s.chars[member.charId] &&
            !s.chars[member.charId].dead;
        });
        var succession = s.realms[id].succession;
        var heir = family.filter(function (member) {
          return succession && succession.heirId === member.id;
        })[0];
        if (!consort || !family.length || !heir) return false;
        rid = id;
        return true;
      });
      if (!rid) throw new Error('Expected a materialized royal household.');
      FB.ui.showLiegeModal(rid);
      var realm = s.realms[rid];
      var ruler = FB.realmRulerCharacterSnapshot(s, rid);
      var consort = FB.realmConsortCharacter(s, rid);
      var childIds = FB.realmFamilySnapshot(s, rid).map(function (member) {
        return member.charId;
      }).filter(function (id) { return !!id; });
      var child = s.chars[childIds[0]];
      return {
        rid:rid,
        rulerId:ruler.id,
        rulerName:FB.fullName(ruler),
        consortId:consort.id,
        consortHome:FB.homeOf(s, consort),
        childIds:childIds,
        childTitledName:FB.T('{title} {name}', {
          title:FB.realmFamilyTitle(s, realm, child, 'child'), name:child.name
        }),
        titledName:FB.T('{title} {name}', {
          title:FB.realmRankTitle(s, realm), name:FB.fullName(ruler)
        }),
        home:FB.homeOf(s, ruler)
      };
    });
    await waitForUiRefresh(page);

    var sheet = page.locator('.character-interaction-modal');
    await expect(sheet.locator('.realm-ruler-card .ccname')).toContainText(
      setup.titledName);
    await expect(sheet.locator('.realm-ruler-card')).toHaveCount(1);
    await expect(sheet.locator('.realm-heir-chip')).toHaveCount(1);
    await expect(sheet.locator('.interaction-context')).toHaveCount(0);
    await expect(sheet.locator('.realm-ruler-card .character-skills-guide'))
      .toHaveAttribute('aria-label', 'What do these skills affect?');
    expect(await sheet.locator('.realm-ruler-card .ccskills').evaluate(
      function (line) { return parseFloat(getComputedStyle(line).fontSize); }
    )).toBeGreaterThan(12);

    await sheet.locator('.realm-ruler-card .character-skills-guide').click();
    await expect(page.locator('#guide-category')).toHaveValue('skills');
    await page.locator('#guide-close').click();
    await expect(sheet).toBeVisible();

    await page.evaluate(function () {
      FB.map._rulerPortraitCenterOriginal = FB.map.centerOn;
      FB.map.centerOn = function (pid) {
        FB.map._lastRulerPortraitCenter = pid;
        return FB.map._rulerPortraitCenterOriginal.apply(this, arguments);
      };
    });
    await sheet.locator('[data-character-home]').click();
    expect(await page.evaluate(function () {
      var centered = FB.map._lastRulerPortraitCenter;
      FB.map.centerOn = FB.map._rulerPortraitCenterOriginal;
      delete FB.map._rulerPortraitCenterOriginal;
      delete FB.map._lastRulerPortraitCenter;
      return centered;
    })).toBe(setup.home);

    var familyButton = sheet.locator('[data-realm-family-cid="' +
      setup.consortId + '"]');
    await expect(familyButton).toBeVisible();
    var familyName = await familyButton.getAttribute('title');
    await familyButton.click();
    var familySheet = page.locator('.character-interaction-modal');
    await expect(familySheet).toBeVisible();
    await expect(page.locator('#gm-title')).toContainText(familyName);
    await expect(familySheet.locator('.interaction-context')).toHaveCount(0);
    await expect(familySheet.locator('.court-strip')).toBeVisible();
    await expect(familySheet.locator('#cm-close')).toHaveText('Close');
    await expect(familySheet.locator('.charcard .ccname')).toContainText(familyName);
    await expect(familySheet.locator('[data-realm-family-cid="' +
      setup.childIds[0] + '"] .fname')).toContainText(setup.childTitledName);
    for (var i = 0; i < setup.childIds.length; i++) {
      await expect(familySheet.locator('[data-realm-family-cid="' +
        setup.childIds[i] + '"]')).toBeVisible();
    }

    await page.evaluate(function () {
      FB.map._familyPortraitCenterOriginal = FB.map.centerOn;
      FB.map.centerOn = function (pid) {
        FB.map._lastFamilyPortraitCenter = pid;
        return FB.map._familyPortraitCenterOriginal.apply(this, arguments);
      };
    });
    await familySheet.locator('[data-character-home]').click();
    expect(await page.evaluate(function () {
      var centered = FB.map._lastFamilyPortraitCenter;
      FB.map.centerOn = FB.map._familyPortraitCenterOriginal;
      delete FB.map._familyPortraitCenterOriginal;
      delete FB.map._lastFamilyPortraitCenter;
      return centered;
    })).toBe(setup.consortHome);

    await familySheet.locator('[data-realm-family-cid="' +
      setup.rulerId + '"]').click();
    await expect(page.locator('#gm-title')).toContainText(setup.rulerName);
    await expect(familySheet.locator('.realm-ruler-card')).toHaveCount(1);
    await expect(familySheet.locator('.interaction-context')).toHaveCount(0);
    await expect(familySheet.locator('#cm-close')).toHaveText('Close');
    await page.locator('#cm-close').click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);

    await page.evaluate(function (cid) {
      FB.ui.showCharModal(cid);
    }, setup.consortId);
    await expect(page.locator(
      '.character-interaction-modal .interaction-context')).toHaveCount(0);
    await page.locator('#cm-close').click();
  });

test('cards preserve modal origins and remain keyboard-safe on a narrow screen',
  async function ({ page }, testInfo) {
    await page.setViewportSize({ width:390, height:740 });
    await startInteractionGame(page, testInfo);
    var setup = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var homeId = p.provinceId;
      var home = FB.world.byId[homeId];
      var rid = 'interaction_officer';
      p.tier = 6;
      p.provs = [homeId];
      p.liege = null;
      s.owner[homeId] = 'player';
      s.holder[homeId] = 'player';
      FB.foundPlayerRealm(s);
      s.realms.player.rank = 3;
      s.realms.player.liege = null;
      s.realms[rid] = {
        id:rid,
        name:'Narrow March',
        color:'#654321',
        capital:homeId,
        aggression:0,
        rank:1,
        liege:'player',
        alive:true,
        favor:0,
        ruler:{
          name:'Narrow Witness',
          sex:'m',
          culture:home.culture,
          age:41,
          mar:7,
          trait:'patient',
          generation:1
        }
      };
      p.liegeOps = p.liegeOps || {};
      FB.setRealmRulerStanding(s, rid, 42);
      s.council = {
        authority:55,
        seats:{
          seneschal:rid,
          constable:null,
          treasurer:null,
          almoner:null,
          chamberlain:null
        }
      };
      FB.invalidateRealmCache();
      FB.ui.showCouncil();
      return { rid:rid };
    });

    await page.locator('[data-council-realm]').click();
    await expect(page.locator(
      '.character-interaction-modal .interaction-card')).toBeVisible();
    await page.locator('#cm-close').click();
    await expect(page.getByRole('heading', {
      name:'The Royal Council', exact:true
    })).toBeVisible();

    var rulerId = await page.evaluate(function (ids) {
      var ruler = FB.materializeRealmRuler(FB.state, ids.rid);
      FB.ui.showLiegeModal(ids.rid);
      return ruler.id;
    }, setup);
    await expect(page.locator(
      '.character-interaction-modal .interaction-card')).toBeVisible();
    await expect(page.getByRole('heading', {
      name:/Narrow Witness/
    })).toBeVisible();
    await expect(page.locator(
      '[data-interaction-action="relationship.hostility.insult"]')).toBeVisible();
    await expect(page.locator(
      '[data-interaction-action="feudal.council"]')).toBeVisible();
    expect(rulerId).toBeTruthy();

    await page.locator(
      '[data-interaction-action="feudal.council"]').click();
    await expect(page.getByRole('heading', {
      name:'The Royal Council', exact:true
    })).toBeVisible();
    await page.locator('#gm-cancel').click();
    await expect(page.locator(
      '.character-interaction-modal .interaction-card')).toBeVisible();

    await page.evaluate(function (ids) {
      FB.ui.showLiegeModal(ids.rid, {
        view:'governance',
        section:'vassals'
      });
    }, setup);
    await page.locator('#cm-close').click();
    await expect(page.getByRole('heading', {
      name:'🏛 Governance', exact:true
    })).toBeVisible();

    await page.evaluate(function (ids) {
      FB.ui.showLiegeModal(ids.rid);
    }, setup);
    var geometry = await page.locator(
      '.character-interaction-modal .modalcard').evaluate(function (card) {
      var rect = card.getBoundingClientRect();
      var actions = Array.prototype.slice.call(
        card.querySelectorAll('[data-interaction-action]'));
      return {
        left:rect.left,
        right:rect.right,
        top:rect.top,
        bottom:rect.bottom,
        viewportWidth:window.innerWidth,
        viewportHeight:window.innerHeight,
        nativeButtons:actions.every(function (button) {
          return button.tagName === 'BUTTON';
        }),
        named:actions.every(function (button) {
          return !!button.getAttribute('aria-label');
        }),
        scrollWidth:document.getElementById('gm-body').scrollWidth,
        clientWidth:document.getElementById('gm-body').clientWidth
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    expect(geometry.top).toBeGreaterThanOrEqual(0);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
    expect(geometry.nativeButtons).toBe(true);
    expect(geometry.named).toBe(true);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(
      geometry.clientWidth + 1);
    await page.keyboard.press('Tab');
    await expect.poll(function () {
      return page.evaluate(function () {
        return document.activeElement &&
          document.getElementById('gm-body').contains(
            document.activeElement);
      });
    }).toBe(true);

    await page.locator('#cm-close').click();
    await page.evaluate(function (ids) {
      FB.ui.showTab('network', { history:false });
      FB.ui.showLiegeModal(ids.rid);
    }, setup);
    await page.locator('#cm-close').click();
    await expect(page.locator(
      '#sidetabs .tab[data-tab="network"]')).toHaveClass(/active/);

    await page.evaluate(function (id) {
      FB.ui.showTab('prov', { history:false });
      FB.ui.showCharModal(id);
    }, rulerId);
    await page.locator('#cm-close').click();
    await expect(page.locator(
      '#sidetabs .tab[data-tab="prov"]')).toHaveClass(/active/);

    await page.evaluate(function (ids) {
      FB.ui.showTab('actions', { history:false });
      FB.ui.showLiegeModal(ids.rid);
    }, setup);
    await page.locator('#cm-close').click();
    await expect(page.locator(
      '#sidetabs .tab[data-tab="actions"]')).toHaveClass(/active/);

    await page.evaluate(function (ids) {
      var s = FB.state;
      var p = s.player;
      p.tier = 4;
      p.provs = [];
      p.liege = ids.rid;
      if (s.realms.player) s.realms.player.alive = false;
      s.realms[ids.rid].liege = null;
      s.realms[ids.rid].obl = {
        aid:0.25,
        scutage:false,
        lastMotion:null
      };
      FB.invalidateRealmCache();
      FB.ui.showParliament();
    }, setup);
    await page.locator('#estates-liege-card').click();
    await expect(page.locator(
      '.character-interaction-modal .interaction-card')).toBeVisible();
    await page.locator('#cm-close').click();
    await expect(page.getByRole('heading', {
      name:'The Estates', exact:true
    })).toBeVisible();
  });
