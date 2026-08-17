'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/events.js',
  'js/ui_modals.js',
  'data/events_tournament.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

/* Plan: docs/plans/political-choice-war-depth-and-life-paths.md, step 4 —
   bounded jousting tournaments (data/events_tournament.js). */

async function startTournamentGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    var s = FB.state;
    s.player.tier = 2;
    s.player.profession = 'noble';
    s.player.gold = 100;
    s.date.season = 0;
    var technology = FB.realmTechRecord(s);
    if (technology.completed.indexOf('cavalry_lances') < 0) {
      technology.completed.push('cavalry_lances');
    }
    if (technology.exposed.indexOf('cavalry_lances') < 0) {
      technology.exposed.push('cavalry_lances');
    }
    FB.ui.refresh();
  });
}

test('tournament invitations obey rank, season, and social gates',
  async function ({ page }, testInfo) {
    await startTournamentGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var gentry = FB.eventById('tournament_invitation');
      var landed = FB.eventById('tournament_invitation_lord');
      var out = { exists:!!gentry && !!landed };

      // gentry noble in spring: the invitation applies
      out.gentrySpring = FB.checkTrigger(s, gentry.trigger);
      out.landedBelowTier = FB.checkTrigger(s, landed.trigger);

      // tourneys wait for the dry roads
      s.date.season = 2;
      out.gentryAutumn = FB.checkTrigger(s, gentry.trigger);
      s.date.season = 3;
      out.gentryWinter = FB.checkTrigger(s, gentry.trigger);
      s.date.season = 0;

      // social context: a practicing craft is not the lists
      p.profession = 'craftsman';
      out.gentryCraftsman = FB.checkTrigger(s, gentry.trigger);
      p.profession = 'noble';

      // rank: below gentry, and above it
      p.tier = 1;
      out.commoner = FB.checkTrigger(s, gentry.trigger);
      p.tier = 3;
      out.gentryAboveTier = FB.checkTrigger(s, gentry.trigger);
      out.landedBaron = FB.checkTrigger(s, landed.trigger);
      p.tier = 7;
      out.landedEmperor = FB.checkTrigger(s, landed.trigger);
      s.date.season = 3;
      out.landedWinter = FB.checkTrigger(s, landed.trigger);
      return out;
    });

    expect(result.exists).toBe(true);
    expect(result.gentrySpring).toBe(true);
    expect(result.landedBelowTier).toBe(false);
    expect(result.gentryAutumn).toBe(false);
    expect(result.gentryWinter).toBe(false);
    expect(result.gentryCraftsman).toBe(false);
    expect(result.commoner).toBe(false);
    expect(result.gentryAboveTier).toBe(false);
    expect(result.landedBaron).toBe(true);
    expect(result.landedEmperor).toBe(true);
    expect(result.landedWinter).toBe(false);
  });

test('faith variants rephrase the ceremony and swap the wager for patronage',
  async function ({ page }, testInfo) {
    await startTournamentGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var me = s.chars[s.player.charId];
      var gentry = FB.eventById('tournament_invitation');
      function visibleCount() {
        return gentry.options.filter(function (o) {
          return FB.eventOptionStatus(s, gentry, o, {}).ready;
        }).length;
      }

      me.religion = 'catholic';
      var christian = {
        text:FB.eventText(s, me.id, gentry, 'text', {}),
        visible:visibleCount(),
        wager:FB.checkTrigger(s, gentry.options[2].require, {}),
        gift:FB.checkTrigger(s, gentry.options[3].require, {})
      };

      me.religion = 'sunni';
      var muslim = {
        text:FB.eventText(s, me.id, gentry, 'text', {}),
        visible:visibleCount(),
        wager:FB.checkTrigger(s, gentry.options[2].require, {}),
        gift:FB.checkTrigger(s, gentry.options[3].require, {})
      };
      me.religion = 'catholic';
      return { christian:christian, muslim:muslim };
    });

    expect(result.christian.text).toContain('tourney');
    expect(result.christian.wager).toBe(true);
    expect(result.christian.gift).toBe(false);
    expect(result.muslim.text).toContain('furusiyya');
    expect(result.muslim.wager).toBe(false);
    expect(result.muslim.gift).toBe(true);
    // no faith sees fewer choices
    expect(result.muslim.visible).toBe(result.christian.visible);
  });

