'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/council.js',
  'js/parliament.js',
  'js/politics.js',
  'data/political_institutions.js',
  'data/events_politics.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('guild office progression uses a visible election, fixed term, and vacancy',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const c = s.chars[s.player.charId];
      s.player.tier = 1;
      s.player.gold = 500;
      s.player.prestige = 500;
      c.skills.ste = 20;
      c.skills.dip = 20;
      c.career = {
        profession:'craftsman', rank:'master', experience:12,
        startedYear:s.date.year - 12, guildRank:'master',
        guildStanding:100, chosen:true
      };
      s.player.profession = 'craftsman';
      s.elections = null;
      FB.ensureInstitutions(s, { silent:true });
      const step = FB.guildAdvance(s, c);
      const active = FB.takeGuildStep(s, c);
      const rankBeforeVote = c.career.guildRank;
      const forecast = FB.electionForecast(s, active);
      FB.chooseElectionTactic(s, 'reputation');
      const originalRng = FB.rng;
      FB.rng = function () { return 0; };
      const vote = FB.resolveElection(s);
      FB.rng = originalRng;
      const scope = s.elections.guildScopes[
        'craftsman@' + s.player.provinceId];
      const term = scope.offices.officer;
      const rankDuringTerm = c.career.guildRank;
      s.turn = term.endTurn;
      FB.institutionsDay(s);
      return {
        step:{ election:step.election, to:step.to, blocked:step.blocked },
        rankBeforeVote:rankBeforeVote,
        candidateCount:forecast.candidates.length,
        electorateCount:forecast.electorates.length,
        termDays:forecast.termDays,
        passed:vote.passed,
        tally:[vote.supportWeight, vote.totalWeight, vote.majority],
        rankDuringTerm:rankDuringTerm,
        rankAfterTerm:c.career.guildRank,
        vacancy:!s.elections.guildScopes[
          'craftsman@' + s.player.provinceId]
      };
    });

    expect(result.step).toEqual({ election:true, to:'officer', blocked:false });
    expect(result.rankBeforeVote).toBe('master');
    expect(result.candidateCount).toBeGreaterThan(1);
    expect(result.electorateCount).toBe(3);
    expect(result.termDays).toBe(1440);
    expect(result.passed).toBe(true);
    expect(result.tally[0]).toBe(result.tally[1]);
    expect(result.tally[0]).toBeGreaterThanOrEqual(result.tally[2]);
    expect(result.rankDuringTerm).toBe('officer');
    expect(result.rankAfterTerm).toBe('master');
    expect(result.vacancy).toBe(true);
  });

test('guild election defeat records a rival term and candidacy cooldown',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const c = s.chars[s.player.charId];
      s.player.tier = 1;
      s.player.gold = 500;
      s.player.prestige = 500;
      c.skills.ste = 20;
      c.career = {
        profession:'merchant', rank:'master', experience:12,
        startedYear:s.date.year - 12, guildRank:'master',
        guildStanding:100, chosen:true
      };
      c.traits = c.traits || [];
      if (c.traits.indexOf('literate') < 0) c.traits.push('literate');
      c.skills.lea = 20;
      s.player.profession = 'merchant';
      s.elections = null;
      FB.ensureInstitutions(s, { silent:true });
      const active = FB.beginGuildElection(s, c, 'officer');
      FB.chooseElectionTactic(s, 'reputation');
      const originalRng = FB.rng;
      FB.rng = function () { return 0.999; };
      const vote = FB.resolveElection(s);
      FB.rng = originalRng;
      const status = FB.guildElectionStatus(s, c, 'officer');
      const scope = s.elections.guildScopes[
        'merchant@' + s.player.provinceId];
      return {
        active:active.kind,
        passed:vote.passed,
        winner:vote.winnerId,
        holderKind:scope.offices.officer.holderKind,
        rank:c.career.guildRank,
        cooldown:status.missing.some(function (reason) {
          return reason.indexOf('cooldown') >= 0;
        }),
        history:s.elections.history[s.elections.history.length - 1].result
      };
    });

    expect(result.active).toBe('guild');
    expect(result.passed).toBe(false);
    expect(result.winner).toBeTruthy();
    expect(result.holderKind).toBe('abstract');
    expect(result.rank).toBe('master');
    expect(result.cooldown).toBe(true);
    expect(result.history).toBe('lost');
  });

