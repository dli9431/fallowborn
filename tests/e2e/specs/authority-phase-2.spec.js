'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/authority.js', 'js/federates.js', 'js/politics.js', 'js/armies.js', 'js/justice.js',
  'js/council.js', 'js/treasury.js', 'js/main.js', 'js/save.js', 'js/save_v4.js',
  'js/world.js', 'js/model.js', 'js/lordships.js', 'js/ui_misc.js',
  'js/ui_modals.js', 'js/i18n.js', 'css/style.css',
  'data/political_institutions.js', 'data/technology.js',
  'data/bookmarks.js', 'data/map_data.js', 'data/counties.js',
  'data/settlements.js', 'data/settlements_real.js',
  'js/governments.js', 'data/eras.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

async function start(page, testInfo, bookmark, revision) {
  await openGame(page, testInfo);
  if (revision) await page.evaluate(function (o) {
    FBDATA.bookmarks[o.bookmark].revision = o.revision;
  }, { bookmark:bookmark, revision:revision });
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  const code = 'AUTHORITY-' + bookmark + '-serf-london-f-Ada';
  await page.locator('#ng-seed').fill(code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await expect(page.getByRole('button', { name:'Begin', exact:true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  expect(await page.evaluate(function () { return FB.state.start.id; })).toBe(bookmark);
}

for (const bookmark of ['867', '1066']) {
  test(bookmark + ' keeps legacy power and Council consent without authority records', async function ({ page }, testInfo) {
    await start(page, testInfo, bookmark, 'baseline');
    const result = await page.evaluate(function () {
      const s = FB.state, q = FB.political, pid = s.player.provinceId;
      const rid = FB.settlementCountyHolder(s, pid);
      const ruler = FB.realmRulerCharacterSnapshot(s, rid);
      const mine = { kind:'character', id:s.player.charId };
      const before = JSON.stringify(s), rng = FB.getRngState();
      const authority = q.permission(s, { kind:'realm', id:rid },
        'collect_render', { provinceId:pid });
      const local = ruler && q.permission(s, { kind:'character', id:ruler.id },
        'arrest', { provinceId:pid });
      const council = FB.councilNeedsConsent(s);
      const baselineCouncil = !!(FB.councilActive(s) && s.council &&
        FB.effectiveCrownAuthority(s) < (FBDATA.balance.councilConsentBelow || 35));
      const missing = q.permission(s, mine, 'command_host', {}).allowed;
      const rejected = FB.authorityAppoint(s, { officeId:'field_command',
        holder:mine, scope:{ kind:'host', id:'missing' } });
      const schema = FB.validateAuthorityData();
      FBDATA.authorityOffices.bad_test = {
        powers:['ban'], scopes:['county'], succession:'continues' };
      const badDefinition = FB.validateAuthorityData().some(function (error) {
        return error.indexOf('bad_test') >= 0;
      });
      delete FBDATA.authorityOffices.bad_test;
      const territorial = FBDATA.governmentForms.territorial;
      delete FBDATA.governmentForms.territorial;
      const missingForm = FB.validateAuthorityData().some(function (error) {
        return error.indexOf('Territorial government form') >= 0;
      });
      FBDATA.governmentForms.territorial = territorial;
      return { revenue:authority.allowed,
        localParity:!ruler || local.allowed ===
          (FB.justiceRulerEligible(s, ruler.id) &&
            FB.justiceCounties(s, ruler.id).indexOf(pid) >= 0),
        council:council === baselineCouncil, missing:missing,
        rejected:rejected,
        recognitions:q.legitimacy(s, mine), rights:q.rights(s, mine),
        unchanged:JSON.stringify(s) === before, rng:FB.getRngState() === rng,
        saved:Object.prototype.hasOwnProperty.call(s, 'authority'),
        schema:schema, badDefinition:badDefinition, missingForm:missingForm };
    });
    expect(result).toEqual({ revenue:true, localParity:true, council:true,
      missing:false, rejected:null, recognitions:[], rights:[],
      unchanged:true, rng:true,
      saved:false, schema:[], badDefinition:true, missingForm:true });
  });

  test(bookmark + ' separates command, jurisdiction, revenue and recognition from land', async function ({ page }, testInfo) {
    await start(page, testInfo, bookmark);
    const result = await page.evaluate(function () {
      const s = FB.state, q = FB.political, pid = s.player.provinceId;
      const rid = FB.settlementCountyHolder(s, pid);
      const me = { kind:'character', id:s.player.charId };
      const patron = { kind:'realm', id:rid };
      const land = JSON.stringify([s.owner, s.holder, s.player.provs]);
      const tier = s.player.tier;
      s.armies.push({ id:'authority-test-host', realm:rid, at:pid, men:100,
        units:{ levy:100 }, path:[], supply:100 });
      const host = s.armies[s.armies.length - 1];
      const first = FB.authorityAppoint(s, { officeId:'field_command',
        institutionId:rid, appointer:patron, holder:me,
        scope:{ kind:'host', id:host.id } });
      const command = !!first && FB.playerControlsHost(s, host);
      const noRevenue = !q.permission(s, me, 'collect_render', { provinceId:pid }).allowed;
      const noPeace = !q.permission(s, me, 'arrest', { provinceId:pid }).allowed;
      const noLand = land === JSON.stringify([s.owner, s.holder, s.player.provs]) &&
        tier === s.player.tier;
      const office = q.office(s, q.offices(s, me).find(function (row) {
        return row.ref.appointmentId === first.id;
      }).ref);
      const before = JSON.stringify(s), rng = FB.getRngState();
      office.terms.scope.id = 'detached';
      const pure = JSON.stringify(s) === before && FB.getRngState() === rng &&
        q.office(s, office.ref).terms.scope.id === host.id;
      const removed = FB.authorityAppointmentTransition(s, first.id, 'remove');
      const commandLost = !FB.playerControlsHost(s, host);
      const acclamation = FB.authorityRecognize(s, { source:'army_acclamation',
        issuer:{ kind:'host', id:host.id }, subject:me,
        scope:{ kind:'county', id:pid } });
      const wrongSource = FB.authorityAppoint(s, { officeId:'judicial_vicar',
        institutionId:rid, appointer:patron, holder:me,
        scope:{ kind:'county', id:pid }, recognitionId:acclamation.id });
      const recognition = FB.authorityRecognize(s, { source:'imperial_commission',
        issuer:patron, subject:me, scope:{ kind:'county', id:pid } });
      const court = FB.authorityAppoint(s, { officeId:'judicial_vicar',
        institutionId:rid, appointer:patron, holder:me,
        scope:{ kind:'county', id:pid }, recognitionId:recognition.id, contested:true });
      const contested = !q.permission(s, me, 'arrest', { provinceId:pid }).allowed;
      const confirmed = FB.authorityAppointmentTransition(s, court.id, 'confirm');
      const peace = q.permission(s, me, 'arrest', { provinceId:pid }).allowed;
      const eligible = FB.justiceRulerEligible(s, me.id) &&
        FB.justiceCounties(s, me.id).indexOf(pid) >= 0;
      const revoked = FB.authorityRecognitionTransition(s, recognition.id, 'revoke');
      const peaceLost = !q.permission(s, me, 'arrest', { provinceId:pid }).allowed;
      const revenueOffice = FB.authorityAppoint(s, { officeId:'fiscal_agent',
        institutionId:rid, appointer:patron, holder:me,
        scope:{ kind:'county', id:pid } });
      const revenue = !!revenueOffice &&
        q.permission(s, me, 'collect_render', { provinceId:pid }).allowed;
      const noCommand = !FB.playerControlsHost(s, host);
      const territorialConsent = q.permission(s, patron, 'civic_agreement',
        { provinceId:pid }).allowed;
      const romanForm = FB.authoritySetGovernment(s, rid, 'roman_civic');
      const noCivic = !q.permission(s, patron, 'civic_agreement',
        { provinceId:pid }).allowed;
      const civic = FB.authorityAppoint(s, { officeId:'civic_delegate',
        institutionId:rid, appointer:patron, holder:me,
        scope:{ kind:'county', id:pid } });
      const delegatedConsent = !!civic && q.permission(s, me,
        'civic_agreement', { provinceId:pid }).allowed;
      s.realms[rid].ruler.generation = (s.realms[rid].ruler.generation || 1) + 1;
      const successorDenied = !q.permission(s, me, 'collect_render',
        { provinceId:pid }).allowed;
      const consentContinues = q.permission(s, me, 'civic_agreement',
        { provinceId:pid }).allowed;
      FB.authoritySeason(s);
      const contestedAfterSuccession = q.office(s, {
        kind:'office', source:'authority.appointments', appointmentId:revenueOffice.id,
        holder:me }).status === 'contested';
      const reaffirmed = FB.authorityAppointmentTransition(s, revenueOffice.id,
        'confirm') && q.permission(s, me, 'collect_render',
          { provinceId:pid }).allowed;
      const expired = FB.authorityAppointmentTransition(s, revenueOffice.id,
        'expire') && !q.permission(s, me, 'collect_render',
          { provinceId:pid }).allowed;
      return { command:command, noRevenue:noRevenue, noPeace:noPeace,
        noLand:noLand, pure:pure, removed:removed, commandLost:commandLost,
        wrongSource:wrongSource, contested:contested, confirmed:confirmed,
        peace:peace, eligible:eligible,
        revoked:revoked, peaceLost:peaceLost, revenue:revenue, noCommand:noCommand,
        territorialConsent:territorialConsent, romanForm:romanForm,
        noCivic:noCivic, delegatedConsent:delegatedConsent,
        successorDenied:successorDenied, consentContinues:consentContinues,
        contestedAfterSuccession:contestedAfterSuccession, reaffirmed:reaffirmed,
        expired:expired, tech:FBDATA.techImpactReviews.features.authority_appointments.mode };
    });
    expect(result).toEqual({ command:true, noRevenue:true, noPeace:true,
      noLand:true, pure:true, removed:true, commandLost:true,
      wrongSource:null, contested:true,
      confirmed:true, peace:true, eligible:true, revoked:true, peaceLost:true,
      revenue:true, noCommand:true, territorialConsent:true, romanForm:true,
      noCivic:true, delegatedConsent:true, successorDenied:true,
      consentContinues:true, contestedAfterSuccession:true, reaffirmed:true, expired:true,
      tech:'none' });
  });

  test(bookmark + ' federate consent, pay, customary right and succession are one-time transitions', async function ({ page }, testInfo) {
    await start(page, testInfo, bookmark);
    const result = await page.evaluate(function () {
      const s = FB.state, q = FB.political, pid = s.player.provinceId;
      const patronId = FB.settlementCountyHolder(s, pid);
      s.realms[patronId].rank = Math.max(1, s.realms[patronId].rank);
      const federateId = Object.keys(s.realms).find(function (id) {
        return id !== patronId && id !== 'player' && s.realms[id].alive &&
          s.realms[id].rank >= 1;
      });
      const patron = { kind:'realm', id:patronId };
      const federate = { kind:'realm', id:federateId };
      s.armies.push({ id:'federate-test-host', realm:federateId, at:pid,
        men:80, units:{ levy:80 }, path:[], supply:100 });
      const host = s.armies[s.armies.length - 1];
      s.treasuryAccounting = { mode:'active' };
      s.realms[patronId].treasury = { version:1, gold:100, militaryAccrued:0, retired:false };
      s.realms[federateId].treasury = { version:1, gold:20, militaryAccrued:0, retired:false };
      const land = JSON.stringify([s.owner, s.holder]);
      s.dev[pid] = 8; FB.rememberSettlementSites(s, pid);
      const site = FB.settlementGrantSites(s, pid, patronId)[0];
      const me = s.chars[s.player.charId];
      const recruit = FB.makeCharacter(s, { name:'Federate Recruit', station:2,
        born:s.date.year - 30, culture:me.culture, religion:me.religion, traits:[] });
      recruit.homeProvinceId = pid;
      const offered = FB.authorityOfferContract(s, { patronRealmId:patronId,
        federateRealmId:federateId, hostId:host.id, payPerSeason:10,
        endTurn:s.turn + 360, settlementCountyIds:[pid],
        settlementAwards:[{ provinceId:pid, settlement:site.settlement,
          recipientId:recruit.id }] });
      const noService = !q.permission(s, patron, 'command_host', { hostId:host.id }).allowed;
      const one = FB.authorityConsentContract(s, offered.id, patronId);
      const stillOffered = !q.contract(s, offered.id).effective;
      const two = FB.authorityConsentContract(s, offered.id, federateId);
      const duplicate = FB.authorityConsentContract(s, offered.id, federateId);
      const service = q.permission(s, patron, 'command_host', { hostId:host.id }).allowed;
      const revenue = q.permission(s, federate, 'collect_service_pay',
        { contractId:offered.id }).allowed;
      const grant = q.contractAwardQuote(s, offered.id, 0);
      const award = !!grant && FB.authorityFulfillContractAward(s, offered.id, 0, grant);
      const awardOnce = !FB.authorityFulfillContractAward(s, offered.id, 0, grant) &&
        FB.settlementHolder(s, pid, site.settlement).id === recruit.id;
      const possessed = FB.authorityEstablishRight(s, { issuer:patron,
        beneficiary:{ kind:'character', id:recruit.id },
        scope:{ kind:'county', id:pid }, power:'peace', basis:'possession' });
      FB.authorityYear(s);
      const annualAccrual = !!possessed &&
        q.rights(s, { kind:'character', id:recruit.id })[0].strength === 60;
      FB.authorityYear(s);
      const annualOnce = q.rights(s,
        { kind:'character', id:recruit.id })[0].strength === 60;
      FB.authorityRecordCustom(s, possessed.id, 'abandoned');
      const abandonedRight = !q.permission(s,
        { kind:'character', id:recruit.id }, 'arrest',
        { provinceId:pid }).allowed;
      s.turn += 90;
      FB.authoritySeason(s);
      const paid = s.realms[patronId].treasury.gold === 90 &&
        s.realms[federateId].treasury.gold === 30;
      FB.authoritySeason(s);
      const once = s.realms[patronId].treasury.gold === 90 &&
        s.realms[federateId].treasury.gold === 30;
      const renewal = FB.authorityContractTransition(s, offered.id, 'renew',
        patronId, s.turn + 450) &&
        !q.permission(s, patron, 'command_host', { hostId:host.id }).allowed;
      const renewed = FB.authorityConsentContract(s, offered.id, patronId) &&
        FB.authorityConsentContract(s, offered.id, federateId) &&
        q.permission(s, patron, 'command_host', { hostId:host.id }).allowed;
      const agent = FB.authorityAppoint(s, { officeId:'fiscal_agent',
        institutionId:patronId, appointer:patron,
        holder:{ kind:'character', id:s.player.charId },
        scope:{ kind:'county', id:pid } });
      const render = q.renderQuote(s, { kind:'character', id:s.player.charId },
        { provinceId:pid, payerRealmId:federateId, amount:5,
          obligationId:'render:test:' + pid });
      const collected = !!agent && !!render && FB.authorityCollectRender(s, render);
      const renderOnce = !FB.authorityCollectRender(s, render) &&
        s.realms[patronId].treasury.gold === 95 &&
        s.realms[federateId].treasury.gold === 25;
      const custom = FB.authorityEstablishRight(s, { issuer:patron,
        beneficiary:federate, scope:{ kind:'county', id:pid },
        power:'revenue', basis:'judgment', basisRef:'judgment:test' });
      const customRevenue = !!custom && q.permission(s, federate, 'collect_render',
        { provinceId:pid }).allowed;
      FB.authorityRecordCustom(s, custom.id, 'disputed');
      const weakened = !q.permission(s, federate, 'collect_render',
        { provinceId:pid }).allowed;
      const judgment = FB.authorityRecordCustom(s, custom.id, 'judgment',
        'judgment:renewed');
      const rightOnce = judgment &&
        !FB.authorityRecordCustom(s, custom.id, 'judgment', 'judgment:renewed') &&
        q.rights(s, federate).find(function (r) { return r.id === custom.id; }).strength === 50;
      const rightRestored = q.permission(s, federate, 'collect_render',
        { provinceId:pid }).allowed;
      s.player.gold = 20;
      const playerRender = q.renderQuote(s, federate, {
        provinceId:pid, payerRealmId:'player', amount:1,
        obligationId:'player-render:test:' + pid });
      const playerPaid = !!playerRender &&
        FB.authorityCollectRender(s, playerRender) && s.player.gold === 19;
      const rightRevoked = FB.authorityRevokeRight(s, custom.id, patron) &&
        !q.permission(s, federate, 'collect_render', { provinceId:pid }).allowed;
      s.realms[patronId].ruler.generation =
        (s.realms[patronId].ruler.generation || 1) + 1;
      const succession = !q.contract(s, offered.id).effective &&
        !q.permission(s, patron, 'command_host', { hostId:host.id }).allowed;
      FB.authoritySeason(s);
      const ended = q.contract(s, offered.id).status === 'expired';
      const recognition = FB.authorityRecognize(s, {
        source:'imperial_commission', issuer:patron, subject:federate,
        scope:{ kind:'realm', id:federateId } });
      const second = FB.authorityOfferContract(s, { patronRealmId:patronId,
        federateRealmId:federateId, hostId:host.id, payPerSeason:0,
        recognitionId:recognition.id, endTurn:s.turn + 180 });
      const replacement = !!second &&
        FB.authorityConsentContract(s, second.id, patronId) &&
        FB.authorityConsentContract(s, second.id, federateId) &&
        q.permission(s, patron, 'command_host', { hostId:host.id }).allowed;
      const recognitionLost = FB.authorityRecognitionTransition(s,
        recognition.id, 'revoke') &&
        !q.permission(s, patron, 'command_host', { hostId:host.id }).allowed;
      const breach = replacement && FB.authorityContractTransition(s, second.id,
        'breach', federateId) &&
        !q.permission(s, patron, 'command_host', { hostId:host.id }).allowed;
      const abandoned = FB.authorityOfferContract(s, {
        patronRealmId:patronId, federateRealmId:federateId,
        hostId:host.id, payPerSeason:0, endTurn:s.turn + 90 });
      s.turn += 91;
      FB.authoritySeason(s);
      const offerExpired = !!abandoned &&
        q.contract(s, abandoned.id).status === 'expired' &&
        !!FB.authorityOfferContract(s, {
          patronRealmId:patronId, federateRealmId:federateId,
          hostId:host.id, payPerSeason:0, endTurn:s.turn + 90 });
      const landStable = land === JSON.stringify([s.owner, s.holder]);
      const envelope = JSON.parse(FB.save.serialize());
      const authorityBefore = JSON.stringify(envelope.state.authority);
      FB.save.restore(envelope);
      const saveRestored = JSON.stringify(FB.state.authority) === authorityBefore;
      return { offered:!!offered, noService:noService, one:one,
        stillOffered:stillOffered, two:two, duplicate:duplicate, service:service,
        revenue:revenue, award:award, awardOnce:awardOnce,
        annualAccrual:annualAccrual, annualOnce:annualOnce,
        abandonedRight:abandonedRight, paid:paid, once:once, renewal:renewal, renewed:renewed,
        collected:collected, renderOnce:renderOnce,
        customRevenue:customRevenue,
        weakened:weakened, rightOnce:rightOnce,
        rightRestored:rightRestored, playerPaid:playerPaid,
        rightRevoked:rightRevoked,
        succession:succession, expired:ended,
        recognitionLost:recognitionLost, breach:breach,
        offerExpired:offerExpired, land:landStable, saveRestored:saveRestored, saveVersion:envelope.v };
    });
    expect(result).toEqual({ offered:true, noService:true, one:true,
      stillOffered:true, two:true, duplicate:false, service:true, revenue:true,
      award:true, awardOnce:true, annualAccrual:true,
      annualOnce:true, abandonedRight:true, paid:true, once:true, renewal:true,
      renewed:true, collected:true, renderOnce:true,
      customRevenue:true, weakened:true, rightOnce:true, rightRestored:true,
      playerPaid:true, rightRevoked:true, succession:true, expired:true,
      recognitionLost:true, breach:true, offerExpired:true,
      land:true, saveRestored:true, saveVersion:4 });
  });
}
