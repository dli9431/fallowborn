'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/travel.js',
  'js/economy.js',
  'js/events.js',
  'js/items.js',
  'js/save.js',
  'js/ui_modals.js',
  'data/events_lifepaths.js',
  'data/events_travel.js',
  'data/travel.js',
  'data/economy.js',
  'data/map_data.js',
  'data/technology.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('mercenary contracts pay, complete, and never strand the traveler',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      let state = FB.state;
      const me = state.chars[state.player.charId];
      state.player.tier = 1;
      state.player.gold = 100;
      me.sex = 'm';
      me.career = {
        profession:'soldier', rank:'journeyman', experience:4,
        startedYear:state.date.year - 4, guildRank:'none', guildStanding:0,
        chosen:true
      };
      state.player.profession = 'soldier';

      const homeRealm = state.owner && state.owner[state.player.provinceId];
      const destination = FB.travelDestinations(state, 'service').filter(
        function (d) {
          const r = state.realms[d.destinationRealm];
          return r && !r.liege && d.destinationRealm !== homeRealm && r.capital === d.destinationId;
        })[0];
      if (!destination) return { setup:false };
      /* wars are sovereign-level: a war planted on a vassal realm is
         invisible to the contract offer and stripped by repairWars */
      const warRealmId = destination.destinationRealm;
      // clear every war, then set the patron at war with a war-free sovereign
      for (const rid in state.realms) {
        if (state.realms[rid]) delete state.realms[rid].war;
      }
      let enemyId = null;
      for (const rid in state.realms) {
        const realm = state.realms[rid];
        if (rid !== warRealmId && rid !== homeRealm && realm && realm.alive &&
            !realm.liege) {
          enemyId = rid;
          break;
        }
      }
      state.realms[warRealmId].war = { enemy:enemyId, startedTurn:state.turn };

      const offer = FB.mercContractOffer(state, {
        purpose:'service', destinationId:destination.destinationId,
        destinationRealm:warRealmId
      });
      const started = FB.travelStart(state, 'service',
        destination.destinationId, warRealmId);
      state.player.travel.remainingRoute = [];
      state.player.travel.legDaysLeft = 0;
      FB.travelTick(state);
      const capstoneItem = state.eventQueue.filter(function (item) {
        return item.id === 'travel_capstone_mercenary';
      })[0];
      const capstone = FB.eventById('travel_capstone_mercenary');
      const receipt = capstoneItem && FB.resolveEventOption(state, capstone,
        capstone.options[0], capstoneItem.ctx, { automated:false });
      const contractAfterAccept = state.player.travel.contract
        ? JSON.parse(JSON.stringify(state.player.travel.contract)) : null;

      // a save/load mid-contract preserves the record exactly
      FB.save.restore(JSON.parse(FB.save.serialize()));
      state = FB.state;
      const restoredContract = state.player.travel.contract
        ? JSON.parse(JSON.stringify(state.player.travel.contract)) : null;

      const goldBeforePay = state.player.gold;
      state.turn += 90;
      FB.travelTick(state);
      const seasonPay = state.player.gold - goldBeforePay;
      state.turn = state.player.travel.contract.startedTurn +
        FBDATA.balance.mercContractSeasons * 90;
      FB.travelTick(state);
      const paidSeasons = state.player.travel.contract.paidSeasons;
      const completionItem = state.eventQueue.filter(function (item) {
        return item.id === 'travel_merc_contract_complete';
      })[0];
      const completion = FB.eventById('travel_merc_contract_complete');
      const goldBeforePurse = state.player.gold;
      const prestigeBefore = state.player.prestige;
      FB.resolveEventOption(state, completion, completion.options[0],
        completionItem.ctx, { automated:false });
      const standards = function () {
        return Object.keys(state.itemInstances || {}).filter(function (ref) {
          return state.itemInstances[ref].defId === 'company_standard';
        }).length;
      };
      const purse = state.player.gold - goldBeforePurse;
      const standardsAfterCollect = standards();
      const veteran = state.chars[state.player.charId].traits
        .indexOf('veteran') >= 0;
      const phaseAfterCollect = state.player.travel.phase;

      // a second collected term pays again but grants no second standard
      state.player.travel.contract = {
        realmId:warRealmId, startedTurn:state.turn - 360,
        paidSeasons:4, renewals:1
      };
      const goldBeforeSecond = state.player.gold;
      FB.fns.merc_contract_collect(state);
      const secondPurse = state.player.gold - goldBeforeSecond;
      const standardsAfterSecond = standards();

      // walking home finishes the journey at the household home
      state.player.travel.remainingRoute = [];
      FB.travelTick(state);
      const homeAtEnd = !state.player.travel &&
        FB.travelLocation(state).id === state.player.provinceId;

      return {
        setup:true,
        offer:offer,
        started:started,
        capstoneQueued:!!capstoneItem,
        accepted:!!receipt,
        contractAfterAccept:contractAfterAccept,
        restoredContract:restoredContract,
        seasonPay:seasonPay,
        paidSeasons:paidSeasons,
        completionQueued:!!completionItem,
        purse:purse,
        prestigeGain:state.player.prestige - prestigeBefore,
        standardsAfterCollect:standardsAfterCollect,
        veteran:veteran,
        phaseAfterCollect:phaseAfterCollect,
        secondPurse:secondPurse,
        standardsAfterSecond:standardsAfterSecond,
        homeAtEnd:homeAtEnd
      };
    });

    expect(result.setup).toBe(true);
    expect(result.offer).toBe(true);
    expect(result.started).toBe(true);
    expect(result.capstoneQueued).toBe(true);
    expect(result.accepted).toBe(true);
    expect(result.contractAfterAccept).toMatchObject({
      paidSeasons:0, renewals:0
    });
    expect(result.restoredContract).toEqual(result.contractAfterAccept);
    expect(result.seasonPay).toBe(6);
    expect(result.paidSeasons).toBe(4);
    expect(result.completionQueued).toBe(true);
    expect(result.purse).toBe(20);
    expect(result.prestigeGain).toBe(8);
    expect(result.standardsAfterCollect).toBe(1);
    expect(result.veteran).toBe(true);
    expect(result.phaseAfterCollect).toBe('return');
    expect(result.secondPurse).toBe(20);
    expect(result.standardsAfterSecond).toBe(1);
    expect(result.homeAtEnd).toBe(true);
  });