test('Council remains appointive by default and chartered offices require confirmation',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      const counties = FB.world.provs.filter(function (province) {
        return !province.wasteland && province.id !== p.provinceId;
      }).slice(0, 2);
      function vassal(id, province, name) {
        s.owner[province.id] = 'player';
        s.holder[province.id] = id;
        s.realms[id] = {
          id:id, name:name, color:'#775533', capital:province.id,
          aggression:0, rank:1, liege:'player', alive:true, favor:0,
          ruler:{ name:name + ' Ruler', sex:'m', culture:me.culture,
            age:40, mar:12, ste:12, dip:12, trait:'ambitious', generation:1 }
        };
        FB.setRealmRulerStanding(s, id, 40);
      }
      p.tier = 6;
      p.liege = null;
      p.gold = 500;
      p.prestige = 500;
      FB.foundPlayerRealm(s);
      s.realms.player.rank = 3;
      s.realms.player.liege = null;
      vassal('choice_vassal_a', counties[0], 'Aldred');
      vassal('choice_vassal_b', counties[1], 'Baldric');
      s.council = { authority:55, seats:{
        seneschal:'choice_vassal_b', constable:null, treasurer:null,
        almoner:null, chamberlain:null
      } };
      s.privileges = [];
      s.elections = null;
      FB.invalidateRealmCache();
      FB.ensureInstitutions(s, { silent:true });
      const technology = FB.realmTechRecord(s, 'player');
      if (technology.completed.indexOf('representative_estates') < 0) {
        technology.completed.push('representative_estates');
      }

      const direct = FB.councilAppoint(s, 'treasurer', 'choice_vassal_a');
      const directHolder = s.council.seats.treasurer;
      const directDismissed = FB.councilDismiss(s, 'treasurer');
      const seatsAfterDismissal = FB.councilSeats(s).filter(function (seat) {
        return s.council.seats[seat.id] === 'choice_vassal_a';
      }).map(function (seat) { return seat.id; });
      FB.grantPrivilege(s, 'office_confirmation', {
        sourceType:'charter', sourceId:'test_charter',
        grantorType:'realm', grantorId:'player'
      });
      const pending = FB.councilAppoint(
        s, 'treasurer', 'choice_vassal_a');
      const holderBeforeVote = s.council.seats.treasurer;
      const forecast = pending && pending.election
        ? FB.electionForecast(s, pending.election) : null;
      let vote = null;
      if (forecast) {
        FB.chooseElectionTactic(s, 'reputation');
        const originalRng = FB.rng;
        FB.rng = function () { return 0; };
        vote = FB.resolveElection(s);
        FB.rng = originalRng;
      }
      const holderAfterVote = s.council.seats.treasurer;
      const dismissal = FB.councilDismissalStatus(s, 'treasurer');
      const dismissed = FB.councilDismiss(s, 'treasurer');
      return {
        direct:direct.appointed,
        directHolder:directHolder,
        directDismissed:directDismissed,
        seatsAfterDismissal:seatsAfterDismissal,
        pending:!!(pending && pending.pending),
        holderBeforeVote:holderBeforeVote,
        electorates:forecast ? forecast.electorates.length : null,
        termDays:forecast ? forecast.termDays : null,
        passed:vote ? vote.passed : null,
        holderAfterVote:holderAfterVote,
        dismissalReady:dismissal.ready,
        dismissed:dismissed,
        protectedHolder:s.council.seats.treasurer
      };
    });

    expect(result.direct).toBe(true);
    expect(result.directHolder).toBe('choice_vassal_a');
    expect(result.directDismissed).toBe(true);
    expect(result.seatsAfterDismissal).toEqual([]);
    expect(result.pending).toBe(true);
    expect(result.holderBeforeVote).toBeNull();
    expect(result.electorates).toBe(3);
    expect(result.termDays).toBe(1440);
    expect(result.passed).toBe(true);
    expect(result.holderAfterVote).toBe('choice_vassal_a');
    expect(result.dismissalReady).toBe(false);
    expect(result.dismissed).toBe(false);
    expect(result.protectedHolder).toBe('choice_vassal_a');
  });

