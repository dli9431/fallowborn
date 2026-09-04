'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html',
  'data/events_settlements.js',
  'data/settlements.js',
  'data/technology.js',
  'js/util.js',
  'js/model.js',
  'js/world.js',
  'js/holywar.js',
  'js/papacy.js',
  'js/settlement.js',
  'js/travel.js',
  'js/localfolk.js',
  'js/events.js',
  'js/economy.js',
  'js/main.js',
  'js/keys.js',
  'js/ui_misc.js',
  'js/ui_panels.js',
  'js/ui_modals.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('local households are bounded, linked, deterministic, and RNG-isolated',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const pid = s.player.provinceId;
      const first = s.localFolk[pid];
      const people = FB.localFolkAt(s, pid);
      const snapshot = people.map(function (c) {
        return {
          id:c.id, name:c.name, dyn:c.dyn, born:c.born, sex:c.sex,
          station:FB.stationOf(c), fatherId:c.fatherId,
          motherId:c.motherId, spouseId:c.spouseId,
          childrenIds:(c.childrenIds || []).slice(),
          settlement:c.localFolk.settlement,
          role:c.localFolk.role,
          profession:c.career && c.career.profession
        };
      });
      const ids = people.map(function (c) { return c.id; });
      ids.forEach(function (id) { delete s.chars[id]; });
      delete s.localFolk[pid];
      const before = FB.getRngState();
      FB.localFolkEnsure(s, pid);
      const after = FB.getRngState();
      const rebuilt = FB.localFolkAt(s, pid).map(function (c) {
        return {
          id:c.id, name:c.name, dyn:c.dyn, born:c.born, sex:c.sex,
          station:FB.stationOf(c), fatherId:c.fatherId,
          motherId:c.motherId, spouseId:c.spouseId,
          childrenIds:(c.childrenIds || []).slice(),
          settlement:c.localFolk.settlement,
          role:c.localFolk.role,
          profession:c.career && c.career.profession
        };
      });
      const adults = rebuilt.filter(function (c) {
        return s.date.year - c.born >= 16;
      });
      const children = rebuilt.filter(function (c) {
        return s.date.year - c.born < 16;
      });
      const linkedChildren = rebuilt.filter(function (c) {
        return c.role === 'child';
      }).every(function (c) {
        const father = s.chars[c.fatherId];
        const mother = s.chars[c.motherId];
        return !!(father && mother &&
          father.childrenIds.indexOf(c.id) >= 0 &&
          mother.childrenIds.indexOf(c.id) >= 0);
      });
      const couplesLinked = s.localFolk[pid].households.slice(0, 2)
        .every(function (household) {
          const members = household.memberIds.map(function (id) {
            return s.chars[id];
          });
          const father = members[0], mother = members[1];
          return father.spouseId === mother.id && mother.spouseId === father.id;
        });
      const agingChild = FB.localFolkAt(s, pid).filter(function (c) {
        return c.localFolk.role === 'child';
      })[0];
      agingChild.born = s.date.year - 16;
      FB.localFolkYear(s);
      return {
        householdCount:first.households.length,
        peopleCount:rebuilt.length,
        adultCount:adults.length,
        childCount:children.length,
        stationBounds:rebuilt.every(function (c) {
          return c.station >= 0 && c.station <= 2;
        }),
        linkedChildren:linkedChildren,
        couplesLinked:couplesLinked,
        agedUp:agingChild.localFolk.role === 'adult' &&
          agingChild.career.rank === 'journeyman' && agingChild.career.chosen,
        deterministic:JSON.stringify(snapshot) === JSON.stringify(rebuilt),
        rngUnchanged:before === after
      };
    });

    expect(result).toEqual({
      householdCount:3,
      peopleCount:expect.any(Number),
      adultCount:expect.any(Number),
      childCount:expect.any(Number),
      stationBounds:true,
      linkedChildren:true,
      couplesLinked:true,
      agedUp:true,
      deterministic:true,
      rngUnchanged:true
    });
    expect(result.peopleCount).toBeGreaterThanOrEqual(7);
    expect(result.peopleCount).toBeLessThanOrEqual(10);
    expect(result.adultCount).toBeGreaterThanOrEqual(5);
    expect(result.adultCount).toBeLessThanOrEqual(6);
    expect(result.childCount).toBeGreaterThanOrEqual(2);
    expect(result.childCount).toBeLessThanOrEqual(4);
  });