test('the contests resolve through the existing battle chance and worn equipment',
  async function ({ page }, testInfo) {
    await startTournamentGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var me = s.chars[s.player.charId];
      var gentry = FB.eventById('tournament_invitation');
      var landed = FB.eventById('tournament_invitation_lord');
      var bare = FB.namedChance(s, gentry.options[0].chance);
      var jack = FB.grantItem(s, 'padded_jack', { quality:'plain' });
      FB.equipItem(s, me.id, 'body', jack);
      var equipped = FB.namedChance(s, gentry.options[0].chance);
      var marBefore = FB.skillOf(me, 'mar');
      return {
        gentryJoust:gentry.options[0].chance,
        gentryMelee:gentry.options[1].chance,
        landedJoust:landed.options[0].chance,
        landedMelee:landed.options[1].chance,
        bare:bare,
        equipped:equipped,
        itemBonus:FB.itemBonus(s, 'battle'),
        marBefore:marBefore,
        marAfter:FB.skillOf(me, 'mar')
      };
    });

    expect(result.gentryJoust).toBe('battle');
    expect(result.gentryMelee).toBe('battle');
    expect(result.landedJoust).toBe('battle');
    expect(result.landedMelee).toBe('battle');
    // worn battle gear feeds the same named chance the contest uses
    expect(result.itemBonus).toBeGreaterThan(0);
    expect(result.equipped).toBeCloseTo(result.bare + result.itemBonus, 5);
    // the jack carries no Martial: only the battle bonus moved
    expect(result.marAfter).toBe(result.marBefore);
  });

test('jousting is visibly gated while the melee and social fallbacks remain',
  async function ({ page }, testInfo) {
    await startTournamentGame(page, testInfo);
    var result = await page.evaluate(function () {
      var s = FB.state;
      var event = FB.eventById('tournament_invitation');
      var technology = FB.realmTechRecord(s);
      technology.completed = technology.completed.filter(function (id) {
        return id !== 'cavalry_lances';
      });
      var joust = FB.eventOptionStatus(s, event, event.options[0], {});
      var melee = FB.eventOptionStatus(s, event, event.options[1], {});
      var before = FB.save.serialize();
      var rngBefore = FB.getRngState();
      var receipt = FB.resolveEventOption(
        s, event, event.options[0], {}, { automated:false });
      var unchanged = before === FB.save.serialize() &&
        rngBefore === FB.getRngState();
      var baseline = JSON.parse(FB.save.serialize());
      var oldAuto = FB.game.auto;
      var originalResolve = FB.resolveEventOption;
      var autoresolvedIndex = null;
      FB.resolveEventOption = function (state, resolvedEvent, option, ctx, meta) {
        autoresolvedIndex = resolvedEvent.options.indexOf(option);
        return originalResolve(state, resolvedEvent, option, ctx, meta);
      };
      FB.game.auto = {
        all:true, minor:true, major:true, war:true, style:'first'
      };
      FB.ui.runEvents([{ id:event.id, ctx:{}, rnd:true }]);
      FB.resolveEventOption = originalResolve;
      FB.save.restore(JSON.parse(JSON.stringify(baseline)));
      FB.game.auto = oldAuto;
      return {
        joust:joust,
        melee:melee,
        receipt:receipt,
        autoresolvedIndex:autoresolvedIndex,
        unchanged:unchanged
      };
    });

    expect(result.joust).toMatchObject({
      visible:true,
      ready:false,
      techLocked:true,
      missingTech:['cavalry_lances']
    });
    expect(result.joust.reason).toContain('Couched Cavalry Lance');
    expect(result.melee.ready).toBe(true);
    expect(result.receipt).toBe(false);
    expect(result.autoresolvedIndex).toBe(1);
    expect(result.unchanged).toBe(true);

    await page.evaluate(function () {
      FB.ui.runEvents([{
        id:'tournament_invitation', ctx:{}, rnd:true
      }]);
    });
    var lockedJoust = page.locator('#ev-options .evopt', {
      hasText:'Ride in the joust'
    });
    await expect(lockedJoust).toBeVisible();
    await expect(lockedJoust).toBeDisabled();
    await expect(lockedJoust).toContainText('Requires Couched Cavalry Lance');
    await expect(lockedJoust).not.toContainText('Open the technology entry');
    await expect(page.locator('#ev-options .evopt', {
      hasText:'Fight in the melee'
    })).toBeEnabled();
  });