test('privilege contracts follow modifier scope and summaries are read-only',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const pid = s.player.provinceId;
      s.player.tier = 3;
      s.privileges = [];
      FB.addModifier(s, 'custom_confirmed', pid, {
        sourceEventId:'parliament_local_custom'
      });
      FB.ensureInstitutions(s, { silent:true });
      const beforeState = JSON.stringify(s);
      const beforeRng = JSON.stringify(FB.getRngState());
      const summary = FB.privilegeSummary(s);
      const afterRng = JSON.stringify(FB.getRngState());
      const afterState = JSON.stringify(s);
      s.player.provs = s.player.provs.filter(function (id) {
        return id !== pid;
      });
      const afterTransfer = FB.privilegeSummary(s);
      s.turn = summary[0].endTurn;
      FB.ensureInstitutions(s, { silent:true });
      return {
        record:summary[0],
        sameState:beforeState === afterState,
        sameRng:beforeRng === afterRng,
        survivesTransfer:afterTransfer.length === 1,
        expired:FB.privilegeSummary(s).length === 0
      };
    });

    expect(result.record).toMatchObject({
      defId:'confirmed_custom', holderType:'county', scopeType:'county',
      effectKind:'modifier', effectId:'custom_confirmed',
      sourceId:'parliament_local_custom'
    });
    expect(result.record.remainingDays).toBeGreaterThan(0);
    expect(result.sameState).toBe(true);
    expect(result.sameRng).toBe(true);
    expect(result.survivesTransfer).toBe(true);
    expect(result.expired).toBe(true);
  });

test('mistreatment creates bounded demands and refusal organizes opposition',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      s.player.tier = 3;
      s.player.pop = -60;
      s.player.war = null;
      s.collectiveDemands = null;
      s.privileges = [];
      FB.ensureInstitutions(s, { silent:true });
      const technology = FB.realmTechRecord(s);
      if (technology.completed.indexOf('customary_law') < 0) {
        technology.completed.push('customary_law');
      }
      FB.notePoliticalMistreatment(s, 'extraordinary_tax', { gold:40 });
      const candidates = FB.collectiveDemandCandidates(s).map(function (row) {
        return row.id;
      });
      const pending = FB.institutionsYearly(s);
      const warBefore = JSON.stringify(s.player.war);
      const refused = FB.fns.collective_demand_refuse(s, {
        demandId:pending.id,
        definitionId:pending.definitionId,
        privilegeId:pending.privilegeId
      });
      const summary = FB.collectiveDemandSummary(s);
      return {
        candidates:candidates,
        pendingDefinition:pending.definitionId,
        queued:s.eventQueue.some(function (event) {
          return event.id === 'collective_privilege_demand';
        }),
        refused:refused,
        opposition:summary.opposition,
        pendingCleared:summary.pending === null,
        noImmediateWar:JSON.stringify(s.player.war) === warBefore
      };
    });

    expect(result.candidates).toContain('commons_custom');
    expect(result.candidates).toContain('tax_remission');
    expect(result.pendingDefinition).toBeTruthy();
    expect(result.queued).toBe(true);
    expect(result.refused).toBe(true);
    expect(result.opposition.length).toBe(1);
    expect(result.opposition[0].level).toBe(2);
    expect(result.pendingCleared).toBe(true);
    expect(result.noImmediateWar).toBe(true);
  });