test('an abandoned mercenary contract costs Standing and still reaches home',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const me = state.chars[state.player.charId];
      state.player.tier = 1;
      state.player.gold = 100;
      me.sex = 'm';
      me.career = {
        profession:'soldier', rank:'journeyman', experience:4,
        startedYear:state.date.year - 4, guildRank:'none', guildStanding:0,
        chosen:true
      };
      state.player.profession = 'soldier';
      const homeRealm = state.owner && state.owner[state.player.provinceId];
      const destination = FB.travelDestinations(state, 'service').filter(
        function (d) {
          const r = state.realms[d.destinationRealm];
          return r && !r.liege && d.destinationRealm !== homeRealm && r.capital === d.destinationId;
        })[0];
      if (!destination) return { setup:false };
      /* wars are sovereign-level: a war planted on a vassal realm is
         invisible to the contract offer and stripped by repairWars */
      const warRealmId = destination.destinationRealm;
      let enemyId = null;
      for (const rid in state.realms) {
        const realm = state.realms[rid];
        if (rid !== warRealmId && rid !== homeRealm && realm && realm.alive &&
            !realm.liege) {
          enemyId = enemyId || rid;
        }
        if (realm && realm.war) delete realm.war;
      }
      state.realms[warRealmId].war = { enemy:enemyId, startedTurn:state.turn };

      FB.travelStart(state, 'service', destination.destinationId, warRealmId);
      state.player.travel.remainingRoute = [];
      state.player.travel.legDaysLeft = 0;
      FB.travelTick(state);
      /* the teleport above never marched a leg, so the record still points at
         home; an arrived traveler stands at the destination */
      state.player.travel.currentId = destination.destinationId;
      FB.fns.merc_contract_accept(state);
      // serve the minimum stay but not the term, then turn back
      state.turn += 90;
      FB.travelTick(state);
      const before = FB.standingOf(state, { kind:'realm', id:warRealmId });
      const turnedBack = FB.travelTurnBack(state);
      state.player.travel.remainingRoute = [];
      FB.travelTick(state);
      const after = FB.standingOf(state, { kind:'realm', id:warRealmId });
      return {
        setup:true,
        turnedBack:turnedBack,
        standingChange:after - before,
        home:!state.player.travel &&
          FB.travelLocation(state).id === state.player.provinceId
      };
    });

    expect(result.setup).toBe(true);
    expect(result.turnedBack).toBe(true);
    expect(result.standingChange).toBe(-8);
    expect(result.home).toBe(true);
  });