test('options with unmet purses stay hidden and cannot spend unavailable gold',
  async function ({ page }, testInfo) {
    await startTournamentGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var gentry = FB.eventById('tournament_invitation');
      // the same filter autoresolve uses before choosing
      function visible() {
        return gentry.options.filter(function (o) {
          return FB.eventOptionStatus(s, gentry, o, {}).ready;
        }).map(function (o) { return gentry.options.indexOf(o); });
      }
      p.gold = 0;
      var broke = visible();
      p.gold = 7;
      var seven = visible();
      p.gold = 100;
      var flush = visible();
      return { broke:broke, seven:seven, flush:flush };
    });

    // authored indices: 0 joust (10), 1 melee (free), 2 wager (5),
    // 3 muslim gift (hidden for a catholic), 4 stands, 5 regrets
    expect(result.broke).toEqual([1, 4, 5]);
    expect(result.seven).toEqual([1, 2, 4, 5]);
    expect(result.flush).toEqual([0, 1, 2, 4, 5]);
  });

test('victory, defeat, injury, prize, prestige, and Standing apply exactly once',
  async function ({ page }, testInfo) {
    await startTournamentGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      var gentry = FB.eventById('tournament_invitation');
      var joust = gentry.options[0];
      p.gold = 100;
      p.prestige = 50;
      me.health = 10;
      var lord = FB.getRole(s, 'lord', true);
      var target = { kind:'character', id:lord.id };
      var standing0 = FB.standingOf(s, target);

      // one joust entry: the purse leaves once, the prize arrives once
      FB.applyEffects(s, joust.effects, {}, gentry);
      FB.applyEffects(s, joust.success.effects, {}, gentry);
      var afterWin = {
        gold:p.gold,
        prestige:p.prestige,
        standing:FB.standingOf(s, target)
      };
      // a second application moves Standing by the same amount again:
      // no doubled or swallowed effect hides inside a single resolution
      FB.applyEffects(s, joust.success.effects, {}, gentry);
      var standingSecond = FB.standingOf(s, target);

      // one defeat: a wound and a little honor, exactly once
      var prestigeBeforeFall = p.prestige;
      var ailsBefore = (me.ails || []).length;
      FB.applyEffects(s, joust.failure.effects, {}, gentry);
      return {
        afterWin:afterWin,
        standing0:standing0,
        standingOnce:afterWin.standing - standing0,
        standingTwice:standingSecond - afterWin.standing,
        health:me.health,
        fallPrestige:p.prestige - prestigeBeforeFall,
        woundAdded:(me.ails || []).length - ailsBefore
      };
    });

    expect(result.afterWin.gold).toBe(110); // 100 - 10 entry + 20 purse
    expect(result.afterWin.prestige).toBe(65); // 50 + 15
    expect(result.standingOnce).toBeGreaterThanOrEqual(8);
    expect(result.standingTwice).toBe(result.standingOnce);
    expect(result.health).toBe(8); // -2 injury
    expect(result.fallPrestige).toBe(2);
    expect(result.woundAdded).toBe(1); // a named wound from the fall
  });

test('cooldowns keep tournaments as occasions, not routine income',
  async function ({ page }, testInfo) {
    await startTournamentGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var gentry = FB.eventById('tournament_invitation');
      var landed = FB.eventById('tournament_invitation_lord');
      FB.markFired(s, gentry);
      // the picker's own gate: excluded while under cooldown, then free
      var stamped = s.player.cooldowns[gentry.id];
      var excludedNow = s.turn - stamped < gentry.cooldown * 90;
      s.turn += gentry.cooldown * 90;
      var eligibleAgain = !(s.turn - s.player.cooldowns[gentry.id] <
        gentry.cooldown * 90);
      return {
        gentryCooldown:gentry.cooldown,
        landedCooldown:landed.cooldown,
        stamped:stamped !== undefined,
        excludedNow:excludedNow,
        eligibleAgain:eligibleAgain
      };
    });

    expect(result.gentryCooldown).toBe(12); // three years
    expect(result.landedCooldown).toBe(16); // four years
    expect(result.stamped).toBe(true);
    expect(result.excludedNow).toBe(true);
    expect(result.eligibleAgain).toBe(true);
  });