test('collective demand events render their structured privilege names',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const event = FB.eventById('collective_privilege_demand');
      const ctx = FB.eventContext(s, {
        constituency:'guild',
        privilege:FB.dataParam('privilege', 'market_charter', 'name')
      });
      return {
        title:FB.eventText(s, s.player.charId, event, 'title', ctx),
        text:FB.eventText(s, s.player.charId, event, 'text', ctx),
        grant:FB.eventText(s, s.player.charId, event, 'options.0.label', ctx)
      };
    });

    expect(result.title).toBe('A Demand for Market Charter');
    expect(result.text).toContain('The guild benches speak with one voice.');
    expect(result.text).toContain('demand Market Charter:');
    expect(result.grant).toBe('Grant Market Charter.');
    expect(result.title + result.text + result.grant).not.toContain('[object Object]');
  });

test('election and privilege sheets expose constituencies, terms, and revocation',
  async function ({ page }) {
    await page.evaluate(function () {
      const s = FB.state;
      const c = s.chars[s.player.charId];
      s.player.tier = 1;
      s.player.gold = 500;
      s.player.prestige = 500;
      c.skills.ste = 20;
      c.career = {
        profession:'craftsman', rank:'master', experience:12,
        startedYear:s.date.year - 12, guildRank:'master',
        guildStanding:100, chosen:true
      };
      s.player.profession = 'craftsman';
      s.elections = null;
      FB.ensureInstitutions(s, { silent:true });
      FB.beginGuildElection(s, c, 'officer');
      FB.ui.showElection({ view:'career', cid:c.id });
    });

    await expect(page.locator('#gm-body')).toContainText('Candidates & expected support');
    await expect(page.locator('#gm-body')).toContainText('Masters’ bench');
    await expect(page.locator('#gm-body')).toContainText('1440 fixed days');
    await expect(page.locator('#gm-body')).toContainText('Pending a recorded vote');
    await expect(page.locator(
      '#gm-body > .gm-footer > #election-back')).toBeVisible();
    await expect.poll(async function () {
      return page.evaluate(function () {
        return document.activeElement && document.activeElement.id;
      });
    }).toBe('genmodal');

    await page.evaluate(function () {
      const s = FB.state;
      FB.chooseElectionTactic(s, 'reputation');
      const originalRng = FB.rng;
      FB.rng = function () { return 0; };
      const result = FB.resolveElection(s);
      FB.rng = originalRng;
      FB.ui.showElectionResult(result, { view:'career' });
    });
    await expect(page.locator(
      '#gm-body > .gm-footer > #election-result-close')).toBeVisible();

    await page.evaluate(function () {
      const s = FB.state;
      const pid = s.player.provinceId;
      s.player.tier = 3;
      FB.addModifier(s, 'market_charter', pid, {
        privilegeDefId:'market_charter', sourceEventId:'ui_test'
      });
      FB.ui.showPrivileges();
    });
    await expect(page.locator('#gm-body')).toContainText('Market Charter');
    await expect(page.locator('#gm-body')).toContainText('Holder');
    await expect(page.locator('#gm-body')).toContainText('Scope');
    await expect(page.locator('#gm-body')).toContainText('Exact effect');
    await expect(page.locator('#gm-body')).toContainText('Revocation');
    await expect(page.locator(
      '#gm-body > .gm-footer > #privileges-back')).toBeVisible();

    await page.locator('[data-revoke-privilege]').click();
    await expect(page.locator(
      '#gm-body > .gm-list > #privilege-revoke-confirm')).toBeVisible();
    await expect(page.locator(
      '#gm-body > .gm-footer > #privilege-revoke-back')).toBeVisible();
    await expect.poll(async function () {
      return page.evaluate(function () {
        return document.activeElement && document.activeElement.id;
      });
    }).toBe('genmodal');
  });
