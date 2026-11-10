/* Ordered, synchronous daily dispatch. Registration and inspection consume no
   simulation state, RNG or UID; all per-pass values live in a transient context. */
window.FB = window.FB || {};
(function () {
  'use strict';
  var D = FB.dayPhases = {};
  var phases = [];

  D.register = function (phase) {
    if (!phase || typeof phase.id !== 'string' || !phase.id ||
        typeof phase.order !== 'number' || !isFinite(phase.order) ||
        ['daily', 'seasonBoundary', 'newYear'].indexOf(phase.cadence) < 0 ||
        ['play', 'observe', 'both'].indexOf(phase.mode) < 0 ||
        !(phase.condition === null || typeof phase.condition === 'function') ||
        typeof phase.run !== 'function') throw new Error('Invalid daily phase.');
    if (phases.some(function (p) { return p.id === phase.id || p.order === phase.order; })) {
      throw new Error('Duplicate daily phase id or order: ' + phase.id);
    }
    phases.push({ id:phase.id, order:phase.order, cadence:phase.cadence,
      mode:phase.mode, condition:phase.condition, run:phase.run });
    phases.sort(function (a, b) { return a.order - b.order; });
  };
  D.list = function () {
    return phases.map(function (p) {
      return { id:p.id, order:p.order, cadence:p.cadence, mode:p.mode,
        condition:p.condition, run:p.run };
    });
  };
  D.run = function (opts, helpers) {
    const s = FB.state, p = s && s.player;
    const c = { game:FB.game, opts:opts, helpers:helpers, seasonBoundary:false,
      newYear:false, automaticDeed:false, annualContext:null, stopped:false };
    c.stop = function (result) { c.stopped = true; c.result = result; };
    // The list is stable for this pass, even if a callback registers future work.
    const active = phases.slice();
    for (let i = 0; i < active.length; i++) {
      const phase = active[i];
      if (phase.mode !== 'both' && phase.mode !== (c.game.observe ? 'observe' : 'play')) continue;
      if (phase.cadence !== 'daily' && !c.seasonBoundary) continue;
      if (phase.cadence === 'newYear' && !c.newYear) continue;
      if (phase.condition && !phase.condition(s, p, c)) continue;
      phase.run(s, p, c);
      if (c.stopped) return c.result;
    }
    return c.result;
  };

  function add(id, order, cadence, mode, condition, run) {
    D.register({ id:id, order:order, cadence:cadence, mode:mode, condition:condition, run:run });
  }
  function refresh(s, p, c) {
    if (!(c.opts && c.opts.deferUi)) {
      FB.ui.refresh(c.opts && c.opts.liveTick ? { liveTick:true } : undefined);
    }
  }
  function dayResult(p, c) { return p.dead ? 'dead' : (c.seasonBoundary ? 'season' : 'day'); }

  add('gate.state', 10, 'daily', 'both', null, function (s, p, c) {
    if (!s || p.dead) c.stop(undefined);
  });
  add('gate.events', 20, 'daily', 'both', null, function (s, p, c) {
    if (FB.ui.eventsBusy()) c.stop(undefined);
  });
  add('gate.travelPicker', 30, 'daily', 'both', null, function (s, p, c) {
    if (FB.ui.travelPickerOpen && FB.ui.travelPickerOpen()) c.stop(undefined);
  });
  add('gate.papalDecision', 40, 'daily', 'both', function (s) {
    return FB.systemAvailable(s, 'papacy') && FB.papacyPendingDecision;
  }, function (s, p, c) {
    // The availability/pending probe also ran in Observe before the mode check.
    const decision = FB.papacyPendingDecision(s);
    if (!c.game.observe && decision) {
      c.game.setPaused(true);
      if (FB.ui.showPapacy) FB.ui.showPapacy(decision);
      c.stop(undefined);
    }
  });
  add('gate.holyWarSettlement', 50, 'daily', 'play', null, function (s, p, c) {
    if (FB.greatHolyWarSettlementNeedsPlayer && FB.greatHolyWarSettlementNeedsPlayer(s)) {
      c.game.setPaused(true);
      if (FB.ui.showGreatHolyWarSettlement) FB.ui.showGreatHolyWarSettlement();
      c.stop(undefined);
    }
  });
  add('preflight.production', 60, 'daily', 'both', function (s, p, c) { return c.opts && c.opts.productionAction; }, function (s, p, c) {
    const opts = c.opts;
    if (c.game.observe || !opts.skipFocus || opts.householdAction || !FB.production.commitDay(s, opts.productionAction)) c.stop(undefined);
  });
  add('preflight.household', 70, 'daily', 'both', function (s, p, c) { return c.opts && c.opts.householdAction; }, function (s, p, c) {
    const opts = c.opts;
    if (c.game.observe || !opts.skipFocus || !FB.householdStories || !FB.householdStories.commitDay(s, opts.householdAction)) c.stop(undefined);
  });
  add('play.recurringDeed', 80, 'daily', 'play', null, function (s, p, c) {
    c.automaticDeed = !(c.opts && c.opts.skipFocus) && FB.autoRecurringDeed && c.game.auto &&
      FB.autoRecurringDeed(s, c.game.auto.recurringDeeds);
  });
  // Picker-backed deeds complete here; immediate deeds also stamp at execution.
  add('deed.completion', 90, 'daily', 'both', function (s, p, c) {
    return c.opts && c.opts.skipFocus && FB.noteDeedCompleted;
  }, function (s) { FB.noteDeedCompleted(s); });
  add('play.maternalCustoms', 100, 'daily', 'play', null, function (s) { FB.learnMaternalCustoms(s); });
  add('play.householdServiceBeforeFocus', 110, 'daily', 'play', function () { return FB.householdServiceDay; }, function (s) { FB.householdServiceDay(s); });
  add('play.focus', 120, 'daily', 'play', function (s, p) { return !p.travel; }, function (s, p, c) {
    if (!(c.opts && c.opts.skipFocus) && !c.automaticDeed) FB.tickFocus(s);
    else FB.validateFocus(s);
  });
  add('play.socialAttention', 130, 'daily', 'play', null, function (s) { FB.tickSocialAttention(s); });
  add('calendar.advance', 140, 'daily', 'both', null, function (s, p, c) {
    s.turn++;
    s.date.day++;
    if (s.date.day > 90) {
      s.date.day = 1;
      s.date.season++;
      c.seasonBoundary = true;
      if (s.date.season > 3) { s.date.season = 0; s.date.year++; c.newYear = true; }
    }
  });
  add('building.boundary', 150, 'daily', 'both', null, function (s) { FB.buildingSeasons.boundary(s); });
  add('building.dayAI', 160, 'daily', 'both', null, function (s) { FB.buildingSeasons.dayAI(s); });
  add('government.supportDay', 170, 'daily', 'both', function () { return FB.governments.support; }, function (s) { FB.governments.support.day(s); });
  add('play.firstDayActivation', 180, 'daily', 'play', null, function (s, p, c) {
    c.helpers.noteCampaignActivation('firstDayAdvanced', 'first-day-advanced');
  });
  add('government.localDay', 190, 'daily', 'both', function () { return FB.localGovernmentDay; }, function (s) { FB.localGovernmentDay(s); });
  add('world.scripted', 200, 'daily', 'both', null, function (s) { FB.scriptedTick(s); });
  add('world.historicalAmbitions', 210, 'seasonBoundary', 'both', function () { return FB.historicalAmbitionsSeason; }, function (s) { FB.historicalAmbitionsSeason(s); });
  add('world.fortifications', 220, 'daily', 'both', function () { return FB.fortificationDay; }, function (s) { FB.fortificationDay(s); });
  add('world.settlementFounding', 230, 'daily', 'both', function () { return FB.settlementFoundingDay; }, function (s) { FB.settlementFoundingDay(s); });
  add('religion.headRecovery', 240, 'daily', 'both', function () { return FB.religiousHeadRecoveryTick; }, function (s) { FB.religiousHeadRecoveryTick(s); });
  add('religion.papacyDay', 250, 'daily', 'both', function (s) { return FB.papacyDay && FB.systemAvailable(s, 'papacy'); }, function (s) { FB.papacyDay(s); });
  add('guild.monopoly', 260, 'daily', 'both', function () { return FB.guildMonopolyTick; }, function (s) { FB.guildMonopolyTick(s); });
  add('modifiers.day', 270, 'daily', 'both', function () { return FB.modifierTick; }, function (s) { FB.modifierTick(s); });
  add('intrigue.day', 280, 'daily', 'both', function () { return FB.intrigueDay; }, function (s) { FB.intrigueDay(s); });
  add('politics.day', 290, 'daily', 'both', function () { return FB.politicsDay; }, function (s) { FB.politicsDay(s); });

  // Observe exits after its refresh: no personal accounting, life, events or save.
  add('observe.marketSeason', 300, 'seasonBoundary', 'observe', function () { return FB.marketSeason; }, function (s) { FB.marketSeason(s); });
  add('observe.treasurySeason', 310, 'seasonBoundary', 'observe', function () { return FB.treasurySeason; }, function (s) { FB.treasurySeason(s); });
  add('observe.authoritySeason', 320, 'seasonBoundary', 'observe', function () { return FB.authoritySeason; }, function (s) { FB.authoritySeason(s); });
  add('observe.storySeason', 330, 'seasonBoundary', 'observe', function () { return FB.stories; }, function (s) { FB.stories.season(s); });
  add('observe.treasuryRevalue', 340, 'newYear', 'observe', function () { return FB.treasuryRevalue; }, function (s) { FB.treasuryRevalue(s, 1); });
  add('observe.intrigueSeason', 350, 'seasonBoundary', 'observe', function () { return FB.intrigueSeason; }, function (s) { FB.intrigueSeason(s); });
  add('observe.techSeason', 360, 'seasonBoundary', 'observe', function () { return FB.techSeason; }, function (s) { FB.techSeason(s, false); });
  add('observe.warSeason', 370, 'seasonBoundary', 'observe', null, function (s) { FB.playerWarTick(s); });
  add('observe.worldYear', 380, 'newYear', 'observe', null, function (s) { FB.worldTick(s); });
  add('observe.authorityYear', 390, 'newYear', 'observe', function () { return FB.authorityYear; }, function (s) { FB.authorityYear(s); });
  add('observe.storyYear', 400, 'newYear', 'observe', function () { return FB.stories; }, function (s) { FB.stories.year(s); });
  add('observe.federatePrepare', 410, 'daily', 'observe', function () { return FB.federatePrepareDay; }, function (s) { FB.federatePrepareDay(s); });
  add('observe.mobile', 420, 'daily', 'observe', function () { return FB.mobileDay; }, function (s) { FB.mobileDay(s); });
  add('observe.armies', 430, 'daily', 'observe', null, function (s) { FB.armyTick(s); });
  add('observe.federates', 440, 'daily', 'observe', function () { return FB.federateDay; }, function (s) { FB.federateDay(s); });
  add('observe.storyDay', 450, 'daily', 'observe', function () { return FB.stories; }, function (s) { FB.stories.day(s); });
  add('observe.holyWarDay', 460, 'daily', 'observe', function (s) { return FB.greatHolyWarTick && FB.systemAvailable(s, 'great_holy_wars'); }, function (s) { FB.greatHolyWarTick(s); });
  add('observe.tournamentReconcile', 470, 'daily', 'observe', function (s) { return FB.tournaments && FB.systemAvailable(s, 'tournaments'); }, function (s, p, c) {
    // One shared availability check encloses these three calls in this branch.
    c.observerTournaments = true;
    FB.tournaments.reconcile(s);
  });
  add('observe.tournamentSeason', 471, 'seasonBoundary', 'observe', function (s, p, c) { return c.observerTournaments; }, function (s) { FB.tournaments.season(s); });
  add('observe.tournamentTick', 472, 'daily', 'observe', function (s, p, c) { return c.observerTournaments; }, function (s) { FB.tournaments.tick(s); });
  add('observe.clearEvents', 480, 'daily', 'observe', null, function (s) { s.eventQueue.length = 0; });
  add('observe.refresh', 490, 'daily', 'observe', null, refresh);
  add('observe.complete', 500, 'daily', 'observe', null, function (s, p, c) { c.stop(c.seasonBoundary ? 'season' : 'day'); });

  add('play.institutionsDay', 510, 'daily', 'play', function () { return FB.institutionsDay; }, function (s) { FB.institutionsDay(s); });
  add('play.financeDay', 520, 'daily', 'play', function () { return FB.financeDay; }, function (s) { FB.financeDay(s); });
  add('play.intrigueSeason', 530, 'seasonBoundary', 'play', function () { return FB.intrigueSeason; }, function (s) { FB.intrigueSeason(s); });
  add('play.intrigueDeath', 540, 'seasonBoundary', 'play', null, function (s, p, c) { if (p.dead) c.stop('dead'); });
  add('play.marketSeason', 550, 'seasonBoundary', 'play', function () { return FB.marketSeason; }, function (s) { FB.marketSeason(s); });
  add('play.taxQuote', 560, 'seasonBoundary', 'play', null, function (s, p, c) {
    c.taxParts = FB.station.isLanded(p, s) ? FB.playerTaxParts(s) : null;
    c.income = c.taxParts ? FB.playerTax(s, c.taxParts) : 0;
  });
  add('play.tournamentSample', 570, 'seasonBoundary', 'play', function (s) { return FB.tournaments && FB.systemAvailable(s, 'tournaments'); }, function (s) { FB.tournaments.samplePlayer(s); });
  add('play.treasurySeason', 580, 'seasonBoundary', 'play', function () { return FB.treasurySeason; }, function (s, p, c) { FB.treasurySeason(s, c.taxParts); });
  add('play.authoritySeason', 590, 'seasonBoundary', 'play', function () { return FB.authoritySeason; }, function (s) { FB.authoritySeason(s); });
  add('play.storySeason', 600, 'seasonBoundary', 'play', function () { return FB.stories; }, function (s) { FB.stories.season(s); });
  add('play.publicIncome', 610, 'seasonBoundary', 'play', null, function (s, p, c) {
    const buildingUpkeep = FB.station.isLanded(p, s)
      ? FB.buildingBonus(s, 'upkeep') + (FB.fortUpkeep ? FB.fortUpkeep(s) : 0) : 0;
    const modifierUpkeep = FB.modifierUpkeep ? FB.modifierUpkeep(s, 'gold') : 0;
    FB.enterpriseList(s); // migrate legacy holdings before either income path
    const publicNet = c.income - buildingUpkeep - modifierUpkeep - FB.playerGovernmentCosts(s, c.taxParts).total;
    if (!FB.treasuryDynasticSeason(s, publicNet, c.taxParts) &&
        !(FB.electivePublicSeason && FB.electivePublicSeason(s, publicNet, c.taxParts))) p.gold += publicNet;
    if (FB.openingGoals) FB.openingGoals.fiscal(s, 'player', c.income);
  });
  add('play.privateIncome', 620, 'seasonBoundary', 'play', null, function (s, p) {
    p.gold += FB.holdingBonus(s, 'gold') + FB.landYield(s) + FB.itemBonus(s, 'gold') +
      (FB.positionBonus ? FB.positionBonus(s, 'gold') : 0);
  });
  // Income precedes necessities so funded wages meet the household's table.
  add('play.livelihoodSeason', 630, 'seasonBoundary', 'play', null, function (s) { FB.livelihoodSeason(s); });
  add('play.publicOfficeSettle', 640, 'seasonBoundary', 'play', function () { return FB.publicOfficeSettle; }, function (s) { FB.publicOfficeSettle(s, null, Math.floor(s.turn / 90), true); });
  add('play.enterpriseUpgrade', 650, 'seasonBoundary', 'play', function () { return FB.enterpriseUpgradeSeason; }, function (s) { FB.enterpriseUpgradeSeason(s); });
  add('play.necessities', 660, 'seasonBoundary', 'play', null, function (s, p) {
    if (FB.marketSettleHouseholdNecessities) FB.marketSettleHouseholdNecessities(s);
    else p.gold -= Math.min(Math.max(0, p.gold), FB.householdUpkeep(s));
  });
  add('play.papacySeason', 670, 'seasonBoundary', 'play', function (s) { return FB.papacySeason && FB.systemAvailable(s, 'papacy'); }, function (s) { FB.papacySeason(s); });
  add('play.abbeySeason', 680, 'seasonBoundary', 'play', function (s) { return FB.abbeySeason && FB.systemAvailable(s, 'abbeys'); }, function (s) { FB.abbeySeason(s); });
  add('play.householdStandards', 690, 'seasonBoundary', 'play', function () { return FB.householdStandardsSeason; }, function (s) { FB.householdStandardsSeason(s); });
  add('play.retainers', 700, 'seasonBoundary', 'play', function () { return FB.retainerSeason; }, function (s) { FB.retainerSeason(s); });
  add('play.enterpriseLabor', 710, 'seasonBoundary', 'play', function () { return FB.enterpriseLaborSeason; }, function (s) { FB.enterpriseLaborSeason(s); });
  add('play.education', 720, 'seasonBoundary', 'play', null, function (s) { FB.educationSeason(s); });
  add('play.prestige', 730, 'seasonBoundary', 'play', null, function (s, p) {
    p.prestige += FB.holdingBonus(s, 'prestige') + FB.itemBonus(s, 'prestige');
  });
  add('play.rankPrestigeYear', 731, 'newYear', 'play', null, function (s, p) { p.prestige += FB.rankPrestigeYearly(s).total; });
  add('play.piety', 740, 'seasonBoundary', 'play', null, function (s, p, c) {
    p.piety += FB.holdingBonus(s, 'piety') + FB.itemBonus(s, 'piety');
    c.landed = FB.station.isLanded(p, s);
    if (c.landed) {
      p.piety += FB.buildingBonus(s, 'piety') + (FB.councilBonus ? FB.councilBonus(s, 'piety') : 0);
    }
  });
  add('play.councilEnsure', 741, 'seasonBoundary', 'play', function (s, p, c) { return c.landed && FB.councilEnsure && FB.systemEnabled(s, 'royal_council'); }, function (s) { FB.councilEnsure(s); });
  add('play.parliamentEnsure', 742, 'seasonBoundary', 'play', function (s, p, c) { return c.landed && FB.parliamentEnsure && FB.systemEnabled(s, 'estates'); }, function (s) { FB.parliamentEnsure(s); });
  add('play.autoBuild', 743, 'seasonBoundary', 'play', function (s, p, c) { return c.landed && c.game.auto.build; }, function (s) { FB.autoBuild(s); });
  add('play.realmPolicy', 750, 'seasonBoundary', 'play', function () { return FB.realmPolicySeason; }, function (s) { FB.realmPolicySeason(s); });
  add('play.reinforcementUpkeep', 760, 'seasonBoundary', 'play', function () { return FB.playerReinforcementUpkeepParts; }, function (s, p) {
    const drilling = FB.playerReinforcementUpkeepParts(s);
    p.gold -= drilling.total + drilling.campaignModifier;
  });
  add('play.techSeason', 770, 'seasonBoundary', 'play', function () { return FB.techSeason; }, function (s, p, c) { FB.techSeason(s, c.game.auto.research); });
  add('play.warSeason', 780, 'seasonBoundary', 'play', null, function (s) { FB.playerWarTick(s); });
  add('play.devastation', 790, 'seasonBoundary', 'play', function () { return FB.devastationSeason; }, function (s) { FB.devastationSeason(s); });
  add('play.holyWarSeason', 800, 'seasonBoundary', 'play', function (s) { return FB.greatHolyWarSeason && FB.systemAvailable(s, 'great_holy_wars'); }, function (s) { FB.greatHolyWarSeason(s); });
  add('play.sacredCustody', 810, 'seasonBoundary', 'play', function (s) { return FB.sacredCustodySeason && FB.systemAvailable(s, 'great_holy_wars'); }, function (s) { FB.sacredCustodySeason(s); });
  add('play.foreignPolicy', 820, 'seasonBoundary', 'play', null, function (s) { FB.tickForeignPolicy(s); });
  add('play.financeSeason', 830, 'seasonBoundary', 'play', null, function (s, p, c) { c.seasonEconomy = FB.financeSeason(s); });
  add('play.fiscalSeason', 840, 'seasonBoundary', 'play', null, function (s, p, c) { FB.fiscalSeason(s, c.seasonEconomy); });
  add('play.rivalry', 850, 'seasonBoundary', 'play', null, function (s) { FB.tickRivalry(s); });
  add('play.seasonLedger', 860, 'seasonBoundary', 'play', null, function (s, p) {
    if (s.seasonMark) {
      s.seasonNet = { gold:p.gold - s.seasonMark.gold, prestige:p.prestige - s.seasonMark.prestige,
        piety:p.piety - s.seasonMark.piety };
    }
    s.seasonMark = { gold:p.gold, prestige:p.prestige, piety:p.piety };
  });
  add('play.scheduleSlots', 870, 'seasonBoundary', 'play', null, function (s, p, c) { c.helpers.scheduleSlots(s); });
  // Annual coin revaluation belongs after the closed winter ledger.
  add('play.financeYear', 880, 'newYear', 'play', null, function (s, p, c) { FB.financeYear(s, c.seasonEconomy); });
  add('play.worldYear', 890, 'newYear', 'play', null, function (s, p, c) { c.annualContext = FB.worldTick(s); });
  add('play.authorityYear', 900, 'newYear', 'play', function () { return FB.authorityYear; }, function (s) { FB.authorityYear(s); });
  add('play.storyYear', 910, 'newYear', 'play', function () { return FB.stories; }, function (s) { FB.stories.year(s); });
  add('play.tournamentSeason', 920, 'seasonBoundary', 'play', function (s) { return FB.tournaments && FB.systemAvailable(s, 'tournaments'); }, function (s) { FB.tournaments.season(s); });
  add('play.autosave', 930, 'seasonBoundary', 'play', null, function () { FB.save.autosave(); });
  add('play.yearlyLife', 940, 'newYear', 'play', null, function (s, p, c) { c.helpers.yearlyLife(s, c.annualContext); });
  add('play.yearlyDeath', 950, 'newYear', 'play', null, function (s, p, c) { if (p.dead) c.stop('dead'); });

  add('play.fiscalDay', 960, 'daily', 'play', null, function (s) { FB.fiscalDay(s); });
  add('play.births', 970, 'daily', 'play', null, function (s, p, c) { c.helpers.birthTick(s); });
  add('play.federatePrepare', 980, 'daily', 'play', function () { return FB.federatePrepareDay; }, function (s) { FB.federatePrepareDay(s); });
  add('play.mobile', 990, 'daily', 'play', function () { return FB.mobileDay; }, function (s) { FB.mobileDay(s); });
  add('play.armies', 1000, 'daily', 'play', null, function (s) { FB.armyTick(s); });
  add('play.federates', 1010, 'daily', 'play', function () { return FB.federateDay; }, function (s) { FB.federateDay(s); });
  add('play.storyDay', 1020, 'daily', 'play', function () { return FB.stories; }, function (s) { FB.stories.day(s); });
  add('play.holyWarDay', 1030, 'daily', 'play', function (s) { return FB.greatHolyWarTick && FB.systemAvailable(s, 'great_holy_wars'); }, function (s) { FB.greatHolyWarTick(s); });
  add('play.tournamentReconcile', 1040, 'daily', 'play', function (s) { return FB.tournaments && FB.systemAvailable(s, 'tournaments'); }, function (s) { FB.tournaments.reconcile(s); });
  add('play.travel', 1050, 'daily', 'play', function () { return FB.travelTick; }, function (s) { FB.travelTick(s); });
  add('play.religiousActivity', 1060, 'daily', 'play', function () { return FB.religiousActivityTick; }, function (s) { FB.religiousActivityTick(s); });
  add('play.tournamentTick', 1070, 'daily', 'play', function (s) { return FB.tournaments && FB.systemAvailable(s, 'tournaments'); }, function (s) { FB.tournaments.tick(s); });
  add('play.giftDelivery', 1080, 'daily', 'play', function () { return FB.giftDeliveryTick; }, function (s) { FB.giftDeliveryTick(s); });
  add('play.peakTitle', 1090, 'daily', 'play', null, function (s, p) {
    if (s.peakTier === undefined || FB.station.above(p, s.peakTier, s)) {
      s.peakTier = p.tier; s.peakTitleData = FB.titleSnapshot(s);
    }
  });
  add('play.freedom', 1100, 'daily', 'play', function () { return FB.freedomDay; }, function (s) { FB.freedomDay(s); });
  add('play.householdServiceAfterTravel', 1110, 'daily', 'play', function () { return FB.householdServiceDay; }, function (s) { FB.householdServiceDay(s); });
  add('play.tenure', 1120, 'daily', 'play', function (s) { return FB.tenureDay && FB.tenureEnabled(s); }, function (s) { FB.tenureDay(s); });
  add('play.serfStory', 1130, 'daily', 'play', function () { return FB.reconcileSerfStory; }, function (s) { FB.reconcileSerfStory(s); });
  add('play.serfNeighbor', 1140, 'daily', 'play', function () { return FB.reconcileSerfNeighborConsequence; }, function (s) { FB.reconcileSerfNeighborConsequence(s); });
  add('play.educationStory', 1150, 'daily', 'play', function () { return FB.educationStoryDay; }, function (s) { FB.educationStoryDay(s); });
  add('play.pickEvents', 1160, 'daily', 'play', null, function (s, p, c) { c.events = FB.pickDailyEvents(s); });
  add('play.refresh', 1170, 'daily', 'play', null, refresh);
  add('play.dispatchEvents', 1180, 'daily', 'play', function (s, p, c) { return c.events.length; }, function (s, p, c) {
    if (FB.ui.runEvents(c.events, { syncRulers:c.seasonBoundary })) c.stop('event');
    // Autoresolve already calls afterEvents; never repeat its mortality/promotion pass.
    else c.stop(dayResult(p, c));
  });
  add('play.afterEvents', 1190, 'daily', 'play', null, function (s, p, c) {
    c.game.afterEvents({ syncRulers:c.seasonBoundary, liveTick:!!(c.opts && c.opts.liveTick),
      deferUi:!!(c.opts && c.opts.deferUi) });
  });
  add('play.complete', 1200, 'daily', 'play', null, function (s, p, c) { c.stop(dayResult(p, c)); });
})();
