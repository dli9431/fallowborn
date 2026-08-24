'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'data/events_war.js',
  'data/map_data.js',
  'data/units.js',
  'js/actions.js',
  'js/armies.js',
  'js/events.js',
  'js/messages.js',
  'js/ui_misc.js',
  'js/ui_panels.js',
  'js/ui_modals.js',
  'js/world.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('raid Chronicle entry reopens its compact saved result',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      p.tier = 4;
      me.culture = 'norse';
      me.religion = 'norse_pagan';
      let targets = FB.raidTargets(s);
      if (!targets.length) {
        const realmId = FB.playerRealmId ? FB.playerRealmId(s) : 'player';
        FB.realmTechRecord(s, realmId).completed.push('longships');
        targets = FB.raidTargets(s);
      }
      const report = FB.executeRaid(s, targets[0].pid, 'sack', p.charId, 'settle');
      const saved = FB.hostileReport(s, report.hostileReportId);
      FB.ui.showTab('log');
      FB.ui.refresh();
      return {
        id:report.hostileReportId,
        targetPid:targets[0].pid,
        savedKind:saved && saved.kind,
        savedCasualties:saved && saved.casualties,
        linked:s.log.some(function (entry) {
          return entry.hostileReportId === report.hostileReportId;
        })
      };
    });

    expect(result.savedKind).toBe('raid');
    expect(result.savedCasualties).toBeGreaterThanOrEqual(0);
    expect(result.linked).toBe(true);
    const link = page.locator('[data-hostile-report="' + result.id + '"]');
    await expect(link).toContainText('View raid report');
    await link.click();
    await expect(page.locator('#gm-title')).toContainText('Raid');
    await expect(page.locator('#gm-body')).toContainText(
      await page.evaluate(function (pid) { return FB.world.byId[pid].name; }, result.targetPid));
  });

test('battle and concluded-war Chronicle entries reopen durable reports',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const enemyId = Object.keys(s.realms).filter(function (rid) {
        return rid !== 'player' && s.realms[rid] && s.realms[rid].alive &&
          !s.realms[rid].liege;
      })[0];
      const home = p.provinceId;
      p.tier = 4;
      p.liege = null;
      p.provs = [home];
      s.owner[home] = 'player';
      s.holder[home] = 'player';
      FB.foundPlayerRealm(s);
      p.war = {
        enemy:enemyId, target:s.realms[enemyId].capital,
        wins:0, losses:0, seasons:2, defending:false,
        casus:{ type:'fabricated' }
      };
      const warReport = FB.ensurePlayerWarHistory(s);
      FB.news(s, FB.msg('news.war.history_link_probe',
        'The armies remain in the field.', {}));
      const inheritedWarLink = s.log[s.log.length - 1].hostileReportId;
      s.armies = [{
        id:'history-player-host', realm:'player', men:420, size:500,
        units:{ levy:300, arch:50, cav:20, ret:50 },
        at:home, from:home, moveLeft:0, path:[], goal:null
      }];
      const battle = {
        turn:s.turn, outcome:'loss', mode:'field', pid:home,
        playerBefore:500, playerAfter:420,
        enemyBefore:460, enemyAfter:390,
        playerLosses:{ levy:80 }, enemyLosses:{ levy:70 }
      };
      FB.fns.war_loss(s, { battleRecord:battle }, FB.eventById('field_battle_lost'));
      const savedBattle = p.war.battles[p.war.battles.length - 1];
      const battleId = savedBattle.hostileReportId;
      const warId = p.war.hostileReportId;
      FB.endPlayerWar(s);
      const finishedWarReport = FB.hostileReport(s, warId);
      FB.ui.showTab('log');
      FB.ui.refresh();
      return {
        battleId:battleId,
        warId:warId,
        enemyName:s.realms[enemyId].name,
        warStatus:finishedWarReport.status,
        inheritedWarLink:inheritedWarLink,
        initialWarId:warReport.id,
        battleStored:!!FB.hostileReport(s, battleId)
      };
    });

    expect(result.battleStored).toBe(true);
    expect(result.warStatus).toBe('concluded');
    expect(result.inheritedWarLink).toBe(result.initialWarId);
    await page.locator('[data-hostile-report="' + result.battleId + '"]').click();
    await expect(page.locator('#gm-title')).toContainText('Battle Result');
    await expect(page.locator('#gm-body')).toContainText('500 → 420 men');
    await page.getByRole('button', { name:'Close', exact:true }).click();
    await page.locator('[data-hostile-report="' + result.warId + '"]').first().click();
    await expect(page.locator('#gm-title')).toContainText('War Result');
    await expect(page.locator('#gm-body')).toContainText(result.enemyName);
    await expect(page.locator('#gm-body')).toContainText('Campaign battles (1)');
  });

test('hostile history remains capped without daily processing',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const count = FB.HOSTILE_HISTORY_LIMIT + 5;
      let first = null;
      let last = null;
      for (let i = 0; i < count; i++) {
        const report = FB.recordHostileEvent(s, {
          kind:'battle', outcome:i % 2 ? 'win' : 'loss', playerBefore:100
        });
        if (!i) {
          first = report.id;
          FB.news(s, FB.msg('news.war.hostile_history_cap_probe',
            'An old clash is recorded.', {}), { hostileReportId:first });
        }
        last = report.id;
      }
      return {
        length:s.hostileHistory.length,
        firstPresent:!!FB.hostileReport(s, first),
        lastPresent:!!FB.hostileReport(s, last),
        firstLinked:s.log.some(function (entry) {
          return entry.hostileReportId === first;
        })
      };
    });
    expect(result).toEqual({
      length:200, firstPresent:false, lastPresent:true, firstLinked:false
    });
  });