test('expeditions reach foreign cultures and journal the first one only',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      let state = FB.state;
      const me = state.chars[state.player.charId];
      state.player.tier = 1;
      state.player.gold = 100;
      const eligible = FB.travelEligible(state, 'expedition');
      const destinations = FB.travelDestinations(state, 'expedition');
      const allForeign = destinations.every(function (d) {
        const pr = FB.world.byId[d.destinationId];
        return pr && pr.culture && pr.culture !== me.culture &&
          d.destinationId !== state.player.provinceId && d.route.length > 0;
      });
      const destination = destinations[0];
      if (!destination) return { eligible:eligible, count:0 };
      const started = FB.travelStart(state, 'expedition',
        destination.destinationId, null);

      state.player.travel.remainingRoute = [];
      state.player.travel.legDaysLeft = 0;
      FB.travelTick(state);
      const capstoneItem = state.eventQueue.filter(function (item) {
        return item.id === 'travel_capstone_expedition';
      })[0];

      // a save/load mid-stay preserves the journey
      FB.save.restore(JSON.parse(FB.save.serialize()));
      state = FB.state;
      const restoredPurpose = state.player.travel.purpose;

      const capstone = FB.eventById('travel_capstone_expedition');
      const journals = function () {
        return Object.keys(state.itemInstances || {}).filter(function (ref) {
          return state.itemInstances[ref].defId === 'travel_journal';
        }).length;
      };
      FB.resolveEventOption(state, capstone, capstone.options[0],
        capstoneItem.ctx, { automated:false });
      const journalsAfterRecord = journals();
      const journalFlag = !!state.player.flags.expedition_journal;
      const completedStay = !!state.player.travel.completed;
      // recording again cannot duplicate the durable work
      FB.fns.travel_expedition_record(state);
      const journalsAfterRepeat = journals();

      // the road home always remains available
      state.turn += 90;
      const returned = FB.travelReturn(state);
      state.player.travel.remainingRoute = [];
      FB.travelTick(state);
      const home = !state.player.travel &&
        FB.travelLocation(state).id === state.player.provinceId;

      return {
        eligible:eligible,
        count:destinations.length,
        allForeign:allForeign,
        started:started,
        capstoneQueued:!!capstoneItem,
        restoredPurpose:restoredPurpose,
        journalsAfterRecord:journalsAfterRecord,
        journalFlag:journalFlag,
        completedStay:completedStay,
        journalsAfterRepeat:journalsAfterRepeat,
        returned:returned,
        home:home
      };
    });

    expect(result.eligible).toBe(true);
    expect(result.count).toBeGreaterThan(0);
    expect(result.allForeign).toBe(true);
    expect(result.started).toBe(true);
    expect(result.capstoneQueued).toBe(true);
    expect(result.restoredPurpose).toBe('expedition');
    expect(result.journalsAfterRecord).toBe(1);
    expect(result.journalFlag).toBe(true);
    expect(result.completedStay).toBe(true);
    expect(result.journalsAfterRepeat).toBe(1);
    expect(result.returned).toBe(true);
    expect(result.home).toBe(true);
  });