test('visible and autoresolved tournament choices use the same effects',
  async function ({ page }, testInfo) {
    await startTournamentGame(page, testInfo);
    const result = await page.evaluate(function () {
      var event = FB.eventById('tournament_invitation');
      var baseline = JSON.parse(FB.save.serialize());
      var oldAuto = FB.game.auto;
      function snapshot() {
        var s = FB.state;
        var me = s.chars[s.player.charId];
        return {
          gold:s.player.gold,
          prestige:s.player.prestige,
          health:me.health,
          mar:FB.skillOf(me, 'mar'),
          lord:!!s.roles.lord,
          standing:s.roles.lord ? FB.standingOf(s, {
            kind:'character', id:s.roles.lord
          }) : null
        };
      }

      FB.game.auto = {
        all:true, minor:true, major:true, war:true, style:'first'
      };
      FB.setRngState(97531);
      FB.ui.runEvents([{ id:event.id, ctx:{}, rnd:true }]);
      var automated = snapshot();

      FB.save.restore(baseline);
      FB.setRngState(97531);
      var s = FB.state;
      event = FB.eventById('tournament_invitation');
      var opts = event.options.filter(function (o) {
        return FB.eventOptionStatus(s, event, o, {}).ready;
      });
      var pick = opts[0];
      var p = FB.namedChance(s, pick.chance);
      var ok = FB.chance(p);
      FB.applyEffects(s, pick.effects, {}, event);
      var branch = ok ? pick.success : pick.failure;
      FB.applyEffects(s, branch.effects, {}, event);
      var visible = snapshot();
      FB.game.auto = oldAuto;
      return { automated:automated, visible:visible, won:ok };
    });

    expect(result.automated).toEqual(result.visible);
    expect(result.automated.lord).toBe(true);
    if (result.won) expect(result.automated.gold).toBe(110);
    else expect(result.automated.gold).toBe(90);
  });

test('opening an invitation spends nothing, and withdrawal only cools the host',
  async function ({ page }, testInfo) {
    await startTournamentGame(page, testInfo);
    const before = await page.evaluate(function () {
      var s = FB.state;
      s.player.prestige = 40;
      FB.ui.runEvents([{
        id:'tournament_invitation', ctx:{}, rnd:true
      }]);
      return {
        gold:s.player.gold,
        prestige:s.player.prestige,
        cooldown:s.player.cooldowns.tournament_invitation,
        turn:s.turn
      };
    });

    await expect(page.locator('#eventmodal:not(.hidden)')).toBeVisible();
    // a catholic player sees every option but the muslim host-gift
    await expect(page.locator('#ev-options .evopt')).toHaveCount(5);
    // the invitation itself bought nothing; only the cooldown is stamped
    var opened = await page.evaluate(function () {
      var s = FB.state;
      return {
        gold:s.player.gold,
        prestige:s.player.prestige,
        standing:s.roles.lord ? FB.standingOf(s, {
          kind:'character', id:s.roles.lord
        }) : null
      };
    });
    expect(opened.gold).toBe(before.gold);
    expect(opened.prestige).toBe(before.prestige);
    expect(before.cooldown).toBe(before.turn);
    expect(opened.standing).not.toBeNull(); // the named host is materialized

    // the last option sends regrets: no coin moves, the host cools a little
    await page.locator('#ev-options .evopt').last().click();
    await expect(page.locator('#eventmodal')).toHaveClass(/hidden/);
    const after = await page.evaluate(function () {
      var s = FB.state;
      return {
        gold:s.player.gold,
        prestige:s.player.prestige,
        standing:FB.standingOf(s, {
          kind:'character', id:s.roles.lord
        })
      };
    });
    expect(after.gold).toBe(before.gold);
    expect(after.prestige).toBe(before.prestige);
    expect(after.standing).toBe(opened.standing - 2);
  });