test('activities introduce exact adults and unlock the standard relationship card',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const adult = FB.localFolkCurrent(s).filter(function (c) {
        return FB.ageOf(c, s.date.year) >= 16;
      })[0];
      const before = FB.ui.characterInteractionCard(s, adult.id);
      const queued = FB.beginLocalFolkActivity(s, adult.id, 'commons');
      const item = s.eventQueue.pop();
      const event = FB.eventById(item.id);
      const receipt = FB.resolveEventOption(s, event, event.options[0], item.ctx, {
        automated:false
      });
      const after = FB.ui.characterInteractionCard(s, adult.id);
      const contact = s.player.friendContacts[adult.id];
      const initiallyCultivated = contact.cultivated;
      const cooldown = FB.localFolkActivityStatus(s, adult.id, 'work');
      const cultivated = FB.socialAttentionAssign(s, adult);
      return {
        id:adult.id,
        beforeActions:before.actions.length,
        queued:queued,
        eventId:event.id,
        exactParticipant:item.ctx.participants.resident,
        receipt:!!receipt,
        afterActions:after.actions.map(function (action) { return action.route; }),
        contactSource:contact.source,
        initiallyCultivated:initiallyCultivated,
        cooldown:cooldown.remaining,
        cultivated:cultivated,
        cultivatedAfter:s.player.friendContacts[adult.id].cultivated
      };
    });

    expect(result.beforeActions).toBe(0);
    expect(result.queued).toBe(true);
    expect(result.eventId).toBe('local_folk_commons');
    expect(result.exactParticipant).toBe(result.id);
    expect(result.receipt).toBe(true);
    expect(result.afterActions).toContain('attention-assign');
    expect(result.afterActions).toContain('character-gift');
    expect(result.contactSource).toBe('local_folk');
    expect(result.initiallyCultivated).toBe(false);
    expect(result.cooldown).toBe(30);
    expect(result.cultivated).toBe(true);
    expect(result.cultivatedAfter).toBe(true);
    await page.evaluate(function (id) { FB.ui.showCharModal(id); }, result.id);
    await expect(page.locator('.local-folk-household-card')).toBeVisible();
    await expect(page.locator('[data-local-folk-venue]')).toHaveCount(4);
  });

test('Network and settlement sheets share the same nearby people without remote generation',
  async function ({ page }) {
    const home = await page.evaluate(function () {
      return FB.state.player.provinceId;
    });
    await page.locator('#lefttabs .tab[data-tab="network"]').click();
    await page.keyboard.press('Digit6');
    await expect(page.locator('[data-list-section="local-folk"]')).toBeVisible();
    await expect(page.locator(
      '[data-list-section="local-folk"] .large-list-target-button')).toHaveCount(
      await page.evaluate(function () { return FB.localFolkCurrent(FB.state).length; })
    );
    await expect(page.locator('[data-list-toggle="local-folk"]'))
      .toHaveAttribute('aria-current', 'true');

    const expectedHeadIds = await page.evaluate(function (pid) {
      return FB.localFolkAt(FB.state, pid, 0).map(function (c) { return c.id; });
    }, home);
    await page.evaluate(function (pid) { FB.ui.showSettlement(pid, 0); }, home);
    await expect(page.locator('#gm-body .panelh', { hasText:'People here' }))
      .toBeVisible();
    const shownIds = await page.locator('[data-settlement-folk]')
      .evaluateAll(function (buttons) {
        return buttons.map(function (button) {
          return button.getAttribute('data-settlement-folk');
        });
      });
    expect(shownIds.sort()).toEqual(expectedHeadIds.sort());
    await expect.poll(function () {
      return page.locator('[data-settlement-folk] canvas.pface').evaluateAll(
        function (canvases) {
          return canvases.length > 0 && canvases.every(function (canvas) {
            const pixels = canvas.getContext('2d').getImageData(
              0, 0, canvas.width, canvas.height).data;
            for (let i = 3; i < pixels.length; i += 4) {
              if (pixels[i]) return true;
            }
            return false;
          });
        });
    }).toBe(true);

    await page.setViewportSize({ width:390, height:740 });
    const folkLayout = await page.locator('[data-settlement-folk]').first()
      .evaluate(function (button) {
        const face = button.querySelector('.pface').getBoundingClientRect();
        const copyElement = button.querySelector('.large-list-row-copy');
        const copy = copyElement.getBoundingClientRect();
        const name = button.querySelector('.cname').getBoundingClientRect();
        const meta = button.querySelector('.cmeta').getBoundingClientRect();
        const style = getComputedStyle(copyElement);
        return {
          display:style.display,
          direction:style.flexDirection,
          textAlign:style.textAlign,
          faceCopyTop:Math.abs(face.top - copy.top),
          copyGap:copy.left - face.right,
          lineLeft:Math.abs(name.left - meta.left),
          overflow:button.scrollWidth - button.clientWidth
        };
      });
    expect(folkLayout.display).toBe('flex');
    expect(folkLayout.direction).toBe('column');
    expect(folkLayout.textAlign).toBe('left');
    expect(folkLayout.faceCopyTop).toBeLessThanOrEqual(1);
    expect(folkLayout.copyGap).toBeGreaterThanOrEqual(8);
    expect(folkLayout.lineLeft).toBeLessThanOrEqual(1);
    expect(folkLayout.overflow).toBeLessThanOrEqual(1);

    const remote = await page.evaluate(function () {
      return FB.world.provs.filter(function (province) {
        return !province.wasteland && province.id !== FB.state.player.provinceId;
      })[0].id;
    });
    const remoteRead = await page.evaluate(function (pid) {
      const beforeState = JSON.stringify(FB.state.localFolk);
      const beforeRng = FB.getRngState();
      FB.ui.showSettlement(pid, 0);
      return {
        stateUnchanged:beforeState === JSON.stringify(FB.state.localFolk),
        rngUnchanged:beforeRng === FB.getRngState()
      };
    }, remote);
    expect(remoteRead).toEqual({ stateUnchanged:true, rngUnchanged:true });
    await expect(page.locator('#gm-body')).toContainText(
      'Travel here to meet the people who live around this settlement.');
  });