test('soldier, physician, scholar, and author paths gate and resolve',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const me = state.chars[state.player.charId];
      const byId = function (id) { return FB.eventById(id); };
      const out = {};

      // soldier entry and command stories: wartime-only, battle-tested
      me.sex = 'm';
      me.career = {
        profession:'soldier', rank:'journeyman', experience:4,
        startedYear:state.date.year - 4, guildRank:'none', guildStanding:0,
        chosen:true
      };
      state.player.profession = 'soldier';
      state.player.flags.seen_battle = 1;
      const homeRealmId = state.owner[state.player.provinceId];
      let enemyId = null;
      for (const rid in state.realms) {
        if (rid !== homeRealmId && state.realms[rid].alive) {
          enemyId = enemyId || rid;
        }
      }
      const originalWar = state.realms[homeRealmId].war;
      state.realms[homeRealmId].war = { enemy:enemyId, startedTurn:state.turn };
      out.scoutsWar = FB.checkTrigger(state, byId('soldier_command_scouts').trigger);
      delete state.realms[homeRealmId].war;
      out.scoutsPeace = FB.checkTrigger(state, byId('soldier_command_scouts').trigger);
      out.drillPeace = FB.checkTrigger(state, byId('soldier_muster_drill').trigger);
      if (originalWar) state.realms[homeRealmId].war = originalWar;
      // command risk: the failure branch is a real wound
      const healthBefore = me.health;
      FB.applyEffects(state,
        byId('soldier_command_scouts').options[0].failure.effects, {},
        byId('soldier_command_scouts'));
      out.scoutsWound = me.health - healthBefore;
      out.scoutsScarred = me.traits.indexOf('scarred') >= 0;

      // physician stories: active practice gate, landed biography excluded
      me.career = {
        profession:'physician', rank:'journeyman', experience:4,
        startedYear:state.date.year - 4, guildRank:'none', guildStanding:0,
        chosen:true
      };
      state.player.profession = 'physician';
      out.outbreakGate = FB.checkTrigger(state, byId('physician_outbreak').trigger);
      state.player.tier = 3;
      out.outbreakLanded = FB.checkTrigger(state, byId('physician_outbreak').trigger);
      out.remediesLanded = FB.checkTrigger(state,
        byId('physician_book_of_remedies').trigger);
      out.examsLanded = FB.careerExamOptions(state, me).length;
      state.player.tier = 1;
      me.career.specialization = 'physician';
      me.career.rank = 'master';
      out.remediesGate = FB.checkTrigger(state,
        byId('physician_book_of_remedies').trigger);
      FB.applyEffects(state,
        byId('physician_book_of_remedies').options[0].effects, {},
        byId('physician_book_of_remedies'));
      out.remediesItem = Object.keys(state.itemInstances || {}).some(
        function (ref) {
          return state.itemInstances[ref].defId === 'book_of_remedies';
        });

      // scholar and author stories, with a commissioned durable work
      me.career = {
        profession:'scholar', rank:'master', specialization:'author',
        experience:10, startedYear:state.date.year - 10,
        guildRank:'none', guildStanding:0, chosen:true
      };
      state.player.profession = 'scholar';
      out.disputationGate = FB.checkTrigger(state,
        byId('scholar_disputation').trigger);
      out.authorGate = FB.checkTrigger(state, byId('author_commission').trigger);
      const itemsBefore = Object.keys(state.itemInstances || {});
      FB.fns.lifepath_author_work(state);
      const itemsAfter = Object.keys(state.itemInstances || {});
      const newRef = itemsAfter.filter(function (ref) {
        return itemsBefore.indexOf(ref) < 0;
      })[0] || null;
      out.authorWorkGranted = itemsAfter.length === itemsBefore.length + 1;
      out.authorWorkDef = newRef && state.itemInstances[newRef].defId;
      // astronomer stories require the specialization
      out.astronomerAsAuthor = FB.checkTrigger(state,
        byId('astronomer_observations').trigger);
      me.career.specialization = 'astronomer';
      out.astronomerGate = FB.checkTrigger(state,
        byId('astronomer_observations').trigger);
      FB.applyEffects(state,
        byId('astronomer_star_tables').options[0].effects, {},
        byId('astronomer_star_tables'));
      out.starTables = Object.keys(state.itemInstances || {}).some(
        function (ref) {
          return state.itemInstances[ref].defId === 'star_tables';
        });
      return out;
    });

    expect(result.scoutsWar).toBe(true);
    expect(result.scoutsPeace).toBe(false);
    expect(result.drillPeace).toBe(true);
    expect(result.scoutsWound).toBe(-2);
    expect(result.scoutsScarred).toBe(true);
    expect(result.outbreakGate).toBe(true);
    expect(result.outbreakLanded).toBe(false);
    expect(result.remediesLanded).toBe(false);
    expect(result.examsLanded).toBe(0);
    expect(result.remediesGate).toBe(true);
    expect(result.remediesItem).toBe(true);
    expect(result.disputationGate).toBe(true);
    expect(result.authorGate).toBe(true);
    expect(result.authorWorkGranted).toBe(true);
    expect(['book_of_laws', 'chronicle_of_princes', 'treatise_on_virtue',
      'compendium_of_nature']).toContain(result.authorWorkDef);
    expect(result.astronomerAsAuthor).toBe(false);
    expect(result.astronomerGate).toBe(true);
    expect(result.starTables).toBe(true);
  });

