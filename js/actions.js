/* Fallowborn — player activity.
   FOCUSES run every day until changed (work, drill, prayer...).
   INSTANTS are one-shot deeds (poach, scheme, petitions...) that spend the day
   and may have day-cooldowns. Daily rates are tuned so a season (90 days) of a
   focus roughly equals one old seasonal deed. */
window.FB = window.FB || {};

(function () {
  'use strict';

  const D = 90; // days per season

  function me(state) { return state.chars[state.player.charId]; }
  function adult(state) { return FB.ageOf(me(state), state.date.year) >= 16; }
  function female(state) { return me(state).sex === 'f'; }
  // disguised in the ranks: any live chapter of the Sweet Polly Oliver chain
  // (events_peasant.js) means she is afield with the army, not at home — her
  // focus options become a soldier's, not a housewife's or a market-day's
  function afield(state) {
    const f = state.player.flags;
    return !!(f.polly_1 || f.polly_2 || f.polly_3 || f.polly_4 || f.polly_reunion);
  }
  function suitorReady(state) {
    return !!(state.player.flags.courting && FB.getRole(state, 'suitor'));
  }
  /* daily chance equivalent to a once-per-season probability */
  function dch(seasonalProb) { return FB.chance(seasonalProb / D); }
  function skillDch(seasonalProb) {
    const rate = FBDATA.balance.focusSkillGainRate;
    return dch(seasonalProb * (rate === undefined ? 1 : rate));
  }
  function skillUp(state, key) {
    const m = me(state);
    if (!FB.gainSkill(m, key, 1)) return; // soft-capped: the point didn't land
    FB.news(state, FB.msg('news.action.skill_improves', {
      forms: {
        select: 'value', param: 'skill', cases: {
          dip: '📈 Your diplomacy improves ({value}).',
          mar: '📈 Your martial improves ({value}).',
          ste: '📈 Your stewardship improves ({value}).',
          int: '📈 Your intrigue improves ({value}).',
          lea: '📈 Your learning improves ({value}).',
          other: '📈 Your skill improves ({value}).'
        }
      }
    }, { skill: key, value: FB.skillOf(m, key) }));
  }

  /* ================= FOCUSES (daily) =================
     gain (optional): the focus's expected per-season gold/prestige/piety,
     shown in the topbar stat breakdown. It mirrors tick's trickle (random
     ranges at their midpoint) — a changed tick wants its gain changed too. */
  FB.focuses = [

  { id: 'study', label: '📖 Study', desc: function () { return 'Learn from whoever will teach you.'; },
    show: function (s) { return !adult(s); },
    tick: function (s) { if (skillDch(0.5)) skillUp(s, FB.pick(['lea', 'ste', 'dip'])); } },
  { id: 'play', label: '🪁 Play', desc: function () { return 'Childhood is short. Spend it well.'; },
    show: function (s) { return !adult(s); },
    tick: function (s) {
      me(s).health = FB.clamp(me(s).health + 0.012, 0, 10);
      // girls are schooled in conduct and letters, not at arms
      if (skillDch(0.3)) skillUp(s, me(s).sex === 'f' ? 'dip' : 'mar');
    } },

  { id: 'rest', label: '🛌 Rest and mend', desc: function () { return 'Recover strength, slowly.'; },
    show: adult,
    tick: function (s) { me(s).health = FB.clamp(me(s).health + 0.014, 0, 10); } },
  { id: 'pray', label: '🙏 Keep the faith', desc: function () { return 'Daily devotions. (+piety)'; },
    show: adult,
    tick: function (s) {
      const z = me(s).traits.indexOf('zealous') >= 0 ? 2 : 0;
      s.player.piety += (3 + z) / D;
      const pr = FB.getRole(s, 'priest', false);
      if (pr) pr.opinion = FB.clamp(pr.opinion + 2 / D, -100, 100);
    },
    gain: function (s) { return { piety: 3 + (me(s).traits.indexOf('zealous') >= 0 ? 2 : 0) }; } },
  { id: 'toil', label: '🌾 Toil in the lord’s fields',
    desc: function () { return 'Hard bread, hard-earned.'; },
    show: function (s) { return s.player.tier === 0 && adult(s); },
    tick: function (s) {
      s.player.gold += FB.rf(FBDATA.balance.serfWage[0], FBDATA.balance.serfWage[1]) / D;
      if (dch(0.1)) {
        me(s).health = Math.max(0, me(s).health - 1);
        FB.news(s, FB.msg('news.action.labor_hurts', 'The labor grinds you down.', {}));
      }
    },
    gain: function () {
      return { gold: (FBDATA.balance.serfWage[0] + FBDATA.balance.serfWage[1]) / 2 };
    } },
  { id: 'militia', label: '🛡 Drill with the levy',
    desc: function () { return 'Spear practice on the green. (+martial over time)'; },
    show: function (s) { return s.player.tier <= 1 && adult(s) && s.player.profession !== 'monk' && !female(s); },
    tick: function (s) { if (skillDch(0.6)) skillUp(s, 'mar'); } },

  { id: 'work_land', label: '🌾 Work your land',
    desc: function () { return 'Your own soil, your own sweat.'; },
    show: function (s) { return s.player.tier === 1 && s.player.profession === 'farmer'; },
    tick: function (s) {
      let g = FB.rf(FBDATA.balance.freeWage[0], FBDATA.balance.freeWage[1]);
      if (s.player.flags.own_ox) g += 1;
      s.player.gold += g / D;
    },
    gain: function (s) {
      let g = (FBDATA.balance.freeWage[0] + FBDATA.balance.freeWage[1]) / 2;
      if (s.player.flags.own_ox) g += 1;
      return { gold: g };
    } },
  { id: 'market', label: '⚖ Haggle at market',
    desc: function () { return 'Turn surplus into silver. (stewardship pays)'; },
    show: function (s) { return s.player.tier === 1 && adult(s); },
    tick: function (s) {
      s.player.gold += (1 + FB.skillOf(me(s), 'ste') / 3) / D;
      if (skillDch(0.35)) skillUp(s, 'ste');
    },
    gain: function (s) { return { gold: 1 + FB.skillOf(me(s), 'ste') / 3 }; } },
  { id: 'keep_house', label: '🧶 Keep the household',
    desc: function () { return 'Keys, stores, and spinning — a well-run house turns thrift into coin. (stewardship pays)'; },
    show: function (s) { return female(s) && adult(s) && s.player.tier <= 2; },
    tick: function (s) {
      s.player.gold += (1 + FB.skillOf(me(s), 'ste') / 3) / D;
      if (skillDch(0.4)) skillUp(s, FB.pick(['ste', 'dip']));
    },
    gain: function (s) { return { gold: 1 + FB.skillOf(me(s), 'ste') / 3 }; } },

  { id: 'craft_work', label: '🔨 Work the bench',
    desc: function () { return 'Steady hands, steady coin.'; },
    show: function (s) { return s.player.profession === 'craftsman' && s.player.tier <= 2; },
    tick: function (s) {
      s.player.gold += (FB.rf(2, 5) + (s.player.flags.guild_member ? 1 : 0)) / D;
      if (skillDch(0.3)) skillUp(s, 'ste');
    },
    gain: function (s) { return { gold: 3.5 + (s.player.flags.guild_member ? 1 : 0) }; } },
  { id: 'trade_run', label: '🐫 Run trade ventures',
    desc: function (s) { return s.player.gold < 10 ? 'Little stock, little profit — but a start.' : 'Buy low here, sell high there.'; },
    show: function (s) { return s.player.profession === 'merchant' && s.player.tier <= 2; },
    tick: function (s) {
      const ste = FB.skillOf(me(s), 'ste');
      const c = 0.55 + ste * 0.015;
      let g = c * (9 + ste / 2) - (1 - c) * 6; // expected seasonal profit
      if (s.player.gold < 10) g *= 0.3;
      s.player.gold += Math.max(0.5, g) / D;
      if (skillDch(0.4)) skillUp(s, 'ste');
    },
    gain: function (s) {
      const ste = FB.skillOf(me(s), 'ste');
      const c = 0.55 + ste * 0.015;
      let g = c * (9 + ste / 2) - (1 - c) * 6;
      if (s.player.gold < 10) g *= 0.3;
      return { gold: Math.max(0.5, g) };
    } },

  { id: 'drill', label: '⚔ Drill at arms',
    desc: function () { return 'The sergeant’s stick teaches quickly.'; },
    show: function (s) {
      return afield(s) ||
        (s.player.tier <= 2 && s.player.profession === 'soldier' && !female(s));
    },
    tick: function (s) {
      s.player.gold += 1 / D;
      if (skillDch(0.7)) skillUp(s, 'mar');
    },
    gain: function () { return { gold: 1 }; } },
  { id: 'stand_guard', label: '🏰 Stand garrison duty',
    desc: function () { return 'Dull, cold, and paid.'; },
    show: function (s) {
      return s.player.tier <= 2 && s.player.profession === 'soldier' && !female(s);
    },
    tick: function (s) {
      s.player.gold += 2 / D;
      const lord = FB.getRole(s, 'lord', false);
      if (lord) lord.opinion = FB.clamp(lord.opinion + 2 / D, -100, 100);
    },
    gain: function () { return { gold: 2 }; } },

  { id: 'copy_books', label: '✒ Copy manuscripts',
    desc: function () { return 'Letters, slowly mastered. (+learning, +piety)'; },
    show: function (s) {
      return s.player.tier <= 2 &&
        (s.player.profession === 'monk' || s.player.profession === 'priest');
    },
    tick: function (s) {
      s.player.piety += 2 / D;
      if (skillDch(0.6)) skillUp(s, 'lea');
      if (dch(0.6)) FB.addTrait(me(s), 'literate');
    },
    gain: function () { return { piety: 2 }; } },
  { id: 'serve_church', label: '🕯 Serve the faithful',
    desc: function () { return 'Alms, sermons, and burials.'; },
    show: function (s) {
      return s.player.tier <= 2 &&
        (s.player.profession === 'monk' || s.player.profession === 'priest');
    },
    tick: function (s) {
      s.player.piety += 4 / D;
      s.player.prestige += 2 / D;
      s.player.pop = FB.clamp(s.player.pop + 2 / D, -100, 100);
    },
    gain: function () { return { piety: 4, prestige: 2 }; } },

  { id: 'manage_manor', label: '🏡 Manage the manor',
    desc: function () { return 'Rents, reeves, and repairs.'; },
    show: function (s) { return s.player.tier === 2; },
    tick: function (s) {
      const B = FBDATA.balance;
      s.player.gold += (FB.rf(B.manorIncome[0], B.manorIncome[1]) + FB.skillOf(me(s), 'ste') / 4) / D;
    },
    gain: function (s) {
      const B = FBDATA.balance;
      return { gold: (B.manorIncome[0] + B.manorIncome[1]) / 2 + FB.skillOf(me(s), 'ste') / 4 };
    } },
  { id: 'serve_lord', label: '🤝 Attend the lord’s hall',
    desc: function () { return 'Be seen, be useful, be remembered.'; },
    show: function (s) { return s.player.tier === 2; },
    tick: function (s) {
      const lord = FB.getRole(s, 'lord', true);
      if (lord) lord.opinion = FB.clamp(lord.opinion + 6 / D, -100, 100);
      s.player.prestige += 2 / D;
      if (skillDch(0.3)) skillUp(s, 'dip');
    },
    gain: function () { return { prestige: 2 }; } },
  /* the chatelaine's road: noblewomen command through the household and the
     court, not the drill yard — favor and polish instead of swordplay */
  { id: 'courtly_graces', label: '🕊 Cultivate the court',
    desc: function () { return 'Hawking, letters, and patronage — favor is won in hall and garden. (+liege’s favor, +prestige)'; },
    show: function (s) { return female(s) && adult(s) && s.player.tier >= 2; },
    tick: function (s) {
      if (s.player.liege) FB.adjustLiegeOp(s, s.player.liege, 4 / D);
      else {
        const lord = FB.getRole(s, 'lord', true);
        if (lord) lord.opinion = FB.clamp(lord.opinion + 4 / D, -100, 100);
      }
      s.player.prestige += 2 / D;
      if (skillDch(0.5)) skillUp(s, 'dip');
    },
    gain: function () { return { prestige: 2 }; } },
  { id: 'train_arms', label: '⚔ Train at arms',
    desc: function () { return 'A blade kept sharp.'; },
    show: function (s) { return s.player.tier >= 2 && adult(s) && !female(s); },
    tick: function (s) { if (skillDch(0.6)) skillUp(s, 'mar'); } },
  { id: 'lead_host', label: '🚩 Lead the host',
    desc: function (s) {
      return s.player.war ? 'Command your men in the field. (better odds at the war council)'
        : (FB.playerGreatHolyWarHostActive && FB.playerGreatHolyWarHostActive(s))
          ? 'Command your host in the great holy war. (+martial over time)'
        : 'Serve in your liege’s host. (+liege’s favor)';
    },
    show: function (s) {
      return !!s.player.war ||
        !!(FB.playerGreatHolyWarHostActive && FB.playerGreatHolyWarHostActive(s)) ||
        !!(s.player.flags.with_liege_host && s.player.liege && FB.isRealmAtWar(s, s.player.liege));
    },
    tick: function (s) {
      if (s.player.war) s.player.war.led = (s.player.war.led || 0) + 1;
      else if (!(FB.playerGreatHolyWarHostActive &&
          FB.playerGreatHolyWarHostActive(s))) {
        s.player.liegeOp = FB.clamp((s.player.liegeOp || 0) + 4 / D, -100, 100);
      }
      if (skillDch(0.5)) skillUp(s, 'mar');
    } },
  { id: 'scheming', label: '🕸 Advance the plot',
    desc: function (s) {
      const pl = s.player.plot;
      if (!pl) return 'No plot in motion.';
      const def = FBDATA.plots[pl.id];
      return FB.T('Weaving: {power}/{needed} — patience, whispers, ink.', {
        power: Math.floor(pl.power), needed: def ? def.need : '?'
      });
    },
    show: function (s) { return !!s.player.plot && adult(s); },
    tick: function (s) {
      const pl = s.player.plot;
      if (!pl) return;
      const def = FBDATA.plots[pl.id];
      if (!def) { s.player.plot = null; return; }
      if (def.target && (!pl.context || FB.plotTargets(s, def).indexOf(pl.context.pid) < 0)) {
        const lost = pl.context && pl.context.pid ? FB.world.byId[pl.context.pid] : null;
        FB.news(s, FB.msg('news.action.plot_target_lost',
          '🕸 The plot ends: {province} is no longer a valid target.',
          { province: lost ? lost.name : FB.T('the county') }));
        FB.fns.plot_end(s);
        return;
      }
      pl.power += (2 + FB.skillOf(me(s), 'int') / 3) / D;
      if (skillDch(0.25)) skillUp(s, 'int');
      if (pl.sprung) return;
      if (dch(0.12)) {
        pl.sprung = 1;
        const discoveredCtx = {};
        for (const key in (pl.context || {})) discoveredCtx[key] = pl.context[key];
        discoveredCtx.plotId = pl.id;
        FB.queueEvent(s, 'plot_discovered', discoveredCtx);
        return;
      }
      if (pl.power >= def.need) {
        pl.sprung = 1;
        FB.queueEvent(s, def.event, pl.context || {});
      }
    } },

  { id: 'govern', label: '🏛 Govern the demesne',
    desc: function () { return 'Ledgers, judgments, and roads. (+revenue, +standing)'; },
    show: function (s) { return s.player.tier >= 3; },
    tick: function (s) {
      s.player.gold += FB.playerTax(s) * 0.15 / D;
      s.player.pop = FB.clamp(s.player.pop + 3 / D, -100, 100);
      if (skillDch(0.25)) skillUp(s, 'ste');
    },
    gain: function (s) { return { gold: FB.playerTax(s) * 0.15 }; } },
  { id: 'patronize', label: '📜 Patronize scholars',
    desc: function (s) {
      return FB.T('Fund learned men; scholarship accrues toward innovations. (Scholarship: {amount})',
        { amount: Math.floor(s.player.research || 0) });
    },
    show: function (s) { return s.player.tier >= 3 && adult(s); },
    tick: function (s) {
      s.player.research = (s.player.research || 0) + (4 + FB.skillOf(me(s), 'lea') / 3) / D;
      s.player.gold = Math.max(0, s.player.gold - 2 / D);
      if (skillDch(0.3)) skillUp(s, 'lea');
    },
    gain: function () { return { gold: -2 }; } }
  ];

  /* ================= INSTANTS (one-shot deeds) ================= */
  FB.instants = [

  { id: 'poach', label: '🏹 Poach the lord’s game', cd: 30,
    desc: function () { return 'Meat and coin — if the forester is elsewhere.'; },
    show: function (s) { return s.player.tier <= 1 && adult(s); },
    run: function (s) {
      if (FB.chance(0.65)) FB.applyEffects(s, { gold: FB.ri(2, 5), skills: { int: FB.chance(0.4) ? 1 : 0 } });
      else FB.queueEvent(s, 'caught_poaching', {});
    } },
  { id: 'scheme_rival', label: '🗡 Scheme against {rival}', cd: 60,
    desc: function (s) {
      const r = FB.getRole(s, 'rival');
      return r
        ? FB.T('Undermine {name} by fair means or foul.', { name: r.name })
        : FB.T('Undermine your rival by fair means or foul.');
    },
    show: function (s) { return !!FB.getRole(s, 'rival') && adult(s); },
    run: function (s) {
      const r = FB.getRole(s, 'rival');
      const inn = FB.skillOf(me(s), 'int');
      // a rival who trusts you never sees the knife coming
      if (FB.chance(0.35 + inn * 0.03 + (r ? r.opinion : 0) / 500)) {
        FB.applyEffects(s, { prestige: 4, skills: { int: FB.chance(0.5) ? 1 : 0 } });
        r.opinion = FB.clamp(r.opinion - 10, -100, 100);
        FB.changeRivalHeat(s, 10);
        FB.news(s, FB.msg('news.action.scheme_rival_success',
          'Your quiet work costs {name} dearly.', { name: r.name }));
      } else {
        FB.applyEffects(s, { prestige: -4 });
        FB.changeRivalHeat(s, 14);
        FB.news(s, FB.msg('news.action.scheme_rival_failure',
          'The scheme unravels, and fingers point at you.', {}));
      }
    } },
  { id: 'seek_match', label: '💍 Seek a match', cd: 30, noConsume: true,
    desc: function () { return 'Ask kin and gossips to find you a spouse from your own walk of life.'; },
    show: function (s) {
      const m = me(s);
      const clergyCelibate = s.player.profession === 'monk' && FB.religionOf(m.religion).group !== 'muslim';
      return adult(s) && FB.canWed(s) && !s.player.courtingId && !clergyCelibate;
    },
    run: function (s) {
      const cands = FB.spawnSuitor(s);
      if (FB.ui && FB.ui.showSuitorPicker) FB.ui.showSuitorPicker();
      else { // no UI to choose with: take the peer match through the old door
        FB.pickSuitor(s, cands[1] ? cands[1].id : cands[0].id);
        FB.queueEvent(s, 'meet_suitor', {});
      }
    } },
  { id: 'propose', label: '💒 Propose marriage', cd: 20,
    desc: function () { return 'Ask for their hand. Standing and wealth weigh heavily.'; },
    show: function (s) { return suitorReady(s) && FB.canPropose(s); },
    run: function (s) {
      const p = s.player, m = s.chars[p.charId];
      // a woman's suit can be overtaken by the war: about a quarter of the time
      // her intended is swept into the levy before he can answer, opening the
      // disguise-at-war chain (events_peasant.js, docs/designs/events.md). Same
      // female + low-station + once-per-life gate as the random opener.
      if (m.sex === 'f' && p.tier <= 2 && FB.ageOf(m, s.date.year) <= 35 &&
        !p.flags.polly_ever && FB.chance(0.25)) {
        FB.queueEvent(s, 'polly_propose_war', {});
      } else {
        FB.queueEvent(s, 'proposal_made', {});
      }
    } },

  { id: 'go_to_town', label: '🏘 Go into town…', cd: 30, noConsume: true,
    desc: function () { return 'Spend a day at one of the province’s settlements — markets, pulpits, and hiring fairs, as fits your station.'; },
    show: function (s) { return adult(s); },
    can: function (s) { return FB.settlementsOf(s, s.player.provinceId).length ? true : 'Only wilderness here.'; },
    run: function (s) { if (FB.ui && FB.ui.showSettlements) FB.ui.showSettlements(); } },
  { id: 'take_road', label: '🧭 Take to the road…', noConsume: true,
    desc: function () { return FB.T('Choose a purpose and travel county by county over game time.'); },
    show: function (s) {
      return !s.player.travel && s.player.tier >= 1 && s.player.tier <= 2 && adult(s);
    },
    can: function (s) {
      return FB.travelEligible ? FB.travelEligible(s) : FB.T('The roads are not ready.');
    },
    run: function () {
      if (FB.ui && FB.ui.showTravelPurposes) FB.ui.showTravelPurposes();
    } },
  { id: 'travel_turn_back', label: '↩ Turn back toward home', noConsume: true,
    desc: function (s) {
      return s.player.travel && s.player.travel.phase === 'return'
        ? FB.T('You are already traveling home.')
        : (s.player.travel && s.player.travel.phase === 'arrived'
          ? FB.T('Return along the saved route after the required stay. You may remain and keep finding local work as long as you like.')
          : FB.T('Abandon the journey and retrace the road. Nothing is refunded.'));
    },
    show: function (s) { return !!s.player.travel; },
    can: function (s) {
      return FB.travelReturnEligible
        ? FB.travelReturnEligible(s)
        : (s.player.travel && s.player.travel.phase !== 'return'
          ? true : FB.T('Already returning home.'));
    },
    run: function (s) { if (FB.travelTurnBack) FB.travelTurnBack(s); } },
  { id: 'travel_settle_here', label: '🏠 Settle here permanently…', noConsume: true,
    desc: function () {
      return FB.T('Move the household here. Each character may make this permanent move only once in their lifetime.');
    },
    show: function (s) {
      return !!(s.player.travel && s.player.travel.phase === 'arrived' &&
        !s.player.travelSettlement);
    },
    can: function (s) {
      return FB.travelSettlementEligible
        ? FB.travelSettlementEligible(s)
        : FB.T('A permanent home is not yet possible here.');
    },
    run: function () {
      if (FB.ui && FB.ui.showTravelSettlement) FB.ui.showTravelSettlement();
    } },

  { id: 'seek_blessing', label: '🕊 Seek a blessing', cd: 90,
    desc: function (s) {
      return FB.T('Bring your piety to the {temple} and ask for grace.',
        { temple: FB.templeWord(me(s).religion) });
    },
    show: function (s) { return adult(s); },
    can: function (s) {
      return FB.playerExcommunicated && FB.playerExcommunicated(s)
        ? FB.T('The excommunicated may not seek a blessing.') : true;
    },
    run: function (s) { FB.queueEvent(s, 'seek_blessing', {}); } },
  { id: 'seek_absolution', label: '🕊 Seek absolution…', noConsume: true,
    desc: function () {
      return FB.T('Ask the Pope to lift your excommunication. Costs {money:gold} and {piety} piety; Catholic rulers recover {opinion} opinion.', {
        gold:FB.religiousHeadBalance('religiousHeadAbsolutionGold', 100),
        piety:FB.religiousHeadBalance('religiousHeadAbsolutionPiety', 100),
        opinion:FB.religiousHeadBalance('religiousHeadAbsolutionOpinion', 20)
      });
    },
    show: function (s) {
      return adult(s) && FB.playerExcommunicated && FB.playerExcommunicated(s);
    },
    can: function (s) {
      if (s.player.war) return FB.T('You must first make peace.');
      if (!FB.religiousHeadOf(s, 'catholic')) return FB.T('The Papacy is vacant; no Pope can absolve you.');
      if (s.player.gold < FB.religiousHeadBalance('religiousHeadAbsolutionGold', 100)) {
        return FB.T('Absolution requires {money:gold}.',
          { gold:FB.religiousHeadBalance('religiousHeadAbsolutionGold', 100) });
      }
      if (s.player.piety < FB.religiousHeadBalance('religiousHeadAbsolutionPiety', 100)) {
        return FB.T('Absolution requires {piety} piety.',
          { piety:FB.religiousHeadBalance('religiousHeadAbsolutionPiety', 100) });
      }
      return true;
    },
    run: function () {
      if (FB.ui && FB.ui.showAbsolution) FB.ui.showAbsolution();
    } },
  { id: 'restore_papacy', label: '✝ Restore the Papacy…', noConsume: true,
    desc: function () {
      return FB.T('Grant Roma to a new independent Pope. Gain {piety} piety and {prestige} prestige, reconcile Catholic rulers, and clear excommunication.', {
        piety:FB.religiousHeadBalance('religiousHeadRestorePiety', 200),
        prestige:FB.religiousHeadBalance('religiousHeadRestorePrestige', 150)
      });
    },
    show: function (s) {
      return adult(s) && me(s).religion === 'catholic' && FB.isPlayerSovereign(s) &&
        !!FB.religiousHeadVacancy(s, 'catholic');
    },
    can: function (s) {
      const seat = FBDATA.religions.catholic.head.seat;
      if (!FB.isPlayerSovereign(s)) return FB.T('Only a sovereign may restore the Papacy.');
      if (!s.holder || s.holder[seat] !== 'player' ||
          s.player.provs.indexOf(seat) < 0) {
        return FB.T('You must hold Roma personally.');
      }
      if (s.player.provs.length < 2) {
        return FB.T('You need another county before granting Roma away.');
      }
      return FB.canRestoreReligiousHead(s, 'catholic', 'player')
        ? true : FB.T('The Papacy cannot be restored from this world state.');
    },
    run: function () {
      if (FB.ui && FB.ui.showReligiousHeadRestoration) {
        FB.ui.showReligiousHeadRestoration('catholic');
      }
    } },
  { id: 'claim_caliphate', label: '☪ Claim the Caliphate…', noConsume: true,
    desc: function () {
      return FB.T('Attach the vacant Sunni office to your realm. Requires {prestige} prestige and spends {piety} piety.', {
        prestige:FB.religiousHeadBalance('religiousHeadClaimPrestige', 500),
        piety:FB.religiousHeadBalance('religiousHeadClaimPiety', 300)
      });
    },
    show: function (s) {
      return adult(s) && me(s).religion === 'sunni' && s.player.tier >= 6 &&
        !!FB.religiousHeadVacancy(s, 'sunni');
    },
    can: function (s) {
      if (!FB.isPlayerSovereign(s)) return FB.T('Only an independent king or emperor may claim the Caliphate.');
      if (s.player.prestige < FB.religiousHeadBalance('religiousHeadClaimPrestige', 500)) {
        return FB.T('You need {needed} prestige (now {current}).', {
          needed:FB.religiousHeadBalance('religiousHeadClaimPrestige', 500),
          current:Math.round(s.player.prestige)
        });
      }
      if (s.player.piety < FB.religiousHeadBalance('religiousHeadClaimPiety', 300)) {
        return FB.T('You need {needed} piety (now {current}).', {
          needed:FB.religiousHeadBalance('religiousHeadClaimPiety', 300),
          current:Math.round(s.player.piety)
        });
      }
      if (!FB.controlsReligiousHeadClaim(s, 'sunni', 'player')) {
        return FB.T('Control Baghdad, or both Mecca and Medina.');
      }
      return FB.canClaimReligiousHead(s, 'sunni', 'player')
        ? true : FB.T('Your realm is not eligible to claim the Caliphate.');
    },
    run: function () {
      if (FB.ui && FB.ui.showReligiousHeadClaim) {
        FB.ui.showReligiousHeadClaim('sunni');
      }
    } },
  { id: 'call_great_holy_war', label: '📯 Call great holy war…', noConsume: true,
    desc: function () {
      return FB.T('Summon sovereigns of the faith to a 180-day gathering for a lost sacred kingdom.');
    },
    show: function (s) {
      if (!adult(s) || s.greatHolyWar) return false;
      for (const religionId in FBDATA.religions) {
        const religion = FBDATA.religions[religionId];
        const head = religion && religion.head && religion.head.greatHolyWar &&
          FB.religiousHeadOf(s, religionId);
        if (head && head.id === 'player') return true;
      }
      return false;
    },
    can: function (s) {
      for (const religionId in FBDATA.religions) {
        const religion = FBDATA.religions[religionId];
        const head = religion && religion.head && religion.head.greatHolyWar &&
          FB.religiousHeadOf(s, religionId);
        if (!head || head.id !== 'player') continue;
        if (FB.canCallGreatHolyWar(s, religionId, null, 'player')) return true;
      }
      return FB.T('No eligible lost kingdom can be targeted yet, or the faith is still within its cooldown.');
    },
    run: function () {
      if (FB.ui && FB.ui.showGreatHolyWarTargets) FB.ui.showGreatHolyWarTargets();
    } },
  { id: 'join_great_holy_war', label: '📯 Answer the great holy war…', noConsume: true,
    desc: function () {
      return FB.T('Take the campaign vow before the gathering ends. Freeholders and greater ranks may serve.');
    },
    show: function (s) {
      const campaign = s.greatHolyWar;
      const pledge = s.player.greatHolyWar;
      return !!(campaign && campaign.phase === 'preparation' &&
        (!pledge || pledge.campaignId !== campaign.id) &&
        FB.playerGreatHolyWarJoinCamp(s));
    },
    run: function () {
      if (FB.ui && FB.ui.showGreatHolyWarJoin) FB.ui.showGreatHolyWarJoin();
    } },
  { id: 'great_holy_war_status', label: '⚔ Great holy war campaign…', noConsume: true,
    desc: function (s) {
      const campaign = s.greatHolyWar;
      return campaign && campaign.phase === 'preparation'
        ? FB.T('Review the camps, target, and time remaining before the banners march.')
        : FB.T('Review coalition strength, resolve, occupations, contribution, and reward standing.');
    },
    show: function (s) { return !!s.greatHolyWar; },
    run: function () {
      if (FB.ui && FB.ui.showGreatHolyWarPanel) FB.ui.showGreatHolyWarPanel();
    } },
  { id: 'renew_great_holy_war_vow', label: '📯 Renew the inherited vow…', noConsume: true,
    desc: function () {
      return FB.T('Keep your dynasty’s contribution and territorial eligibility under its new leader.');
    },
    show: function (s) {
      const pledge = s.player.greatHolyWar;
      return !!(s.greatHolyWar && pledge && pledge.renewalRequired);
    },
    run: function () {
      if (FB.ui && FB.ui.showGreatHolyWarRenewal) FB.ui.showGreatHolyWarRenewal();
    } },
  { id: 'withdraw_great_holy_war', label: '🏳 Withdraw from great holy war…', noConsume: true,
    desc: function (s) {
      const pledge = s.player.greatHolyWar;
      return pledge && pledge.renewalRequired
        ? FB.T('Decline the inherited vow without a personal penalty, but surrender territorial eligibility.')
        : FB.T('Abandon the vow for 100 piety and 50 prestige, surrendering territorial eligibility.');
    },
    show: function (s) {
      const campaign = s.greatHolyWar, pledge = s.player.greatHolyWar;
      return !!(campaign && pledge && pledge.campaignId === campaign.id &&
        !pledge.withdrawn &&
        (campaign.phase === 'preparation' || campaign.phase === 'active'));
    },
    run: function () {
      if (FB.ui && FB.ui.showGreatHolyWarWithdraw) FB.ui.showGreatHolyWarWithdraw();
    } },
  { id: 'great_holy_war_settlement', label: '👑 Decide the campaign grant…', noConsume: true,
    desc: function () {
      return FB.T('Accept the territorial award or decline it for piety and prestige.');
    },
    show: function (s) {
      return !!(s.greatHolyWar && s.greatHolyWar.phase === 'settlement' &&
        s.greatHolyWar.settlement && s.greatHolyWar.settlement.pendingPlayer);
    },
    run: function () {
      if (FB.ui && FB.ui.showGreatHolyWarSettlement) {
        FB.ui.showGreatHolyWarSettlement();
      }
    } },
  { id: 'give_alms', label: '🕯 Give alms', cd: 30,
    desc: function (s) {
      return FB.T('Bread and coin for the poor at the {temple} gate. ({money:10})',
        { temple: FB.templeWord(me(s).religion) });
    },
    show: function (s) { return adult(s); },
    can: function (s) { return s.player.gold >= 10 ? true : 'Nothing to spare.'; },
    run: function (s) {
      FB.applyEffects(s, { gold: -10, piety: 8, popularOpinion: 3 });
      FB.news(s, FB.msg('news.action.alms', '🕯 Gave alms to the poor.', {}));
    } },
  { id: 'begin_plot', label: '🕸 Begin a plot…', noConsume: true,
    desc: function () { return 'Patience, whispers, and a long knife. Occupies your focus until sprung.'; },
    show: function (s) { return adult(s) && !s.player.plot; },
    can: function (s) { return FB.plotAvailable(s).length ? true : 'No plot within your reach.'; },
    run: function (s) { if (FB.ui && FB.ui.showPlots) FB.ui.showPlots(); } },
  { id: 'mediate', label: '🤝 Mediate a quarrel', cd: 60,
    desc: function () { return 'Neighbors at odds trust a fair tongue.'; },
    show: function (s) { return s.player.tier <= 2 && adult(s); },
    run: function (s) {
      const dip = FB.skillOf(me(s), 'dip');
      if (FB.chance(0.4 + dip * 0.03)) {
        FB.applyEffects(s, { prestige: 3, popularOpinion: 3, skills: { dip: FB.chance(0.6) ? 1 : 0 } });
        FB.news(s, FB.msg('news.action.mediate_success',
          '🤝 Your judgment mends a feud; both houses owe you thanks.', {}));
      } else {
        FB.applyEffects(s, { prestige: -2 });
        FB.news(s, FB.msg('news.action.mediate_failure',
          '🤝 Both sides leave angrier — at each other, and at you.', {}));
      }
    } },
  { id: 'swear_friend', label: '🔗 Swear brotherhood with {friend}',
    desc: function (s) {
      const f = FB.getRole(s, 'friend', false);
      return f
        ? FB.T('Bind {name} to your house by oath — for life.', { name: f.name })
        : FB.T('Bind your friend to your house by oath — for life.');
    },
    show: function (s) {
      const f = FB.getRole(s, 'friend', false);
      return adult(s) && !!f && f.opinion >= 40 && !s.player.flags.sworn_friend;
    },
    run: function (s) {
      FB.applyEffects(s, {
        setFlag: 'sworn_friend', prestige: 4,
        opinion: { role: 'friend', amt: 20 }
      });
      FB.news(s, FB.msg('news.action.brotherhood',
        'Swore an oath of brotherhood.', {}));
    } },
  { id: 'send_envoy', label: '🕊 Send an envoy…', noConsume: true,
    desc: function () { return 'Offer a peace pact — or, as an independent king or emperor, one defensive alliance.'; },
    show: function (s) { return s.player.tier >= 4 && FB.isPlayerSovereign(s); },
    can: function (s) {
      const peace = FB.envoyTargets(s), alliance = FB.allianceOfferTargets(s);
      if (!peace.length && !alliance.length) return 'No neighboring court has an available offer.';
      if (peace.length && s.player.gold >= 10) return true;
      if (alliance.length && s.player.gold >= 25) return true;
      return alliance.length ? FB.T('An alliance envoy requires {money:25} in gifts.')
        : FB.T('An envoy without {money:10} in gifts insults his host.');
    },
    run: function (s) { if (FB.ui && FB.ui.showEnvoys) FB.ui.showEnvoys(); } },
  { id: 'foreign_policy', label: '🕊 Foreign policy…', noConsume: true,
    desc: function () { return 'Direct your court to improve or provoke relations with neighboring sovereigns.'; },
    show: function (s) { return s.player.tier >= 4 && FB.isPlayerSovereign(s); },
    can: function (s) {
      return FB.foreignPolicyTargets(s).length ? true : 'No neighboring sovereign court lies within reach.';
    },
    run: function () { if (FB.ui && FB.ui.showForeignPolicy) FB.ui.showForeignPolicy(); } },

  { id: 'better_household', label: '🏠 Better the household…', noConsume: true,
    desc: function () { return 'Beasts, tools, and standing — bought once, kept for generations.'; },
    show: function (s) { return s.player.tier <= 2 && adult(s); },
    can: function (s) {
      return FB.holdingAvailable(s).length ? true : 'Nothing suitable for your station remains.';
    },
    run: function (s) { if (FB.ui && FB.ui.showHoldings) FB.ui.showHoldings(); } },

  { id: 'livelihoods', label: '🧰 Work, training & enterprises…', noConsume: true,
    desc: function (s) {
      return s.player.tier >= 3
        ? 'Manage household occupations, apprenticeships, workers, and family businesses.'
        : 'Choose occupations, arrange apprenticeships, staff shops, and grow family businesses.';
    },
    show: function (s) {
      if (s.player.tier < 3) return adult(s) || FB.householdMembers(s).length > 1;
      return FB.householdWorkers(s).length > 1 || FB.enterpriseList(s).length > 0;
    },
    run: function () { if (FB.ui && FB.ui.showLivelihoods) FB.ui.showLivelihoods(); } },

  { id: 'buy_freedom', label: '⛓ Buy your freedom',
    desc: function () {
      return FB.T('Pay {money:gold} to be struck from the serf-roll.',
        { gold: FBDATA.balance.freedomCost });
    },
    show: function (s) { return s.player.tier === 0 && adult(s); },
    can: function (s) {
      if (s.player.gold < FBDATA.balance.freedomCost) return FB.T('Not enough money.');
      const lord = FB.getRole(s, 'lord', true);
      if (lord && lord.opinion < -20) return 'The lord despises you and refuses.';
      return true;
    },
    run: function (s) {
      FB.applyEffects(s, {
        gold: -FBDATA.balance.freedomCost, tierSet: 1,
        prestige: 15, piety: 5
      });
      FB.news(s, FB.msg('news.action.freedom_bought',
        'Bought freedom from serfdom!', {}));
    } },
  { id: 'buy_land', label: '🌾 Buy a plot of land…', noConsume: true,
    desc: function () {
      return FB.T('{money:gold} per plot. Land held together in one settlement is more productive.',
        { gold: FB.landPlotCost() });
    },
    show: function (s) { return s.player.tier === 1 && adult(s); },
    can: function (s) {
      if (!FB.landAvailable(s).length) return 'No more land is for sale here.';
      if (s.player.gold < FB.landPlotCost()) return FB.T('Not enough money.');
      return true;
    },
    run: function () {
      if (FB.ui && FB.ui.showLandMarket) FB.ui.showLandMarket();
    } },
  { id: 'declare_manor', label: '🏡 Declare a manor',
    desc: function () {
      return FB.T('Gather {plots} plots in one settlement and command {prestige} prestige to join the gentry.',
        { plots: FBDATA.balance.manorPlotRequirement, prestige: FBDATA.balance.manorPrestige });
    },
    show: function (s) { return s.player.tier === 1 && adult(s); },
    can: function (s) {
      if (!FB.manorSite(s)) {
        return FB.T('You need {plots} plots together in one settlement.',
          { plots: FBDATA.balance.manorPlotRequirement });
      }
      if (s.player.prestige < FBDATA.balance.manorPrestige) return 'You lack the standing.';
      return true;
    },
    run: function (s) {
      FB.declareManor(s);
    } },
  { id: 'petition_barony', label: '📜 Petition for a barony', cd: 360,
    desc: function (s) {
      return FB.T('Ask {lord} for lands and a banner.',
        { lord: (FB.getRole(s, 'lord', true) || {}).name || FB.T('your lord') });
    },
    show: function (s) { return s.player.tier === 2; },
    can: function (s) {
      const B = FBDATA.balance;
      const lord = FB.getRole(s, 'lord', true);
      if (!FB.gentryEstablished(s)) return FB.T(
        'Your house is newly gentle. An heir must inherit its standing before a lord will entrust it with a banner.');
      if (s.player.prestige < B.baronyPrestige) return FB.T(
        'You need at least {needed} prestige (now {current}).',
        { needed: B.baronyPrestige, current: Math.round(s.player.prestige) });
      if (!lord || lord.opinion < B.baronyOpinion) return FB.T(
        'You need at least {needed} favor with your lord (now {current}).',
        { needed: B.baronyOpinion, current: lord ? Math.round(lord.opinion) : 0 });
      return true;
    },
    run: function (s) {
      const lord = FB.getRole(s, 'lord', true);
      const chance = FB.liegeGrantChance(s,
        0.15 + lord.opinion / 400 + s.player.prestige / 1200);
      if (FB.chance(chance)) {
        FB.queueEvent(s, 'grant_of_barony', {});
      } else {
        FB.news(s, FB.msg('news.action.barony_refused',
          'The lord smiles, promises nothing, and speaks of the weather.', {}));
        lord.opinion = FB.clamp(lord.opinion - 5, -100, 100);
      }
    } },

  { id: 'hold_court', label: '⚖ Hold court', cd: 90,
    desc: function () { return 'Hear petitions and render judgment.'; },
    show: function (s) { return s.player.tier >= 3; },
    run: function (s) { FB.queueEvent(s, 'hold_court_event', {}); } },
  { id: 'squeeze_taxes', label: '💰 Squeeze the taxes', cd: 180,
    desc: function () { return 'Extra silver now; grumbling later.'; },
    show: function (s) { return s.player.tier >= 3; },
    run: function (s) {
      const tax = Math.max(4, Math.round(FB.playerTax(s) * 0.8));
      FB.applyEffects(s, { gold: tax, popularOpinion: -6 });
    } },
  { id: 'build', label: '🏗 Raise a building…', noConsume: true,
    desc: function (s) {
      return s.player.flags.mason_visit ? 'The master mason waits — a quarter off your next work.'
        : 'Mills, walls, markets — stone outlasts silver.';
    },
    show: function (s) { return s.player.tier >= 3; },
    can: function (s) {
      for (const pid of FB.demesne(s)) if (FB.anyBuildable(s, pid)) return true;
      return 'Nothing more can be raised in your lands.';
    },
    run: function (s) { if (FB.ui && FB.ui.showBuildings) FB.ui.showBuildings(); } },
  { id: 'adopt_tech', label: '💡 Adopt an innovation…', noConsume: true,
    desc: function (s) {
      return FB.T('Scholarship: {amount} — spend it on advances that outlive you.',
        { amount: Math.floor(s.player.research || 0) });
    },
    show: function (s) { return s.player.tier >= 3; },
    can: function (s) {
      return FB.techAvailable(s).length ? true : 'No new innovation is within reach — prerequisites, or the age itself.';
    },
    run: function (s) { if (FB.ui && FB.ui.showTech) FB.ui.showTech(); } },
  { id: 'hold_feast', label: '🍗 Hold a feast', cd: 180,
    desc: function (s) {
      return FB.religionOf(me(s).religion).group === 'muslim'
        ? 'Meat, sherbet, and politics.' : 'Meat, mead, and politics.';
    },
    show: function (s) { return s.player.tier >= 3; },
    can: function (s) { return s.player.gold >= 5 ? true : 'Too poor to feast anyone.'; },
    run: function (s) { FB.queueEvent(s, 'court_feast', {}); } },
  { id: 'petition_liege', label: '👑 Petition the liege for title', cd: 1440,
    desc: function () { return 'Ask for greater lands and higher style.'; },
    show: function (s) { return s.player.tier >= 3 && s.player.tier <= 5 && !!s.player.liege; },
    can: function (s) {
      if ((s.player.liegeOp || 0) < 65) return FB.T(
        'Your liege’s favor must be 65 or more (now {current}).',
        { current: Math.round(s.player.liegeOp || 0) });
      if (s.player.prestige < 400) return FB.T(
        'You need at least 400 prestige (now {current}).',
        { current: Math.round(s.player.prestige) });
      return true;
    },
    run: function (s) { FB.queueEvent(s, 'title_request', {}); } },
  { id: 'petition_county', label: '🤝 Petition for a neighbor’s fief…', cd: 720, noConsume: true,
    desc: function (s) {
      return FB.T('Ask the liege to strip a disgraced neighbor and invest you with his county. Service in the liege’s wars: {service}.',
        { service: s.player.warService || 0 });
    },
    show: function (s) { return s.player.tier >= 4 && !!s.player.liege; },
    can: function (s) {
      const B = FBDATA.balance;
      if (FB.liegeOpOf(s, s.player.liege) < B.petitionLiegeOp) {
        return FB.T('Your liege’s favor must be {needed} or more (now {current}).', {
          needed: B.petitionLiegeOp,
          current: Math.round(FB.liegeOpOf(s, s.player.liege))
        });
      }
      if (s.player.prestige < B.petitionPrestige) {
        return FB.T('You need at least {needed} prestige (now {current}).', {
          needed: B.petitionPrestige, current: Math.round(s.player.prestige)
        });
      }
      if ((s.player.warService || 0) < B.petitionService) {
        return FB.T('You must first bleed in your liege’s wars (service {needed}+, now {current}).', {
          needed: B.petitionService, current: s.player.warService || 0
        });
      }
      return true;
    },
    run: function (s) { if (FB.ui && FB.ui.showPetitionCounty) FB.ui.showPetitionCounty(); } },
  { id: 'buy_county', label: '💰 Buy out a weak neighbor…', cd: 720, noConsume: true,
    desc: function () { return 'Money talks: a small, struggling neighbor sells his county and retires to obscurity.'; },
    show: function (s) { return s.player.tier >= 4 && !!s.player.liege; },
    can: function (s) {
      if (FB.liegeOpOf(s, s.player.liege) < 20) {
        return FB.T('Your liege must at least tolerate you (favor 20+, now {current}).',
          { current: Math.round(FB.liegeOpOf(s, s.player.liege)) });
      }
      const c = FB.buyCountyCandidates(s);
      if (!c.length) return 'No weak neighbor holds land beside yours.';
      if (s.player.gold < c[0].price) return FB.T(
        'You need at least {money:needed} (now {money:current}).',
        { needed: c[0].price, current: Math.floor(s.player.gold) });
      return true;
    },
    run: function (s) { if (FB.ui && FB.ui.showBuyCounty) FB.ui.showBuyCounty(); } },
  { id: 'settle_waste', label: '🌱 Settle the wasteland…', cd: 360, noConsume: true,
    desc: function () { return 'Found a new holding on empty land bordering your demesne.'; },
    show: function (s) { return s.player.tier >= 4; },
    can: function (s) {
      const B = FBDATA.balance;
      if (!FB.wastelandCandidates(s).length) return 'No empty land borders your demesne.';
      if (s.player.gold < B.settleGold) return FB.T(
        'You need at least {money:needed} (now {money:current}).',
        { needed: B.settleGold, current: Math.floor(s.player.gold) });
      if (s.player.prestige < B.settlePrestige) return FB.T(
        'You need at least {needed} prestige (now {current}).',
        { needed: B.settlePrestige, current: Math.round(s.player.prestige) });
      return true;
    },
    run: function (s) { if (FB.ui && FB.ui.showSettleWaste) FB.ui.showSettleWaste(); } },
  { id: 'muster_host', label: '🚩 Muster the host',
    desc: function (s) {
      const w = s.player.war;
      return FB.T('Raise your levies and hired companies as a field host — ~{men} men at your seat. Then tap the host on the map and tap a province to march it.',
        { men: FB.playerLevy(s) + ((w && w.mercCos) || 0) * (FBDATA.balance.mercCompanySize || 150) });
    },
    show: function (s) {
      if (!s.player.war && !(FB.playerGreatHolyWarHostActive &&
          FB.playerGreatHolyWarHostActive(s))) return false;
      if (FB.playerHost && FB.playerHost(s)) return false; // already in the field
      const down = (s.armyDown || {})['player'];
      return down === undefined || s.turn - down >= FBDATA.balance.armyRearmDays;
    },
    run: function (s) { if (FB.raisePlayerHost) FB.raisePlayerHost(s); } },
  { id: 'hire_mercs', label: '⚔ Hire a mercenary company', cd: 45,
    desc: function (s) {
      const w = s.player.war;
      const n = (w && w.mercCos) || 0;
      return FB.renderMessage(FB.msg('fx.action.mercenary_desc', {
        forms: {
          select: 'value', param: 'hasCompanies', cases: {
            none: '~150 spears: {money:15} now, {money:upkeep} a season while the host is raised.',
            some: {
              select: 'plural', param: 'count', cases: {
                one: '~150 spears: {money:15} now, {money:upkeep} a season while the host is raised. ({count} company under your banner)',
                other: '~150 spears: {money:15} now, {money:upkeep} a season while the host is raised. ({count} companies under your banner)'
              }
            },
            other: '~150 spears: {money:15} now, {money:upkeep} a season while the host is raised.'
          }
        }
      }, {
        hasCompanies: n ? 'some' : 'none', count: n,
        upkeep:FBDATA.balance.hostLogisticsMercenaryCompany === undefined
          ? 4 : FBDATA.balance.hostLogisticsMercenaryCompany
      }),
      { state: s, viewer: s.player.charId });
    },
    show: function (s) { return !!s.player.war; },
    can: function (s) { return s.player.gold >= 15 ? true : FB.T('Costs {money:15}.'); },
    run: function (s) {
      const w = s.player.war;
      if (!w || s.player.gold < 15) return;
      s.player.gold -= 15;
      FB.fns.war_mercs(s);
    } },
  { id: 'declare_war', label: '⚔ Declare war…', noConsume: true,
    desc: function () { return 'Press a de jure right, a fabricated county claim, or a crown-restoration right.'; },
    show: function (s) {
      const me = s.chars[s.player.charId];
      return s.player.tier >= 3 || !!(me && me.restorationRight);
    },
    can: function (s) {
      return FB.warCauses(s).length ? true : FB.warLockedReason(s);
    },
    run: function (s) { if (FB.ui && FB.ui.showWarTargets) FB.ui.showWarTargets(); } },
  { id: 'abandon_claim', label: '📜 Abandon fabricated claim', noConsume: true,
    desc: function (s) {
      const claim = FB.fabricatedClaimOf(s);
      const pr = claim && FB.world.byId[claim.pid];
      return pr ? FB.T('Renounce your claim to {province}; the slot becomes free for another plot.',
        { province: pr.name }) : FB.T('Renounce the claim.');
    },
    show: function (s) { return !!FB.fabricatedClaimOf(s); },
    run: function (s) { FB.abandonFabricatedClaim(s); } },
  { id: 'declare_independence', label: '⚑ Declare independence…', noConsume: true,
    desc: function (s) {
      const lg = s.realms[s.player.liege];
      return lg
        ? FB.T('Renounce {liege} and raise your own banner — it means war.', { liege: lg.name })
        : FB.T('Renounce your liege and raise your own banner — it means war.');
    },
    show: function (s) { return s.player.tier >= 3 && !!s.player.liege && !s.player.war; },
    can: function (s) {
      const sovereign = FB.topRealm(s, s.player.liege);
      if (sovereign && FB.isRealmAtWar(s, sovereign)) return FB.T('At war with another realm');
      return s.player.prestige >= 200 ? true
        : FB.T('You need at least 200 prestige to rally men to your banner (now {current}).',
          { current: Math.round(s.player.prestige) });
    },
    run: function (s) { if (FB.ui && FB.ui.showIndependence) FB.ui.showIndependence(); } },
  { id: 'pay_homage', label: '🙇 Pay homage…', noConsume: true, cd: 180,
    desc: function () { return 'Bend the knee at your liege’s court — or a court above his. (+opinion)'; },
    show: function (s) { return s.player.tier >= 3 && !!s.player.liege && !s.player.war; },
    run: function (s) { if (FB.ui && FB.ui.showHomage) FB.ui.showHomage(); } },
  { id: 'appeal_lord', label: '⚖ Appeal over your liege’s head…', noConsume: true, cd: 360,
    desc: function () { return 'Carry your suit to a higher lord: escape a harsh liege, or rise under a greater one.'; },
    show: function (s) {
      return s.player.tier >= 4 && !!s.player.liege && !s.player.war &&
        FB.liegeChain(s, s.player.liege).length >= 2;
    },
    run: function (s) { if (FB.ui && FB.ui.showAppeal) FB.ui.showAppeal(); } },
  { id: 'swear_fealty', label: '🤝 Swear fealty…', noConsume: true,
    desc: function () { return 'Offer your sword and your lands to a neighboring sovereign.'; },
    show: function (s) { return s.player.tier >= 4 && s.player.provs && s.player.provs.length && !s.player.war; },
    can: function (s) { return FB.fealtyTargets(s).length ? true : 'No neighboring sovereign would take your oath.'; },
    run: function (s) { if (FB.ui && FB.ui.showFealty) FB.ui.showFealty(); } },
  { id: 'grant_land', label: '🎁 Grant land…', noConsume: true,
    desc: function () { return 'Enfeoff a loyal man with a county — or a whole duchy. Vassals pay taxes, send levies — and remember.'; },
    show: function (s) { return s.realms.player && s.realms.player.alive && s.player.provs && s.player.provs.length >= 2; },
    run: function (s) { if (FB.ui && FB.ui.showGrantLand) FB.ui.showGrantLand(); } },
  { id: 'demand_taxes', label: '💰 Demand extraordinary taxes', cd: 90,
    desc: function () { return 'Squeeze your vassals for four seasons’ taxes at once. They will not love it.'; },
    show: function (s) { return FB.playerVassals(s).length >= 1; },
    can: function (s) {
      if (FB.councilNeedsConsent && FB.councilNeedsConsent(s)) {
        return FB.T('Your council will not suffer it — crown authority is too weak ({authority}/100). Win their favor, or let the crown’s rights mend with time.',
          { authority: Math.round(s.council.authority) });
      }
      return true;
    },
    run: function (s) { FB.demandTaxes(s); } },
  { id: 'revoke_county', label: '📜 Revoke a county…', noConsume: true,
    desc: function () { return 'Take a fief back from a vassal — by law if he bends, by force if he rises.'; },
    show: function (s) { return FB.playerVassals(s).length >= 1 && !s.player.war; },
    can: function (s) {
      if (FB.councilNeedsConsent && FB.councilNeedsConsent(s)) {
        return FB.T('Your council will not suffer it — crown authority is too weak ({authority}/100). Win their favor, or let the crown’s rights mend with time.',
          { authority: Math.round(s.council.authority) });
      }
      return true;
    },
    run: function (s) { if (FB.ui && FB.ui.showRevoke) FB.ui.showRevoke(); } },
  { id: 'the_estates', label: '🏛 The Estates…', noConsume: true,
    desc: function () {
      return FB.T('The assembled lords of the realm — your voice among them, and the terms of your service: the liege’s aid, and silver in place of spears.');
    },
    show: function (s) { return FB.parliamentActive && FB.parliamentActive(s); },
    run: function (s) { if (FB.ui && FB.ui.showParliament) FB.ui.showParliament(); } },
  { id: 'coin_credit', label: '💰 Coin & Credit…', noConsume: true,
    desc: function () {
      return 'Prices, reliable income, loans, pledged property, and trade partnerships.';
    },
    show: function (s) { return adult(s); },
    run: function () { if (FB.ui && FB.ui.showFinance) FB.ui.showFinance(); } },
  { id: 'debase_coinage', label: '💰 Debase the coinage…', noConsume: true,
    desc: function () {
      return 'Emergency silver for an independent crown — at the price of confidence, standing, and rising prices.';
    },
    show: function (s) { return s.player.tier >= 6 && !s.player.liege; },
    can: function (s) {
      return FB.financeCanDebase(s) ? true :
        'The last debasement is still remembered. Five years must pass.';
    },
    run: function () { if (FB.ui && FB.ui.showDebasement) FB.ui.showDebasement(); } },
  { id: 'royal_council', label: '🏛 The Royal Council…', noConsume: true,
    desc: function () { return 'Your great officers of the crown — their offices, their tempers, and the weight they throw around.'; },
    show: function (s) { return s.player.tier >= 6; },
    run: function (s) { if (FB.ui && FB.ui.showCouncil) FB.ui.showCouncil(); } }
  ];

  /* ================= shared helpers ================= */

  FB.playerTax = function (state) {
    const B = FBDATA.balance;
    const p = state.player;
    // the player's own demesne — overload past the domain limit lets tax leak away
    let demesne = 0;
    for (const pid of (p.provs || [])) demesne += (state.dev[pid] || 1) * B.taxPerDev;
    if (p.tier === 3) demesne = Math.max(demesne, 6); // barony rents
    demesne *= FB.domainPenalty(state);
    // vassals render their seasonal due (never touched by the overload penalty)
    let vassal = 0;
    for (const vid of FB.playerVassals(state)) {
      for (const pid of FB.realmHeldCounties(state, vid)) vassal += (state.dev[pid] || 1) * B.vassalTaxRate;
    }
    let t = demesne + vassal;
    t += FB.buildingBonus(state, 'tax');
    t *= 1 + FB.techBonus(state, 'tax') +
      (FB.councilBonus ? FB.councilBonus(state, 'tax') : 0) +
      (FB.positionBonus ? FB.positionBonus(state, 'tax') : 0);
    if (p.liege) t *= 1 - (FB.parliamentAid ? FB.parliamentAid(state) : 0.25); // liege's cut — haggled in the estates
    return Math.round(t);
  };

  /* ===== domain limit: how much land the player may hold in his own hand =====
     A lord can only govern so many counties directly; past the cap, income and
     levy bleed. The remedy is to grant the surplus to vassals (grant_land). */
  FB.domainCap = function (state) {
    const B = FBDATA.balance;
    const me = state.chars[state.player.charId];
    const ste = me ? FB.skillOf(me, 'ste') : 0;
    return (B.domainBase || 4) + Math.floor(ste / (B.domainStewPer || 5));
  };
  /* counties held directly over the cap (0 if within it) */
  FB.domainOver = function (state) {
    const p = state.player;
    const held = (p.provs && p.provs.length) || 0;
    return Math.max(0, held - FB.domainCap(state));
  };
  /* multiplier applied to the player's OWN income and levy for overload */
  FB.domainPenalty = function (state) {
    const over = FB.domainOver(state);
    if (!over) return 1;
    return Math.pow(1 - (FBDATA.balance.overDomainPenalty || 0.15), over);
  };

  /* the current focus's expected per-season yield (the `gain` mirror of its
     daily tick), or null when the focus pays no gold/prestige/piety */
  FB.focusIncome = function (state) {
    if (state.player.travel) return null;
    for (const f of FB.focuses) {
      if (f.id === state.player.focus) return f.gain ? f.gain(state) : null;
    }
    return null;
  };

  /* Locale-neutral standing seasonal cash flow. Credit capacity and the
     displayed ledger both use this numeric source; neither parses localized
     labels from incomeBreakdown. */
  FB.reliableGoldIncome = function (state, ignoreAssignments) {
    const p = state.player;
    let total = -FB.householdUpkeep(state);
    if (FB.playerHostUpkeepParts) total -= FB.playerHostUpkeepParts(state).total;
    if (p.tier >= 3) {
      total += FB.playerTax(state);
      total -= FB.buildingBonus(state, 'upkeep');
    }
    total += FB.holdingBonus(state, 'gold');
    total += FB.landYield(state);
    total += FB.itemBonus(state, 'gold');
    if (FB.positionBonus) total += FB.positionBonus(state, 'gold');
    if (FB.livelihoodBreakdown) {
      for (const line of FB.livelihoodBreakdown(state)) total += line.amount;
    }
    if (FB.retainerSeasonCost) total -= FB.retainerSeasonCost(state);
    if (FB.schoolingSeasonCost) total -= FB.schoolingSeasonCost(state);
    const focus = FB.focusIncome(state);
    if (focus && focus.gold) total += focus.gold;
    if (!ignoreAssignments && FB.financeAssignedIncomeCost) {
      total -= FB.financeAssignedIncomeCost(state);
    }
    return total;
  };

  /* Standing per-season gold/prestige/piety, itemized by source — feeds the
     topbar stat breakdown (hover on desktop, tap for a modal). Display-only:
     computed on demand, never stored, so labels render in the player's
     locale. Mirrors the season-boundary ledger in main.js and playerTax
     above; a change there wants a change here. */
  FB.incomeBreakdown = function (state) {
    const p = state.player, B = FBDATA.balance;
    if (FB.enterpriseList) FB.enterpriseList(state); // normalize legacy business holdings first
    const lines = { gold: [], prestige: [], piety: [] };
    function add(stat, label, amount) {
      if (!amount) return; // a dry source is no line at all
      lines[stat].push({ label: label, amount: amount });
    }
    function dataName(kind, id, def) {
      return def.icon + ' ' + FB.dataText(state, p.charId, kind, id, def, 'name');
    }
    /* buildings, grouped by kind across the demesne (⚙ Watermill ×2 +4);
       appends lines for one def key (tax feeds gold, piety feeds piety)
       and returns the summed amount for the tax arithmetic below */
    function addBuildings(stat, key, multiplier, isUpkeep) {
      const count = {};
      for (const pid of FB.demesne(state)) {
        for (const e of FB.builtIn(state, pid)) {
          const def = FBDATA.buildings[e.id];
          if (!e.ruined && def && def[key]) count[e.id] = (count[e.id] || 0) + 1;
        }
      }
      let sum = 0;
      for (const bid in count) {
        const def = FBDATA.buildings[bid];
        const amt = def[key] * count[bid] * (multiplier || 1);
        sum += amt;
        let label = dataName('building', bid, def) + (count[bid] > 1 ? ' ×' + count[bid] : '');
        if (isUpkeep) label = FB.T('{building} upkeep', { building: label });
        add(stat, label, amt);
      }
      return sum;
    }

    /* noble revenue (playerTax, unrounded so the lines tell the truth):
       demesne rents, vassal dues, tolls — grown by innovations, cut by a liege */
    if (p.tier >= 3) {
      let rents = 0;
      for (const pid of (p.provs || [])) rents += (state.dev[pid] || 1) * B.taxPerDev;
      if (p.tier === 3) rents = Math.max(rents, 6); // barony rents
      rents *= FB.domainPenalty(state); // overload past the domain limit lets tax leak away
      add('gold', FB.T('Rents from your lands'), rents);
      let dues = 0;
      for (const vid of FB.playerVassals(state)) {
        for (const pid of FB.realmHeldCounties(state, vid)) {
          dues += (state.dev[pid] || 1) * B.vassalTaxRate;
        }
      }
      add('gold', FB.T('Vassal dues'), dues);
      const tolls = addBuildings('gold', 'tax');
      const taxable = rents + dues + tolls;
      const innov = taxable * FB.techBonus(state, 'tax');
      add('gold', FB.T('Innovations'), innov);
      const councilTax = taxable * (FB.councilBonus ? FB.councilBonus(state, 'tax') : 0);
      add('gold', FB.T('Royal Seneschal'), councilTax);
      let positionTax = 0;
      if (FB.positionContributions) {
        for (const source of FB.positionContributions(state, 'tax')) {
          const def = FBDATA.positions[source.id];
          if (!def) continue;
          const amount = taxable * source.amount;
          positionTax += amount;
          const holder = source.charId && state.chars[source.charId];
          const name = FB.dataText(state, p.charId, 'position', source.id, def, 'name');
          add('gold', holder ? FB.T('{position} — {name}', {
            position:name, name:holder.name
          }) : name, amount);
        }
      }
      if (p.liege) {
        add('gold', FB.T('Liege’s cut'),
          -(taxable + innov + councilTax + positionTax) *
          (FB.parliamentAid ? FB.parliamentAid(state) : 0.25));
      }
      addBuildings('gold', 'upkeep', -1, true);
      addBuildings('piety', 'piety'); // chapels and temples pay in piety, not coin
    }

    /* household property and carried treasures, line by line */
    for (const hid of FB.holdingList(state)) {
      const def = FBDATA.holdings[hid];
      if (!def || !def.fx) continue;
      for (const k in lines) {
        if (def.fx[k]) add(k, dataName('holding', hid, def), def.fx[k]);
      }
    }
    for (const land of FB.landBreakdown(state)) {
      add('gold', FB.T('Fields at {settlement}', { settlement: land.settlementName }),
        land.amount);
    }
    for (const ref of FB.equippedItemRefs(state, p.charId)) {
      const item = FB.resolveItem(state, ref);
      if (!item) continue;
      for (const k in lines) {
        if (item.fx[k]) {
          add(k, item.def.icon + ' ' + FB.itemName(state, ref, p.charId), item.fx[k]);
        }
      }
    }

    /* wages brought home by family members and profits from staffed enterprises */
    if (FB.livelihoodBreakdown) {
      for (const ln of FB.livelihoodBreakdown(state)) add('gold', ln.label, ln.amount);
      add('piety', FB.T('Household faith and learned service'), FB.livelihoodPiety(state));
    }
    if (FB.positionContributions) {
      for (const source of FB.positionContributions(state, 'gold')) {
        const def = FBDATA.positions[source.id];
        if (!def) continue;
        const holder = source.charId && state.chars[source.charId];
        const name = FB.dataText(state, p.charId, 'position', source.id, def, 'name');
        add('gold', holder ? FB.T('{position} — {name}', {
          position:name, name:holder.name
        }) : name, source.amount);
      }
    }

    /* the daily focus trickle, as one expected season */
    const fg = FB.focusIncome(state);
    if (fg) {
      let flabel = null;
      for (const f of FB.focuses) {
        if (f.id === p.focus) { flabel = FB.dataText(state, p.charId, 'focus', f.id, f, 'label'); break; }
      }
      for (const k in fg) { if (lines[k]) add(k, flabel, fg[k]); }
    }

    /* station, resident family, and recurring schooling are separate lines so
       a larger household never hides inside an unexplained flat charge */
    const upkeep = FB.householdUpkeepParts(state);
    add('gold', FB.T('Household upkeep'), -upkeep.base);
    add('gold', FB.T('Family provisions and quarters'), -upkeep.family);
    add('gold', FB.T('Wartime scarcity for household necessities'), -upkeep.wartime);
    if (FB.playerHostUpkeepParts) {
      const hostUpkeep = FB.playerHostUpkeepParts(state);
      add('gold', FB.T('Raised-host base logistics'), -hostUpkeep.base);
      add('gold', FB.T('Levy food and supplies'), -hostUpkeep.levy);
      add('gold', FB.T('Archer food and supplies'), -hostUpkeep.archers);
      add('gold', FB.T('Men-at-arms food and supplies'), -hostUpkeep.retinue);
      add('gold', FB.T('Mercenary company contracts'), -hostUpkeep.mercenaries);
    }
    if (FB.retainerRecords) {
      for (const record of FB.retainerRecords(state)) {
        const c = state.chars[record.charId];
        const def = FBDATA.positions[record.office];
        if (!c || !def) continue;
        add('gold', FB.T('{position} pay — {name}', {
          position:FB.dataText(state, p.charId, 'position', record.office, def, 'name'),
          name:c.name
        }), -(record.pay || 0));
      }
    }
    if (FB.schoolingCostBreakdown) {
      for (const term of FB.schoolingCostBreakdown(state)) {
        const school = FBDATA.schooling[term.id];
        add('gold', FB.T('{school} — {name}', {
          school:FB.dataText(state, p.charId, 'schooling', term.id, school, 'name'),
          name:term.c.name
        }), -term.cost);
      }
    }
    if (FB.financeAssignedIncomeCost) {
      add('gold', FB.T('Revenue assigned to lenders'), -FB.financeAssignedIncomeCost(state));
    }

    const out = {};
    for (const k in lines) {
      let total = 0;
      for (const ln of lines[k]) total += ln.amount;
      out[k] = { lines: lines[k], total: total };
    }
    /* Use the shared numeric total for gold even if rounded noble-tax display
       lines differ by a fraction. Annual coin revaluation is an adjustment,
       not a recurring source, and is carried separately for the gold sheet. */
    out.gold.total = FB.reliableGoldIncome(state);
    if (FB.ensureEconomy) out.gold.coinAdjustment = FB.ensureEconomy(state).lastAdjustment;
    return out;
  };

  /* ================= plots (the intrigue game) ================= */
  FB.plotAvailable = function (state) {
    const out = [];
    if (state.player.plot) return out;
    for (const id in FBDATA.plots) {
      const def = FBDATA.plots[id];
      if (def.trigger && !FB.checkTrigger(state, def.trigger)) continue;
      if (def.target && !FB.plotTargets(state, def).length) continue;
      out.push({ id: id, def: def });
    }
    return out;
  };

  FB.plotTargets = function (state, def) {
    if (!def || !def.target) return [];
    if (def.target === 'border_county_without_dejure') return FB.claimCandidates(state);
    return [];
  };

  FB.beginPlot = function (state, id, context) {
    const def = FBDATA.plots[id];
    if (!def || state.player.plot) return;
    if (def.trigger && !FB.checkTrigger(state, def.trigger)) return;
    if (def.target) {
      const pid = context && context.pid;
      if (!pid || FB.plotTargets(state, def).indexOf(pid) < 0) return;
    }
    state.player.plot = { id: id, power: 0, context: context || {} };
    if (state.player.focus !== 'scheming') {
      state.player.focusBack = state.player.focus;
      state.player.focus = 'scheming';
    }
    FB.news(state, FB.msg('news.action.plot_begins',
      '🕸 A plot is set in motion: {plot}.', { plot: FB.dataParam('plot', id) }));
  };

  /* resolution events end their plot with the effect {custom:'plot_end'} */
  FB.fns.plot_end = function (state) {
    state.player.plot = null;
    FB.validateFocus(state);
  };

  /* ================= liege chain & vassalage ================= */

  /* opinion of any realm toward the player: the direct liege lives on
     p.liegeOp, the rest of the chain and the player's own vassals on liegeOps */
  FB.liegeOpOf = function (state, rid) {
    const p = state.player;
    if (rid === p.liege) return p.liegeOp || 0;
    return (p.liegeOps && p.liegeOps[rid]) || 0;
  };
  FB.adjustLiegeOp = function (state, rid, amt) {
    const p = state.player;
    if (!rid) return;
    if (rid === p.liege) p.liegeOp = FB.clamp((p.liegeOp || 0) + amt, -100, 100);
    else {
      p.liegeOps = p.liegeOps || {};
      p.liegeOps[rid] = FB.clamp((p.liegeOps[rid] || 0) + amt, -100, 100);
    }
  };
  /* Clearer names for the player-relative opinion store. Keep the historical
     liege helpers above because events, councils, and mods already call them. */
  FB.realmOpinionOf = function (state, rid) {
    return FB.liegeOpOf(state, rid);
  };
  FB.adjustRealmOpinion = function (state, rid, amt) {
    FB.adjustLiegeOp(state, rid, amt);
  };

  FB.payHomage = function (state, rid) {
    const p = state.player;
    const r = state.realms[rid];
    if (!r || !r.alive) return;
    const m = state.chars[p.charId];
    FB.adjustLiegeOp(state, rid, FBDATA.balance.homageOpinion + Math.floor(FB.skillOf(m, 'dip') / 2));
    p.prestige += 2;
    FB.news(state, FB.msg('news.action.homage',
      '🙇 You bend the knee at the court of {realm}.', { realm: r.name }));
  };

  /* sovereign realms bordering the player's lands (fealty candidates) */
  FB.fealtyTargets = function (state) {
    const p = state.player;
    const cur = FB.playerRealmId(state);
    const out = [];
    if (cur && FB.isRealmAtWar(state, cur)) return out;
    for (const pid of (p.provs || [])) {
      for (const nb in (FB.world.adj[pid] || {})) {
        const own = state.owner[nb];
        if (!own || own === cur || own === 'player' || out.indexOf(own) >= 0) continue;
        if (state.realms[own] && state.realms[own].alive && !state.realms[own].liege &&
            !FB.isRealmAtWar(state, own)) out.push(own);
      }
    }
    return out;
  };

  /* offer the player's lands to another sovereign (or one of its great
     vassals — the chosen realm becomes the direct liege). An independent
     player's realm dissolves; a vassal's old sovereign may call it treason. */
  FB.swearFealty = function (state, rid) {
    const p = state.player;
    const r = state.realms[rid];
    if (!r || !r.alive || p.war) return false;
    const oldTop = p.liege ? FB.topRealm(state, p.liege) : null;
    const newTop = FB.topRealm(state, rid);
    if ((oldTop && FB.isRealmAtWar(state, oldTop)) || FB.isRealmAtWar(state, newTop)) {
      return false;
    }
    for (const pid of (p.provs || [])) {
      state.owner[pid] = newTop;
      state.holder[pid] = 'player';
    }
    p.liege = rid;
    if (!state.realms.player || !state.realms.player.alive) FB.foundPlayerRealm(state);
    state.realms.player.liege = rid;
    state.realms.player.war = null;
    FB.invalidateRealmCache();
    for (const pid of FB.realmTerritory(state, 'player')) state.owner[pid] = newTop;
    FB.adjustLiegeOp(state, rid, 20);
    FB.invalidateRealmCache();
    FB.news(state, FB.msg('news.action.fealty',
      '🤝 You swear fealty to {liege}. Your banners now fly under {realm}.',
      { liege: r.name, realm: state.realms[newTop].name }));
    if (oldTop && oldTop !== newTop && state.realms[oldTop] && state.realms[oldTop].alive && FB.chance(0.5)) {
      p.war = { enemy: oldTop, target: null, wins: 0, losses: 0, seasons: 0,
        defending: true, casus: { type: 'defection' } };
      FB.warFooting(state);
      FB.news(state, FB.msg('news.action.fealty_war',
        '🔥 {realm} names you traitor — war for your defection!',
        { realm: state.realms[oldTop].name }));
    }
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    return true;
  };

  /* realms sworn directly to the player */
  FB.playerVassals = function (state) {
    const out = [];
    for (const id in state.realms) {
      const r = state.realms[id];
      if (r.alive && r.liege === 'player') out.push(id);
    }
    return out;
  };

  FB.vassalLevyFavor = function (state, rid) {
    const p = state.player;
    if (!p.vassalLevyFavors || typeof p.vassalLevyFavors !== 'object' ||
      Array.isArray(p.vassalLevyFavors)) p.vassalLevyFavors = {};
    const until = p.vassalLevyFavors[rid];
    const r = state.realms[rid];
    if (!until || until <= state.turn || !r || !r.alive || r.liege !== 'player') {
      if (until) delete p.vassalLevyFavors[rid];
      return null;
    }
    return { rid:rid, until:until };
  };

  FB.vassalLevyRate = function (state, rid) {
    return (FBDATA.balance.vassalLevyRate || 0) +
      (FB.vassalLevyFavor(state, rid) ? (FBDATA.balance.vassalLevyFavorRate || 0.05) : 0);
  };

  FB.canCallVassalLevyFavor = function (state, rid) {
    const r = state.realms[rid];
    return !!(r && r.alive && r.liege === 'player' &&
      FB.liegeOpOf(state, rid) >= 40 && !FB.vassalLevyFavor(state, rid));
  };

  FB.callVassalLevyFavor = function (state, rid) {
    if (!FB.canCallVassalLevyFavor(state, rid)) return false;
    const r = state.realms[rid];
    const days = FBDATA.balance.vassalLevyFavorDays || 360;
    state.player.vassalLevyFavors[rid] = state.turn + days;
    FB.adjustLiegeOp(state, rid, -15);
    FB.news(state, FB.msg('news.realm.vassal_levy_favor',
      '🛡 {realm} promises an exceptional levy for one year; the favor costs goodwill.',
      { realm:r.name }));
    return true;
  };

  /* hand a demesne county to a new sworn man */
  FB.grantCounty = function (state, pid) {
    const p = state.player;
    const pr = FB.world.byId[pid];
    if (!pr || !p.provs || p.provs.indexOf(pid) < 0 || p.provs.length < 2) return;
    p.provs.splice(p.provs.indexOf(pid), 1);
    const vid = 'pv_' + pid;
    if (state.realms[vid]) {
      state.realms[vid].alive = true;
      state.realms[vid].liege = 'player';
    } else {
      FB.makeVassalRealm(state, { id: vid, name: 'County of ' + pr.name, capital: pid, rank: 1, liege: 'player', culture: pr.culture });
    }
    state.holder[pid] = vid;
    state.owner[pid] = FB.playerRealmId(state) || 'player';
    FB.adjustLiegeOp(state, vid, 40);
    FB.invalidateRealmCache();
    FB.news(state, FB.msg('news.action.county_granted',
      '🎁 {province} is granted to a loyal man — {name} holds it in your name.',
      { province: pr.name, name: state.realms[vid].ruler.name }));
  };

  /* every de jure duchy the player holds IN FULL (every de jure county in his
     own hand) — the raw material for granting a whole duchy to a duke at once */
  FB.grantableDuchies = function (state) {
    const p = state.player, by = {}, out = [];
    if (!p.provs) return out;
    for (const pid of p.provs) {
      const did = (FB.world.byId[pid] || {}).duchy;
      if (did) (by[did] = by[did] || []).push(pid);
    }
    for (const did in by) {
      const total = FB.duchyCounties(did).length; // every de jure county of the duchy
      // only grantable whole: hold the entire duchy in hand, and keep a seat of your own
      if (total >= 2 && by[did].length === total && p.provs.length - by[did].length >= 1) {
        out.push({ did: did, name: (FBDATA.duchies[did] || {}).name || did, counties: by[did] });
      }
    }
    return out;
  };

  /* raise a duke over a de jure duchy the player holds in full — hand him every
     county in it at once. Keeps at least one county in the player's own hand. */
  FB.grantDuchy = function (state, did) {
    const p = state.player;
    if (!p.provs) return;
    const cs = [];
    for (const pid of p.provs) if ((FB.world.byId[pid] || {}).duchy === did) cs.push(pid);
    const dej = FB.duchyCounties(did);
    // only a duchy held whole may be granted as a duchy — and always keep a seat
    if (dej.length < 2 || cs.length !== dej.length || p.provs.length - cs.length < 1) return;
    let seat = cs[0];
    for (const pid of cs) if ((state.dev[pid] || 1) > (state.dev[seat] || 1)) seat = pid; // richest = ducal seat
    const dname = (FBDATA.duchies[did] || {}).name || did;
    const vid = 'pd_' + did;
    if (state.realms[vid]) {
      state.realms[vid].alive = true;
      state.realms[vid].liege = 'player';
      state.realms[vid].capital = seat;
    } else {
      FB.makeVassalRealm(state, { id: vid, name: 'Duchy of ' + dname, capital: seat, rank: 2, liege: 'player', culture: (FB.world.byId[seat] || {}).culture });
    }
    for (const pid of cs) {
      p.provs.splice(p.provs.indexOf(pid), 1);
      state.holder[pid] = vid;
      state.owner[pid] = FB.playerRealmId(state) || 'player';
    }
    FB.adjustLiegeOp(state, vid, 40);
    FB.invalidateRealmCache();
    FB.news(state, FB.msg('news.action.duchy_granted',
      '🎁 The Duchy of {duchy} is granted to {name} — {count} counties held in your name.',
      { duchy: dname, name: state.realms[vid].ruler.name, count: cs.length }));
  };

  /* counties adjacent to the player's demesne held by another vassal of the
     same sovereign — the raw material of every intra-realm land deal. Skips
     the liege's own demesne and the player's own vassals (revoke_county is
     the tool for those) */
  FB.sameRealmNeighbors = function (state) {
    const p = state.player, seen = {}, out = [];
    if (!p.provs) return out;
    const myTop = FB.playerRealmId(state);
    for (const pid of p.provs) {
      for (const nb in (FB.world.adj[pid] || {})) {
        if (seen[nb] || p.provs.indexOf(nb) >= 0) continue;
        const pr = FB.world.byId[nb];
        const h = state.holder[nb];
        if (!pr || pr.wasteland || !h || h === 'player' || h === p.liege) continue;
        const hr = state.realms[h];
        if (!hr || !hr.alive || hr.liege === 'player') continue;
        if (FB.topRealm(state, h) !== myTop) continue;
        seen[nb] = 1;
        out.push({ pid: nb, holder: h });
      }
    }
    return out;
  };

  /* petitionable neighbors: the liege must already despise the sitting lord */
  FB.petitionCandidates = function (state) {
    const out = [];
    for (const c of FB.sameRealmNeighbors(state)) {
      const fav = state.realms[c.holder].favor || 0;
      if (fav > FBDATA.balance.petitionFavorMax) continue;
      out.push({ pid: c.pid, holder: c.holder, favor: fav });
    }
    return out;
  };

  /* buyable neighbors: a mere count, no vassals of his own — cheapest first */
  FB.buyCountyCandidates = function (state) {
    const B = FBDATA.balance, out = [];
    for (const c of FB.sameRealmNeighbors(state)) {
      const hr = state.realms[c.holder];
      if (hr.rank !== 1) continue;
      let hasVassals = false;
      for (const vid in state.realms) if (state.realms[vid].liege === c.holder) { hasVassals = true; break; }
      if (hasVassals) continue;
      const dev = state.dev[c.pid] || 1;
      out.push({ pid: c.pid, holder: c.holder, price: B.buyCountyBase + B.buyCountyPerDev * dev });
    }
    out.sort(function (a, b) { return a.price - b.price; });
    return out;
  };

  /* wasteland provinces bordering the player's demesne */
  FB.wastelandCandidates = function (state) {
    const p = state.player, seen = {}, out = [];
    if (!p.provs) return out;
    for (const pid of p.provs) {
      for (const nb in (FB.world.adj[pid] || {})) {
        if (seen[nb]) continue;
        const pr = FB.world.byId[nb];
        if (pr && pr.wasteland) { seen[nb] = 1; out.push(nb); }
      }
    }
    return out;
  };

  /* a weak neighbor sells out: gold changes hands, the county changes hands */
  FB.buyCounty = function (state, pid) {
    const p = state.player;
    let pick = null;
    for (const c of FB.buyCountyCandidates(state)) if (c.pid === pid) pick = c;
    if (!pick || p.gold < pick.price) return false;
    p.gold -= pick.price;
    const pr = FB.world.byId[pid];
    const old = pick.holder;
    p.provs.push(pid);
    state.holder[pid] = 'player';
    FB.invalidateRealmCache();
    FB.realmBuryIfEmpty(state, old);
    FB.applyEffects(state, { opinionLiege: -8 });
    FB.news(state, FB.msg('news.action.county_purchase_record',
      'Bought {province} from its struggling lord.', { province: pr.name }));
    FB.news(state, FB.msg('news.action.county_bought',
      '💰 {province} is yours for {money:gold} — its old lord retires fat and forgotten. The court frowns on bought land.',
      { province: pr.name, gold: pick.price }));
    FB.checkTierPromotions(state);
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    return true;
  };

  /* several seasons' taxes squeezed out of every vassal at once — a skilled
     steward (demandTaxPerSte) wrings out meaningfully more */
  FB.demandTaxes = function (state) {
    const B = FBDATA.balance;
    const p = state.player;
    const me = state.chars[p.charId];
    const steMul = 1 + (me ? FB.skillOf(me, 'ste') : 0) * (B.demandTaxPerSte || 0);
    const seasons = B.demandTaxSeasons || 3;
    let gold = 0;
    for (const vid of FB.playerVassals(state)) {
      for (const pid of FB.realmHeldCounties(state, vid)) gold += (state.dev[pid] || 1) * B.vassalTaxRate * seasons;
      FB.adjustLiegeOp(state, vid, -15);
      if (FB.liegeOpOf(state, vid) <= -50) {
        FB.queueEvent(state, 'vassal_revolt', { rid:vid });
      }
    }
    gold = Math.ceil(gold * steMul);
    if (gold > 0) {
      p.gold += gold;
      if (FB.councilAuthority) FB.councilAuthority(state, 4); // the crown rules without its council — they notice
      FB.news(state, FB.msg('news.action.extraordinary_taxes',
        '💰 Your vassals render {money:gold} in extraordinary taxes — grumbling all the while.',
        { gold: gold }));
    }
  };

  /* ================= envoys & pacts (the diplomacy game) ================= */
  FB.politicalAttentionCapacity = function (state) {
    const p = state.player, B = FBDATA.balance;
    if (p.tier < 4 || !FB.isPlayerSovereign(state)) return 0;
    if (p.tier >= 7) return B.politicalAttentionEmperor;
    if (p.tier >= 6) return B.politicalAttentionKing;
    return B.politicalAttentionCount;
  };

  FB.foreignPolicyStore = function (state) {
    return state.player.foreignPolicy = state.player.foreignPolicy || {};
  };

  /* Alive sovereign neighbors of the independent player's realm. War and
     pacts deliberately do not remove a court from this list: war suspends an
     assignment, while a pact is only the hard guarantee of peace. */
  FB.foreignPolicyTargets = function (state) {
    const out = [];
    if (!FB.politicalAttentionCapacity(state)) return out;
    for (const id in state.realms) {
      const r = state.realms[id];
      if (id === 'player' || !r.alive || r.liege) continue;
      if (FB.realmsAdjacent(state, 'player', id)) out.push(id);
    }
    out.sort();
    return out;
  };

  FB.isForeignPolicyTarget = function (state, rid) {
    return FB.foreignPolicyTargets(state).indexOf(rid) >= 0;
  };

  /* Stable id order makes malformed/modded over-capacity saves deterministic.
     The UI prevents over-assignment, but only the first capacity entries tick. */
  FB.foreignPolicyAssignments = function (state) {
    const policy = FB.foreignPolicyStore(state);
    const valid = {};
    for (const rid of FB.foreignPolicyTargets(state)) valid[rid] = 1;
    const assigned = [];
    for (const rid in policy) {
      if (valid[rid] && (policy[rid] === 1 || policy[rid] === -1)) assigned.push(rid);
    }
    assigned.sort();
    return assigned.slice(0, FB.politicalAttentionCapacity(state));
  };

  FB.foreignPolicyUsed = function (state) {
    return FB.foreignPolicyAssignments(state).length;
  };

  FB.foreignPolicyStance = function (state, rid) {
    if (FB.foreignPolicyAssignments(state).indexOf(rid) < 0) return 0;
    return FB.foreignPolicyStore(state)[rid];
  };

  FB.setForeignPolicy = function (state, rid, stance) {
    const policy = FB.foreignPolicyStore(state);
    stance = stance === 1 ? 1 : (stance === -1 ? -1 : 0);
    if (!stance) {
      delete policy[rid];
      return true;
    }
    if (!FB.isForeignPolicyTarget(state, rid)) return false;
    const assigned = FB.foreignPolicyAssignments(state);
    if (assigned.indexOf(rid) < 0 &&
      assigned.length >= FB.politicalAttentionCapacity(state)) return false;
    policy[rid] = stance;
    return true;
  };

  FB.foreignPolicyAmount = function (state) {
    const B = FBDATA.balance;
    return B.foreignPolicyBase + Math.min(B.foreignPolicyDipCap,
      FB.skillOf(state.chars[state.player.charId], 'dip') / 20);
  };

  FB.tickForeignPolicy = function (state) {
    const policy = FB.foreignPolicyStore(state);
    const targets = FB.foreignPolicyTargets(state);
    const valid = {};
    for (const rid of targets) valid[rid] = 1;
    const ids = Object.keys(policy).sort();
    for (const rid of ids) {
      if (!valid[rid] || (policy[rid] !== 1 && policy[rid] !== -1)) delete policy[rid];
    }
    const active = FB.foreignPolicyAssignments(state);
    const warEnemy = state.player.war && state.player.war.enemy;
    const amount = FB.foreignPolicyAmount(state);
    for (const rid of active) {
      if (rid === warEnemy) continue;
      FB.adjustRealmOpinion(state, rid, policy[rid] * amount);
    }
  };

  FB.envoyTargets = function (state) {
    const out = [];
    if (!FB.isPlayerSovereign(state)) return out;
    for (const id in state.realms) {
      const r = state.realms[id];
      if (id === 'player' || !r.alive || r.liege) continue; // sovereigns only
      if (state.player.war && state.player.war.enemy === id) continue;
      if (state.pacts && state.pacts[id] > state.turn) continue;
      if (FB.areAllied(state, 'player', id)) continue;
      if (!FB.realmsAdjacent(state, 'player', id)) continue;
      out.push(id);
    }
    return out;
  };

  FB.envoyChance = function (state, rid) {
    const p = state.player, m = state.chars[p.charId], B = FBDATA.balance;
    const chance = 0.35 + FB.skillOf(m, 'dip') * 0.035 + p.prestige / 600 +
      FB.realmOpinionOf(state, rid) / B.foreignOpinionEnvoyDivisor;
    return FB.clamp(chance, 0.1, 0.9);
  };

  FB.sendEnvoy = function (state, rid) {
    const p = state.player;
    const r = state.realms[rid];
    if (!r || !r.alive || p.gold < 10) return;
    p.gold -= 10;
    if (FB.chance(FB.envoyChance(state, rid))) {
      state.pacts = state.pacts || {};
      state.pacts[rid] = state.turn + 8 * 90; // two years of peace
      FB.applyEffects(state, { prestige: 3, skills: { dip: FB.chance(0.5) ? 1 : 0 } });
      FB.news(state, FB.msg('news.action.envoy_success',
        '🕊 {realm} swears a pact of peace — two years of quiet borders.', { realm: r.name }));
    } else {
      FB.news(state, FB.msg('news.action.envoy_failure',
        '🕊 The envoy returns, gifts refused. {realm} is unmoved.', { realm: r.name }));
    }
  };

  FB.allianceOfferTargets = function (state) {
    const out = [];
    const mine = state.realms.player;
    if (!FB.isPlayerSovereign(state) || !mine || mine.rank < 3 || FB.allianceOf(state, 'player')) return out;
    for (const rid in state.realms) {
      const r = state.realms[rid];
      if (rid === 'player' || !r.alive || r.liege || r.rank < 3 || r.war) continue;
      if (FB.allianceOf(state, rid) || FB.realmOpinionOf(state, rid) < 60) continue;
      if (!FB.realmsAdjacent(state, 'player', rid)) continue;
      out.push(rid);
    }
    return out;
  };

  FB.offerAlliance = function (state, rid) {
    if (FB.allianceOfferTargets(state).indexOf(rid) < 0 || state.player.gold < 25) return false;
    state.player.gold -= 25;
    const r = state.realms[rid];
    if (FB.chance(FB.envoyChance(state, rid)) && FB.formAlliance(state, 'player', rid, 'envoy')) {
      FB.news(state, FB.msg('news.action.alliance_success',
        '🤝 {realm} accepts your envoy: your crowns will defend one another until either ruler dies.',
        { realm: r.name }));
      return true;
    }
    FB.news(state, FB.msg('news.action.alliance_failure',
      '🕊 {realm} receives the gifts but refuses the defensive compact.', { realm: r.name }));
    return false;
  };

  FB.maybeRoyalMarriageAlliance = function (state, royalRealmId) {
    const mine = state.realms.player;
    const royal = state.realms[royalRealmId];
    if (!FB.isPlayerSovereign(state) || !mine || mine.rank < 3 || !royal ||
        !royal.alive || royal.liege || royal.rank < 3) return false;
    if (!FB.realmsAdjacent(state, 'player', royalRealmId)) return false;
    if (!FB.formAlliance(state, 'player', royalRealmId, 'royal_marriage')) return false;
    FB.news(state, FB.msg('news.action.marriage_alliance',
      '🤝 The marriage binds your crown and {realm} in a defensive alliance.',
      { realm: royal.name }));
    return true;
  };

  /* ================= household holdings (tall for commoners) =================
     Family property bought with gold; player.holdings persists across
     generations, so a line of serfs can still build something lasting. */
  FB.holdingList = function (state) {
    return state.player.holdings = state.player.holdings || []; // lazy init for older saves
  };

  FB.holdingBonus = function (state, key) {
    let sum = 0;
    for (const id of FB.holdingList(state)) {
      const def = FBDATA.holdings[id];
      if (def && def.fx && def.fx[key]) sum += def.fx[key];
    }
    return sum;
  };

  FB.holdingAvailable = function (state) {
    const p = state.player;
    const done = FB.holdingList(state);
    const out = [];
    for (const id in FBDATA.holdings) {
      const def = FBDATA.holdings[id];
      if (def.eventOnly) continue;
      if (done.indexOf(id) >= 0) continue;
      if (def.tierMin !== undefined && p.tier < def.tierMin) continue;
      if (def.tierMax !== undefined && p.tier > def.tierMax) continue;
      if (def.professions && def.professions.indexOf(p.profession) < 0) continue;
      if (def.req && done.indexOf(def.req) < 0) continue;
      out.push({ id: id, def: def });
    }
    return out;
  };

  FB.buyHolding = function (state, id) {
    const def = FBDATA.holdings[id];
    const done = FB.holdingList(state);
    if (!def || def.eventOnly || done.indexOf(id) >= 0) return;
    if (def.req && done.indexOf(def.req) < 0) return;
    if (state.player.gold < def.cost) return;
    state.player.gold -= def.cost;
    done.push(id);
    FB.news(state, FB.msg('news.action.holding_bought',
      '🏠 {holding} now belongs to the household.', { holding: FB.dataParam('holding', id) }));
  };

  /* ================= freehold land (the road from freedom to a manor) =================
     Repeatable family plots belong to one stable derived settlement and pass
     to heirs. Contiguous holdings are worked more efficiently; five plots in
     one place may be declared a manor and raise the family into the gentry. */
  FB.landPlotCost = function () {
    return FBDATA.balance.landPlotCost || FBDATA.balance.farmCost || 120;
  };

  FB.landPlots = function (state) {
    const p = state.player;
    p.landPlots = p.landPlots || [];
    if (!p.landPlotMigration) {
      /* A legacy purchased farm becomes one plot. Legacy tier-2 lives were
         built around an assumed manor, so preserve that property and station.
         New games stamp the migration marker and receive only scenario land. */
      if (p.flags && p.flags.has_farm && !p.landPlots.length) {
        p.landPlots.push({ provinceId:p.provinceId, settlement:0 });
        delete p.flags.has_farm;
      } else if (p.tier === 2 && !p.landPlots.length &&
          !(p.flags && (p.flags.abbot || p.flags.qadi))) {
        const need = FBDATA.balance.manorPlotRequirement || 5;
        for (let i = 0; i < need; i++) {
          p.landPlots.push({ provinceId:p.provinceId, settlement:0 });
        }
        p.manor = { provinceId:p.provinceId, settlement:0 };
      }
      p.landPlotMigration = 1;
    }
    return p.landPlots;
  };

  FB.landGroupYield = function (count) {
    const base = FBDATA.balance.landPlotYield || 0.6;
    const together = FBDATA.balance.landConsolidationBonus || 0.10;
    return base * count * (1 + Math.max(0, count - 1) * together);
  };

  FB.landBreakdown = function (state) {
    const groups = {};
    for (const plot of FB.landPlots(state)) {
      const key = plot.provinceId + ':' + plot.settlement;
      if (!groups[key]) {
        groups[key] = {
          provinceId:plot.provinceId, settlement:plot.settlement, count:0
        };
      }
      groups[key].count++;
    }
    const out = [];
    const together = FBDATA.balance.landConsolidationBonus || 0.10;
    for (const key in groups) {
      const g = groups[key];
      const settlements = FB.settlementsOf(state, g.provinceId);
      const province = FB.world.byId[g.provinceId];
      g.settlementName = settlements[g.settlement]
        ? settlements[g.settlement].name
        : (province ? province.name : '?');
      g.multiplier = 1 + Math.max(0, g.count - 1) * together;
      g.amount = FB.landGroupYield(g.count);
      out.push(g);
    }
    out.sort(function (a, b) {
      if (a.provinceId !== b.provinceId) return a.provinceId < b.provinceId ? -1 : 1;
      return a.settlement - b.settlement;
    });
    return out;
  };

  FB.landYield = function (state) {
    let total = 0;
    for (const group of FB.landBreakdown(state)) total += group.amount;
    return total;
  };

  FB.landCountAt = function (state, provinceId, settlement) {
    let count = 0;
    for (const plot of FB.landPlots(state)) {
      if (plot.provinceId === provinceId && plot.settlement === settlement) count++;
    }
    return count;
  };

  FB.landAvailable = function (state) {
    const p = state.player;
    if (p.tier !== 1) return [];
    const out = [];
    const max = FBDATA.balance.landPlotMaxSettlement ||
      FBDATA.balance.manorPlotRequirement || 5;
    const settlements = FB.settlementsOf(state, p.provinceId);
    for (let i = 0; i < settlements.length; i++) {
      const count = FB.landCountAt(state, p.provinceId, i);
      if (count < max) out.push({
        provinceId:p.provinceId, settlement:i, settlementName:settlements[i].name,
        count:count
      });
    }
    return out;
  };

  FB.buyLandPlot = function (state, settlement) {
    const available = FB.landAvailable(state);
    let site = null;
    for (const item of available) if (item.settlement === settlement) site = item;
    const cost = FB.landPlotCost();
    if (!site || state.player.gold < cost) return false;
    state.player.gold -= cost;
    FB.landPlots(state).push({
      provinceId:state.player.provinceId, settlement:settlement
    });
    FB.news(state, FB.msg('news.action.land_bought',
      '🌾 The household buys another plot at {settlement}.',
      { settlement:site.settlementName }));
    return true;
  };

  FB.largestLandCluster = function (state) {
    let best = null;
    for (const group of FB.landBreakdown(state)) {
      if (!best || group.count > best.count) best = group;
    }
    return best;
  };

  FB.manorSite = function (state) {
    const need = FBDATA.balance.manorPlotRequirement || 5;
    let best = null;
    for (const group of FB.landBreakdown(state)) {
      if (group.count >= need && (!best || group.count > best.count)) best = group;
    }
    return best;
  };

  FB.declareManor = function (state) {
    const site = FB.manorSite(state);
    if (!site || state.player.tier !== 1 ||
        state.player.prestige < FBDATA.balance.manorPrestige) return false;
    state.player.manor = {
      provinceId:site.provinceId, settlement:site.settlement
    };
    FB.applyEffects(state, { tierSet:2, prestige:30 });
    FB.news(state, FB.msg('news.action.manor_declared',
      '🏡 The consolidated lands at {settlement} are declared a manor. The household joins the gentry.',
      { settlement:site.settlementName }));
    return true;
  };

  /* ================= technology (playing tall) =================
     Innovations are bought with scholarship (player.research) and live in
     state.tech — they persist across generations. */
  FB.techList = function (state) {
    return state.tech = state.tech || []; // lazy init for older saves
  };

  FB.techBonus = function (state, key) {
    let sum = 0;
    for (const id of FB.techList(state)) {
      const def = FBDATA.tech[id];
      if (def && def.fx && def.fx[key]) sum += def.fx[key];
    }
    return sum;
  };

  /* the price of adopting an innovation NOW: repeatable capstones cost
     cost × techRepeatCostGrowth per rank already held, so each further
     rank of the same bonus comes dearer (diminishing returns) */
  FB.techCost = function (state, id) {
    const def = FBDATA.tech[id];
    if (!def) return 0;
    if (!def.repeat) return def.cost;
    let n = 0;
    for (const t of FB.techList(state)) if (t === id) n++;
    return Math.round(def.cost * Math.pow(FBDATA.balance.techRepeatCostGrowth || 1.6, n));
  };

  /* development ceiling: tech raises it for the player's own lands */
  FB.devCap = function (state, pid) {
    let cap = 10;
    if (FB.demesne(state).indexOf(pid) >= 0) cap += FB.techBonus(state, 'devCap');
    return cap;
  };

  FB.techAvailable = function (state) {
    const done = FB.techList(state);
    const out = [];
    for (const id in FBDATA.tech) {
      const def = FBDATA.tech[id];
      if (!def.repeat && done.indexOf(id) >= 0) continue; // repeatables stay on offer
      if (def.yearMin && state.date.year < def.yearMin) continue;
      if (def.req && done.indexOf(def.req) < 0) continue;
      out.push({ id: id, def: def, cost: FB.techCost(state, id) });
    }
    return out;
  };

  /* ---- automation (the ⚙ Automation dialog): one purchase per season ---- */
  FB.autoBuild = function (state) {
    let best = null, bestPid = null, bestIdx = 0;
    const steadyGold = FB.reliableGoldIncome(state);
    for (const pid of FB.demesne(state)) {
      const sts = FB.settlementsOf(state, pid);
      for (let idx = 0; idx < sts.length; idx++) {
        for (const b of FB.buildable(state, pid, idx)) {
          if (b.def.upkeep && steadyGold < b.def.upkeep) continue;
          if (!best || b.cost < best.cost) { best = b; bestPid = pid; bestIdx = idx; }
        }
      }
    }
    // keep a prudent reserve so upkeep and events never find an empty chest
    if (best && state.player.gold >= best.cost + 25) FB.build(state, bestPid, bestIdx, best.id);
  };

  FB.autoResearch = function (state) {
    let best = null;
    for (const t of FB.techAvailable(state)) {
      if (!best || t.cost < best.cost) best = t;
    }
    if (best && (state.player.research || 0) >= best.cost) FB.adoptTech(state, best.id);
  };

  FB.adoptTech = function (state, id) {
    const def = FBDATA.tech[id];
    const done = FB.techList(state);
    if (!def || (!def.repeat && done.indexOf(id) >= 0)) return;
    if (def.yearMin && state.date.year < def.yearMin) return;
    if (def.req && done.indexOf(def.req) < 0) return;
    const cost = FB.techCost(state, id);
    if ((state.player.research || 0) < cost) return;
    state.player.research -= cost;
    done.push(id);
    FB.news(state, FB.msg('news.action.tech_adopted',
      '💡 {innovation} takes root in your lands.', { innovation: FB.dataParam('tech', id) }));
  };

  /* ================= demesne buildings =================
     One of each PER SETTLEMENT of a province (settlements are derived and
     stable — FB.settlementsOf), raisable in ANY province the player holds.
     state.buildings maps province id -> [{ s: settlement index, id }], so
     conquest takes them with the land. Bonuses keep summing demesne-wide. */
  FB.demesne = function (state) {
    const p = state.player;
    return (p.provs && p.provs.length) ? p.provs : [p.provinceId];
  };

  FB.homeProv = function (state) {
    return FB.demesne(state)[0];
  };

  FB.builtIn = function (state, pid) {
    state.buildings = state.buildings || {}; // lazy init for older saves
    const list = state.buildings[pid] = state.buildings[pid] || [];
    /* old saves hold bare id strings: migrate lazily in place — those
       buildings land in the head settlement (s: 0) */
    for (let i = 0; i < list.length; i++) {
      if (typeof list[i] === 'string') list[i] = { s: 0, id: list[i] };
    }
    return list;
  };

  FB.buildingCountIn = function (state, pid, id, includeRuins) {
    let count = 0;
    for (const e of FB.builtIn(state, pid)) {
      if (e.id === id && (includeRuins || !e.ruined)) count++;
    }
    return count;
  };

  FB.buildingCount = function (state, id, includeRuins) {
    let count = 0;
    for (const pid of FB.demesne(state)) count += FB.buildingCountIn(state, pid, id, includeRuins);
    return count;
  };

  /* built anywhere in the demesne (the reading used by event triggers) */
  FB.hasBuilding = function (state, id) {
    for (const pid of FB.demesne(state)) {
      const done = FB.builtIn(state, pid);
      for (const e of done) if (e.id === id && !e.ruined) return true;
    }
    return false;
  };

  /* built in ONE province (walls guard the county they stand in) */
  FB.hasBuildingIn = function (state, pid, id) {
    const done = FB.builtIn(state, pid);
    for (const e of done) if (e.id === id && !e.ruined) return true;
    return false;
  };

  FB.buildingBonus = function (state, key) {
    let sum = 0;
    for (const pid of FB.demesne(state)) {
      for (const e of FB.builtIn(state, pid)) {
        const def = FBDATA.buildings[e.id];
        if (!e.ruined && def && def[key]) sum += def[key];
      }
    }
    return sum;
  };

  /* copies of the same building beyond the first in the same county cost
     cost × buildingRepeatCostGrowth^(copies standing) — the price climbs
     instead of the bonus shrinking */
  FB.buildCost = function (state, pid, id) {
    const def = FBDATA.buildings[id];
    const copies = FB.buildingCountIn(state, pid, id, true);
    let c = def.cost * Math.pow(FBDATA.balance.buildingRepeatCostGrowth || 1.5, copies) *
      (1 - FB.techBonus(state, 'build') - (FB.councilBonus ? FB.councilBonus(state, 'build') : 0));
    if (state.player.flags.mason_visit) c *= 0.75;
    return Math.round(c);
  };

  FB.canBuildAt = function (state, pid, idx, id) {
    const def = FBDATA.buildings[id];
    const pr = FB.world.byId[pid];
    if (!def || FB.demesne(state).indexOf(pid) < 0 || !FB.settlementsOf(state, pid)[idx]) return false;
    const done = FB.builtIn(state, pid);
    for (const e of done) if (e.id === id && e.s === idx) return false;
    if (def.devMin && (state.dev[pid] || 1) < def.devMin) return false;
    if (def.coastal && (!pr || !pr.coastal)) return false;
    if (def.terrains && (!pr || def.terrains.indexOf(pr.terrain) < 0)) return false;
    if (def.homeOnly && FB.homeProv(state) !== pid) return false;
    if (def.maxCounty && FB.buildingCountIn(state, pid, id, false) >= def.maxCounty) return false;
    if (def.maxDemesne && FB.buildingCount(state, id, false) >= def.maxDemesne) return false;
    return true;
  };

  /* what one settlement can still raise: one of each building per
     settlement, subject to county/demesne limits and siting gates */
  FB.buildable = function (state, pid, idx) {
    const out = [];
    for (const id in FBDATA.buildings) {
      const def = FBDATA.buildings[id];
      if (!FB.canBuildAt(state, pid, idx, id)) continue;
      out.push({ id: id, def: def, cost: FB.buildCost(state, pid, id) });
    }
    return out;
  };

  FB.buildingSlots = function (state, pid, id) {
    const out = [];
    const sts = FB.settlementsOf(state, pid);
    for (let idx = 0; idx < sts.length; idx++) {
      if (FB.canBuildAt(state, pid, idx, id)) out.push(idx);
    }
    return out;
  };

  /* anything raisable in any settlement of the county (deed/picker gates) */
  FB.anyBuildable = function (state, pid) {
    const sts = FB.settlementsOf(state, pid);
    for (let idx = 0; idx < sts.length; idx++) {
      if (FB.buildable(state, pid, idx).length) return true;
    }
    return false;
  };

  FB.build = function (state, pid, idx, id) {
    const def = FBDATA.buildings[id];
    if (!def || !FB.canBuildAt(state, pid, idx, id)) return false;
    const done = FB.builtIn(state, pid);
    const cost = FB.buildCost(state, pid, id);
    if (state.player.gold < cost) return false;
    state.player.gold -= cost;
    delete state.player.flags.mason_visit; // the mason's discount is spent
    done.push({ s: idx, id: id });
    if (def.dev) state.dev[pid] = FB.clamp((state.dev[pid] || 1) + def.dev, 1, FB.devCap(state, pid));
    const fx = {};
    if (def.pop) fx.popularOpinion = def.pop;
    if (def.prestige) fx.prestige = def.prestige;
    FB.applyEffects(state, fx, {});
    const st = FB.settlementsOf ? FB.settlementsOf(state, pid)[idx] : null;
    FB.news(state, FB.msg('news.action.building_raised',
      '🏗 {building} rises in {settlement}, {province}.',
      { building: FB.dataParam('building', id),
        settlement: st ? st.name : FB.world.byId[pid].name,
        province: FB.world.byId[pid].name }));
    return true;
  };

  FB.demolishBuilding = function (state, pid, idx, id) {
    if (FB.demesne(state).indexOf(pid) < 0) return false;
    for (const e of FB.builtIn(state, pid)) {
      if (e.id === id && e.s === idx && !e.ruined) {
        e.ruined = true;
        return true;
      }
    }
    return false;
  };

  function playerBorderLands(state) {
    if (state.realms.player && state.realms.player.alive) return FB.realmTerritory(state, 'player').slice();
    return (state.player.provs || []).slice();
  }

  function heldTitleSets(state) {
    const p = state.player, d = {}, k = {}, e = {};
    if (p.tier >= 5) for (const id of FB.playerDuchies(state)) d[id] = 1;
    if (p.tier >= 6) for (const id of FB.playerKingdoms(state)) k[id] = 1;
    if (p.tier >= 7) for (const id of FB.playerEmpires(state)) e[id] = 1;
    return { duchy: d, kingdom: k, empire: e };
  }

  function deJureCause(state, pid, titles) {
    const dj = FB.dejureOf(pid);
    if (dj.duchy && titles.duchy[dj.duchy]) {
      return { type: 'dejure', target: pid, titleKind: 'duchy', titleId: dj.duchy };
    }
    if (dj.kingdom && titles.kingdom[dj.kingdom]) {
      return { type: 'dejure', target: pid, titleKind: 'kingdom', titleId: dj.kingdom };
    }
    if (dj.empire && titles.empire[dj.empire]) {
      return { type: 'dejure', target: pid, titleKind: 'empire', titleId: dj.empire };
    }
    return null;
  }

  FB.fabricatedClaimOf = function (state) {
    const p = state.player;
    let claim = p.fabricatedClaim;
    if (typeof claim === 'string') claim = p.fabricatedClaim = { pid: claim };
    if (!claim) return null;
    const pr = FB.world.byId[claim.pid];
    const owner = state.owner[claim.pid];
    const mySovereign = FB.playerRealmId(state);
    const landedRealm = state.realms.player && state.realms.player.alive;
    const territory = landedRealm
      ? FB.realmTerritory(state, 'player') : (p.provs || []);
    if (!pr || pr.wasteland || territory.indexOf(claim.pid) >= 0 ||
        (state.holder && state.holder[claim.pid] === 'player') ||
        !owner || owner === 'player' || (landedRealm && owner === mySovereign) ||
        !state.realms[owner] || !state.realms[owner].alive) {
      p.fabricatedClaim = null;
      return null;
    }
    return claim;
  };

  function diplomacyBlocksWar(state, enemy) {
    if (FB.isRealmAtWar(state, enemy)) return 'war';
    if (state.pacts && state.pacts[enemy] > state.turn) return 'pact';
    if (FB.areAllied(state, 'player', enemy)) return 'alliance';
    return null;
  }

  function annotateReligiousWarCause(state, cause) {
    const c = state.chars[state.player.charId];
    if (!c || !cause || !FB.sameFaithHeadWarPolicy) return cause;
    cause.sameFaithHeadWar = FB.sameFaithHeadWarPolicy(
      state, c.religion, cause.enemy, cause.target);
    cause.sacrilegious = cause.sameFaithHeadWar === 'sacrilege';
    return cause;
  }

  /* Semantic causes are the authoritative declaration surface. Passing true
     keeps diplomatically blocked causes so the UI can explain the exact lock. */
  FB.warCauses = function (state, includeBlocked) {
    const p = state.player, out = [], seen = {};
    if (FB.greatHolyWarCamp && FB.greatHolyWarCamp(state, 'player')) return out;
    const playerRealm = FB.playerRealmId(state);
    if (playerRealm && FB.isRealmAtWar(state, playerRealm)) return out;
    const me = state.chars[p.charId];
    const restoration = me && me.restorationRight;
    if (restoration) {
      const rr = state.realms[restoration.realmId];
      if (!rr || !rr.alive || !rr.capital) {
        delete me.restorationRight;
      } else {
        const blocked = diplomacyBlocksWar(state, rr.id);
        if (!blocked || includeBlocked) {
          out.push(annotateReligiousWarCause(state, {
            type: 'restoration',
            target: rr.capital,
            enemy: rr.id,
            titleName: restoration.titleName || rr.name,
            blocked: blocked
          }));
        }
      }
    }
    const mine = playerBorderLands(state);
    if (!mine.length || p.tier < 4) return out;
    const mySovereign = FB.playerRealmId(state);
    const titles = heldTitleSets(state);
    const claim = FB.fabricatedClaimOf(state);
    for (const pid of mine) {
      for (const nb in (FB.world.adj[pid] || {})) {
        if (seen[nb]) continue;
        const pr = FB.world.byId[nb], enemy = state.owner[nb];
        if (!pr || pr.wasteland || !enemy || enemy === mySovereign || enemy === 'player') continue;
        let cause = deJureCause(state, nb, titles);
        if (!cause && claim && claim.pid === nb) cause = { type: 'fabricated', target: nb };
        if (!cause) continue;
        cause.enemy = enemy;
        cause.blocked = diplomacyBlocksWar(state, enemy);
        annotateReligiousWarCause(state, cause);
        seen[nb] = 1;
        if (!cause.blocked || includeBlocked) out.push(cause);
      }
    }
    return out;
  };

  FB.warTargets = function (state) {
    const out = [];
    for (const cause of FB.warCauses(state)) if (out.indexOf(cause.target) < 0) out.push(cause.target);
    return out;
  };

  FB.warLockedReason = function (state) {
    if (state.player.war) return FB.T('You are already at war.');
    if (FB.greatHolyWarCamp && FB.greatHolyWarCamp(state, 'player')) {
      return FB.T('You are committed to a great holy war.');
    }
    const playerRealm = FB.playerRealmId(state);
    if (playerRealm && FB.isRealmAtWar(state, playerRealm)) {
      return FB.T('At war with another realm');
    }
    const all = FB.warCauses(state, true);
    for (const cause of all) {
      if (cause.blocked === 'war') return FB.T('At war with another realm');
      if (cause.blocked === 'alliance') return FB.T('Your defensive alliance forbids an attack on the only realm you have cause against.');
      if (cause.blocked === 'pact') return FB.T('A sworn peace pact protects the only realm you have cause against.');
    }
    const me = state.chars[state.player.charId];
    if (state.player.tier < 4 && !(me && me.restorationRight)) {
      return FB.T('A baron must first hold a county before waging a foreign war.');
    }
    if (!playerBorderLands(state).length && !(me && me.restorationRight)) {
      return FB.T('You hold no landed realm from which to wage war.');
    }
    if (FB.fabricatedClaimOf(state)) {
      return FB.T('Your fabricated claim no longer borders your realm; it remains valid if the frontier reaches it again.');
    }
    return FB.T('No bordering county lies within a title you hold, and you have no fabricated claim.');
  };

  FB.claimCandidates = function (state) {
    const out = [], seen = {};
    if (state.player.tier < 4 || FB.fabricatedClaimOf(state)) return out;
    const mine = playerBorderLands(state), mySovereign = FB.playerRealmId(state);
    const titles = heldTitleSets(state);
    for (const pid of mine) {
      for (const nb in (FB.world.adj[pid] || {})) {
        if (seen[nb]) continue;
        const pr = FB.world.byId[nb], enemy = state.owner[nb];
        if (!pr || pr.wasteland || !enemy || enemy === mySovereign || enemy === 'player') continue;
        if (deJureCause(state, nb, titles)) continue;
        seen[nb] = 1;
        out.push(nb);
      }
    }
    return out;
  };

  FB.abandonFabricatedClaim = function (state) {
    const claim = FB.fabricatedClaimOf(state);
    if (!claim) return false;
    const pr = FB.world.byId[claim.pid];
    state.player.fabricatedClaim = null;
    FB.news(state, FB.msg('news.action.claim_abandoned',
      '📜 You abandon the claim to {province}.', { province: pr ? pr.name : '' }));
    return true;
  };

  FB.fns.fabricate_claim_success = function (state, ctx) {
    const pid = ctx && ctx.pid;
    if (pid && FB.world.byId[pid] && !FB.fabricatedClaimOf(state) &&
        FB.claimCandidates(state).indexOf(pid) >= 0) {
      state.player.fabricatedClaim = { pid: pid, madeTurn: state.turn };
      FB.news(state, FB.msg('news.action.claim_fabricated',
        '📜 Witnesses and ink establish your claim to {province}.',
        { province: FB.world.byId[pid].name }));
    }
    FB.fns.plot_end(state);
  };

  FB.fns.fabricate_claim_failure = function (state) {
    state.player.prestige = Math.max(0, state.player.prestige - 5);
    FB.news(state, FB.msg('news.action.claim_failed',
      '📜 The false witnesses unravel. No claim remains, and your name suffers.', {}));
    FB.fns.plot_end(state);
  };

  FB.fns.plot_discovery_success = function (state, ctx) {
    if (ctx && ctx.plotId === 'fabricate_claim') FB.fns.fabricate_claim_success(state, ctx);
    else {
      FB.applyEffects(state, { prestige: 6, skills: { int: 2 } }, ctx || {});
      FB.fns.plot_end(state);
    }
  };

  FB.fns.plot_discovery_failure = function (state, ctx) {
    if (ctx && ctx.plotId === 'fabricate_claim') FB.fns.fabricate_claim_failure(state, ctx);
    else {
      FB.applyEffects(state, {
        prestige: -12,
        popularOpinion: -5,
        opinion: { role: 'lord', amt: -10 }
      }, ctx || {});
      FB.fns.plot_end(state);
    }
  };

  FB.startPlayerWar = function (state, causeOrTarget, opts) {
    if (state.player.war) return false;
    if (FB.greatHolyWarCamp && FB.greatHolyWarCamp(state, 'player')) return false;
    opts = opts || {};
    const playerRealm = FB.playerRealmId(state);
    if (playerRealm && FB.isRealmAtWar(state, playerRealm)) return false;
    let cause = causeOrTarget && typeof causeOrTarget === 'object' ? causeOrTarget : null;
    if (!cause) {
      const target = String(causeOrTarget || '');
      for (const c of FB.warCauses(state)) if (c.target === target) { cause = c; break; }
    }
    if (!cause || !cause.target || cause.blocked) return false;
    const enemy = cause.enemy || state.owner[cause.target];
    if (!enemy || diplomacyBlocksWar(state, enemy)) return false;
    const c = state.chars[state.player.charId];
    const sameFaithPolicy = c && FB.sameFaithHeadWarPolicy
      ? FB.sameFaithHeadWarPolicy(state, c.religion, enemy, cause.target) : null;
    if (sameFaithPolicy === 'sacrilege' && !opts.confirmSacrilege) return false;
    state.player.war = {
      enemy: enemy, target: cause.target, wins: 0, losses: 0, seasons: 0,
      defending: false,
      casus: {
        type: cause.type,
        target: cause.target,
        titleKind: cause.titleKind || null,
        titleId: cause.titleId || null,
        titleName: cause.titleName || null,
        sacrilegious:sameFaithPolicy === 'sacrilege'
      }
    };
    if (sameFaithPolicy === 'sacrilege') {
      FB.applySacrilegiousWarConsequences(state, c.religion);
    }
    FB.news(state, FB.msg('news.action.war_declared',
      '⚔ You declare war upon {enemy} for {province}!', {
        enemy: state.realms[enemy] ? state.realms[enemy].name : enemy,
        province: FB.world.byId[cause.target].name
      }));
    state.player.prestige += 5;
    FB.warFooting(state);
    FB.queueEvent(state, 'war_muster', {});
    return true;
  };

  FB.listFocuses = function (state) {
    if (state.player.travel) return [];
    const all = FB.focuses.filter(function (f) { return f.show(state); });
    // afield in disguise, the household/market/court focuses make no sense —
    // pare the menu down to a soldier's day: drill, mend, and prayers
    if (afield(state)) {
      const wl = { drill: 1, rest: 1, pray: 1 };
      return all.filter(function (f) { return wl[f.id]; });
    }
    return all;
  };

  FB.listInstants = function (state) {
    const out = [];
    for (const a of FB.instants) {
      if (state.player.travel &&
        ['travel_turn_back', 'travel_settle_here'].indexOf(a.id) < 0) continue;
      if (!a.show(state)) continue;
      let can = true, reason = '';
      if (a.cd !== undefined) {
        const last = state.player.cooldowns[a.id];
        if (last !== undefined && state.turn - last < a.cd) {
          can = false;
          reason = FB.T('Ready in {days} days.', { days: a.cd - (state.turn - last) });
        }
      }
      if (can && a.can) {
        const r = a.can(state);
        if (r !== true) { can = false; reason = r; }
      }
      out.push({ a: a, can: can, reason: reason });
    }
    return out;
  };

  FB.setFocus = function (state, id) {
    for (const f of FB.focuses) {
      if (f.id === id && f.show(state)) {
        state.player.focus = id;
        if (FB.ui && FB.ui.refresh) FB.ui.refresh();
        return;
      }
    }
  };

  FB.defaultFocus = function (state) {
    const p = state.player;
    if (!adult(state)) return 'study';
    if (afield(state)) return 'drill'; // disguised in the ranks — train at arms
    let want;
    if (p.tier >= 3) want = 'govern';
    else if (p.tier === 2) want = 'manage_manor';
    else if (p.profession === 'monk') want = 'copy_books';
    else if (p.profession === 'priest') want = 'serve_church';
    else {
      want = ({ farmer: p.tier === 0 ? 'toil' : 'work_land', craftsman: 'craft_work',
        merchant: 'trade_run', soldier: 'drill', noble: 'train_arms' })[p.profession];
      /* martial training is gated male: women are steered to the household or
         the court instead of drill/train_arms (validateFocus self-heals saves
         where a female heir still holds a now-hidden martial focus) */
      if (female(state) && (want === 'drill' || want === 'train_arms')) {
        want = p.tier >= 2 ? 'courtly_graces' : 'keep_house';
      }
    }
    const shown = FB.listFocuses(state);
    for (const f of shown) if (f.id === want) return want;
    return shown.length ? shown[0].id : null;
  };

  FB.validateFocus = function (state) {
    if (state.player.travel) return;
    if (FB.socialAttentionEnsure) FB.socialAttentionEnsure(state);
    const cur = state.player.focus;
    // daily hot path: if the current focus is still offered, skip the full
    // listFocuses sweep (all ~27 show() callbacks) entirely. While afield the
    // menu is pared to a whitelist that show() alone can't see, so take the
    // full sweep and let a now-irrelevant home focus fall through to a soldier's.
    if (cur && !afield(state)) {
      for (const f of FB.focuses) {
        if (f.id === cur) { if (f.show(state)) return; break; }
      }
    }
    const shown = FB.listFocuses(state);
    for (const f of shown) if (f.id === cur) return;
    // a war footing ends: return to the focus held before the war, if it still fits
    const back = state.player.focusBack;
    state.player.focusBack = null;
    if (back) {
      for (const f of shown) if (f.id === back) { state.player.focus = back; return; }
    }
    state.player.focus = FB.defaultFocus(state);
  };

  FB.tickFocus = function (state) {
    if (state.player.travel) return;
    FB.validateFocus(state);
    for (const f of FB.focuses) {
      if (f.id === state.player.focus) { f.tick(state); return; }
    }
  };

  FB.runInstant = function (state, id) {
    for (const a of FB.instants) {
      if (a.id !== id || !a.show(state)) continue;
      if (a.cd !== undefined) {
        const last = state.player.cooldowns[id];
        if (last !== undefined && state.turn - last < a.cd) return;
      }
      if (a.can && a.can(state) !== true) return;
      if (a.cd !== undefined) state.player.cooldowns[id] = state.turn;
      a.run(state);
      if (a.noConsume) { if (FB.ui && FB.ui.refresh) FB.ui.refresh(); }
      else if (FB.game && FB.game.passDay) FB.game.passDay({ skipFocus: true });
      return;
    }
  };
})();