test('road travel hides the roster and pruning retains only connected distant households',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const home = s.player.provinceId;
      const remote = FB.world.provs.filter(function (province) {
        return !province.wasteland && province.id !== home;
      })[0].id;
      FB.localFolkEnsure(s, remote);
      const adult = FB.localFolkAt(s, remote).filter(function (c) {
        return FB.ageOf(c, s.date.year) >= 16;
      })[0];
      const keptHousehold = adult.localFolk.householdId;
      s.player.travel = {
        phase:'arrived', currentId:remote, homeId:home,
        destinationId:remote, remainingRoute:[]
      };
      const destinationReady = FB.localFolkActivityStatus(
        s, adult.id, 'commons').ready;
      const destinationQueued = FB.beginLocalFolkActivity(
        s, adult.id, 'commons');
      s.eventQueue.pop();
      FB.noteFriendContact(s, adult, { source:'local_folk', cultivated:false });
      s.player.travel = {
        phase:'outbound', currentId:home, homeId:home,
        destinationId:remote, remainingRoute:[remote]
      };
      const onRoad = FB.localFolkCurrent(s).length;
      s.player.travel = null;
      FB.localFolkPrune(s);
      const distant = s.localFolk[remote];
      return {
        destinationReady:destinationReady,
        destinationQueued:destinationQueued,
        onRoad:onRoad,
        keptHousehold:keptHousehold,
        households:distant ? distant.households.map(function (household) {
          return household.id;
        }) : [],
        contactPresent:!!s.chars[adult.id]
      };
    });

    expect(result.destinationReady).toBe(true);
    expect(result.destinationQueued).toBe(true);
    expect(result.onRoad).toBe(0);
    expect(result.households).toHaveLength(1);
    expect(result.households).toContain(result.keptHousehold);
    expect(result.contactPresent).toBe(true);
  });

test('all four daily-life event sets and the technology review are registered',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const ids = ['local_folk_commons', 'local_folk_work',
        'local_folk_worship', 'local_folk_hospitality'];
      return {
        events:ids.map(function (id) {
          const event = FB.eventById(id);
          return event && {
            id:event.id,
            choices:event.options.length,
            participant:event.participants[0].slot,
            validator:event.contextValidator
          };
        }),
        technology:FBDATA.techImpactReviews.features
          .persistent_settlement_folk_activities
      };
    });

    expect(result.events).toEqual([
      { id:'local_folk_commons', choices:3, participant:'resident',
        validator:'local_folk_activity_valid' },
      { id:'local_folk_work', choices:3, participant:'resident',
        validator:'local_folk_activity_valid' },
      { id:'local_folk_worship', choices:3, participant:'resident',
        validator:'local_folk_activity_valid' },
      { id:'local_folk_hospitality', choices:3, participant:'resident',
        validator:'local_folk_activity_valid' }
    ]);
    expect(result.technology.mode).toBe('none');
  });