test('authored works survive save/load as semantic items',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      let state = FB.state;
      const me = state.chars[state.player.charId];
      state.player.profession = 'scholar';
      me.career = {
        profession:'scholar', rank:'master', specialization:'author',
        experience:10, startedYear:state.date.year - 10,
        guildRank:'none', guildStanding:0, chosen:true
      };
      FB.fns.lifepath_author_work(state);
      const refs = Object.keys(state.itemInstances || {});
      const ref = refs[refs.length - 1];
      const defId = state.itemInstances[ref].defId;
      const name = FB.itemNameReadOnly(state, ref);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      state = FB.state;
      const restored = FB.resolveItem(state, ref);
      return {
        defId:defId,
        restoredDef:restored && restored.defId,
        restoredName:restored && FB.itemNameReadOnly(state, ref),
        name:name,
        owned:(state.player.items || []).indexOf(ref) >= 0
      };
    });

    expect(result.restoredDef).toBe(result.defId);
    expect(result.restoredName).toBe(result.name);
    expect(result.owned).toBe(true);
  });

test('visible and autoresolved life-path choices apply equivalent effects',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      let state = FB.state;
      const me = state.chars[state.player.charId];
      me.career = {
        profession:'physician', rank:'journeyman', experience:4,
        startedYear:state.date.year - 4, guildRank:'none', guildStanding:0,
        chosen:true
      };
      state.player.profession = 'physician';
      const event = FB.eventById('physician_outbreak');
      const baseline = JSON.parse(FB.save.serialize());
      const oldAuto = FB.game.auto;
      function snapshot() {
        const s = FB.state;
        return {
          gold:s.player.gold,
          prestige:s.player.prestige,
          pop:s.player.pop,
          health:s.chars[s.player.charId].health
        };
      }

      FB.game.auto = { all:true, minor:true, major:true, war:true, style:'first' };
      FB.setRngState(24680);
      FB.ui.runEvents([{ id:event.id, ctx:{}, rnd:true }]);
      const automated = snapshot();

      FB.save.restore(baseline);
      FB.setRngState(24680);
      state = FB.state;
      const ready = event.options.filter(function (option) {
        return FB.eventOptionStatus(state, event, option, {}).ready;
      });
      const pick = ready[0];
      const chance = FB.namedChance(state, pick.chance);
      const success = FB.chance(chance);
      FB.applyEffects(state, pick.effects, {}, event);
      const branch = success ? pick.success : pick.failure;
      FB.applyEffects(state, branch.effects, {}, event);
      const visible = snapshot();
      FB.game.auto = oldAuto;
      return { automated:automated, visible:visible };
    });

    expect(result.automated).toEqual(result.visible);
  });

test('life-path technology impact reviews pass the validator',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const reviews = FBDATA.techImpactReviews.features;
      return {
        errors:FB.validateTechnologyData(),
        entries:[
          'soldier_command_assignments', 'physician_practice_stories',
          'learned_master_works', 'mercenary_contracts',
          'adventuring_expeditions'
        ].map(function (id) { return reviews[id] && reviews[id].mode; })
      };
    });

    expect(result.errors).toEqual([]);
    expect(result.entries).toEqual(['none', 'none', 'none', 'none', 'none']);
  });
