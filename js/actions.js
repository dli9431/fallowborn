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
  function vocationalMultiplier(state, focus) {
    if (!focus || !focus.vocational || !FB.householdWorkMultiplier) return 1;
    const profession = state.player.profession;
    const relevant = Array.isArray(focus.vocational)
      ? focus.vocational.indexOf(profession) >= 0
      : focus.vocational === profession;
    return relevant ? FB.householdWorkMultiplier(state, profession) : 1;
  }
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
  function patronageResearch(state) {
    return 2 + Math.min(3, FB.skillOf(me(state), 'lea') / 10);
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
      if (pr) FB.adjustStanding(s, { kind:'character', id:pr.id }, 2 / D,
        'focus:pray');
    },
    gain: function (s) { return { piety: 3 + (me(s).traits.indexOf('zealous') >= 0 ? 2 : 0) }; } },
  { id: 'toil', label: '🌾 Toil in the lord’s fields',
    vocational: 'farmer',
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
    vocational: 'farmer',
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
    vocational: 'merchant',
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
    vocational: 'craftsman',
    desc: function () { return 'Steady hands, steady coin.'; },
    show: function (s) { return s.player.profession === 'craftsman' && s.player.tier <= 2; },
    tick: function (s) {
      s.player.gold += (FB.rf(2, 5) + (s.player.flags.guild_member ? 1 : 0)) / D;
      if (skillDch(0.3)) skillUp(s, 'ste');
    },
    gain: function (s) { return { gold: 3.5 + (s.player.flags.guild_member ? 1 : 0) }; } },
  { id: 'trade_run', label: '🐫 Run trade ventures',
    vocational: 'merchant',
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
    vocational: 'soldier',
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
    vocational: 'soldier',
    desc: function () { return 'Dull, cold, and paid.'; },
    show: function (s) {
      return s.player.tier <= 2 && s.player.profession === 'soldier' && !female(s);
    },
    tick: function (s) {
      s.player.gold += 2 / D;
      const lord = FB.getRole(s, 'lord', false);
      if (lord) FB.adjustStanding(s, { kind:'character', id:lord.id }, 2 / D,
        'focus:stand_guard');
    },
    gain: function () { return { gold: 2 }; } },

  { id: 'copy_books', label: '✒ Copy manuscripts',
    vocational: ['monk', 'priest'],
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
    vocational: ['monk', 'priest'],
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
    vocational: 'noble',
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
    vocational: 'noble',
    desc: function () { return 'Be seen, be useful, be remembered.'; },
    show: function (s) { return s.player.tier === 2; },
    tick: function (s) {
      const lord = FB.getRole(s, 'lord', true);
      if (lord) FB.adjustStanding(s, { kind:'character', id:lord.id }, 6 / D,
        'focus:serve_lord');
      s.player.prestige += 2 / D;
      if (skillDch(0.3)) skillUp(s, 'dip');
    },
    gain: function () { return { prestige: 2 }; } },
  /* the chatelaine's road: noblewomen command through the household and the
     court, not the drill yard — Standing and polish instead of swordplay */
  { id: 'courtly_graces', label: '🕊 Cultivate the court',
    vocational: 'noble',
    desc: function () { return 'Hawking, letters, and patronage — Standing is won in hall and garden. (+liege Standing, +prestige)'; },
    show: function (s) { return female(s) && adult(s) && s.player.tier >= 2; },
    tick: function (s) {
      if (s.player.liege) {
        FB.adjustStanding(s, { kind:'realm', id:s.player.liege }, 4 / D,
          'focus:courtly_graces');
      }
      else {
        const lord = FB.getRole(s, 'lord', true);
        if (lord) FB.adjustStanding(s, { kind:'character', id:lord.id }, 4 / D,
          'focus:courtly_graces');
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
        : 'Serve in your liege’s host. (+liege Standing)';
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
        FB.adjustStanding(s, { kind:'realm', id:s.player.liege }, 4 / D,
          'focus:lead_host');
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
      if (def.target && !FB.plotTargetValid(s, def, pl.context)) {
        const lost = FB.plotContextLabel(s, def, pl.context);
        if (def.target === 'border_county_without_dejure') {
          FB.news(s, FB.msg('news.action.plot_target_lost',
            '🕸 The plot ends: {province} is no longer a valid target.',
            {
              province:lost || FB.messageParam(
                FB.message('fx.param.the_county', {})
              )
            }));
        } else {
          FB.news(s, FB.msg('news.action.plot_semantic_target_lost',
            '🕸 The plot ends: {target} is no longer a valid target.',
            {
              target:lost || FB.messageParam(FB.msg(
                'fx.param.the_intended_target', 'the intended target', {}
              ))
            }));
        }
        FB.fns.plot_end(s);
        return;
      }
      pl.power += (2 + FB.skillOf(me(s), 'int') / 3) / D;
      if (skillDch(0.25)) skillUp(s, 'int');
      if (pl.sprung) return;
      if (dch(Math.min(0.30, 0.12 + (pl.exposure || 0) * 0.06))) {
        pl.sprung = 1;
        const discoveredCtx = {};
        for (const key in (pl.context || {})) discoveredCtx[key] = pl.context[key];
        discoveredCtx.plotId = pl.id;
        FB.queueEvent(s, 'plot_discovered', discoveredCtx);
        return;
      }
      if (pl.power >= def.need) {
        pl.sprung = 1;
        const resolutionCtx = {};
        for (const key in (pl.context || {})) resolutionCtx[key] = pl.context[key];
        resolutionCtx.plotId = pl.id;
        FB.queueEvent(s, def.event, resolutionCtx);
      }
    } },

  { id: 'shepherd_diocese', label: '🕯 Shepherd the diocese',
    desc: function () {
      return 'Visit, teach, correct, and reconcile. (+piety, +Common Voice, +Learning over time)';
    },
    show: function (s) {
      return !!(FB.hasBishopric && FB.hasBishopric(s, me(s)));
    },
    tick: function (s) {
      s.player.piety += 4 / D;
      s.player.pop = FB.clamp(s.player.pop + 2 / D, -100, 100);
      if (skillDch(0.35)) skillUp(s, 'lea');
    },
    gain: function () { return { piety:4 }; } },
  { id: 'administer_temporalities', label: '🔑 Administer the temporalities',
    desc: function () {
      return 'Oversee episcopal rents, officers, and obligations. (+income, +liege Standing, +Stewardship over time)';
    },
    show: function (s) {
      return !!(FB.hasBishopric && FB.hasBishopric(s, me(s)));
    },
    tick: function (s) {
      s.player.gold += FB.bishopricIncome(s) * 0.15 / D;
      if (s.player.liege) {
        FB.adjustStanding(s, { kind:'realm', id:s.player.liege }, 2 / D,
          'focus:administer_temporalities');
      }
      if (skillDch(0.30)) skillUp(s, 'ste');
    },
    gain: function (s) { return { gold:FB.bishopricIncome(s) * 0.15 }; } },
  { id: 'govern', label: '🏛 Govern the demesne',
    desc: function () { return 'Ledgers, judgments, and roads. (+revenue, +standing)'; },
    show: function (s) {
      return s.player.tier >= 3 &&
        !(FB.playerBishopricOnly && FB.playerBishopricOnly(s));
    },
    tick: function (s) {
      s.player.gold += FB.playerTax(s) * 0.15 / D;
      s.player.pop = FB.clamp(s.player.pop + 3 / D, -100, 100);
      if (skillDch(0.25)) skillUp(s, 'ste');
    },
    gain: function (s) { return { gold: FB.playerTax(s) * 0.15 }; } },
  { id: 'patronize', label: '📜 Patronize scholars',
    desc: function (s) {
      const record = FB.realmTechRecord(s);
      const activeId = record.active && record.active[0];
      const active = activeId && FBDATA.tech[activeId];
      return active
        ? FB.T('Fund learned people; their work aids the national project {technology}.', {
          technology:FB.dataText(s, s.player.charId, 'tech', activeId, active, 'name', {})
        })
        : FB.T('Fund learned people; their work is banked until the nation begins a technology.');
    },
    show: function (s) { return s.player.tier >= 3 && adult(s); },
    tick: function (s) {
      FB.addResearch(s, patronageResearch(s) / D);
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
      if (FB.chance(0.35 + inn * 0.03 +
          (r ? FB.standingOf(s, { kind:'character', id:r.id }) : 0) / 500)) {
        FB.applyEffects(s, { prestige: 4, skills: { int: FB.chance(0.5) ? 1 : 0 } });
        FB.adjustStanding(s, { kind:'character', id:r.id }, -10,
          'deed:scheme_rival');
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
      return !s.player.travel && s.player.tier >= 1 && adult(s);
    },
    can: function (s) {
      return FB.travelAnyPurposeEligible
        ? FB.travelAnyPurposeEligible(s) : FB.T('The roads are not ready.');
    },
    run: function () {
      if (FB.ui && FB.ui.showTravelPurposes) FB.ui.showTravelPurposes();
    } },
  { id: 'travel_turn_back', label: '↩ Turn back toward home', noConsume: true,
    desc: function (s) {
      return s.player.travel && s.player.travel.phase === 'return'
        ? FB.T('You are already traveling home.')
        : (s.player.travel && s.player.travel.phase === 'arrived'
          ? (s.player.travel.purpose === 'relationship'
            ? FB.T('Return along the saved route after the required visit. You may remain together as long as you like.')
            : (s.player.tier >= 3
              ? FB.T('Return along the saved route after the required residence. You may remain as a guest as long as you like.')
              : FB.T('Return along the saved route after the required stay. You may remain and keep finding local work as long as you like.')))
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
  { id: 'travel_marriage_residence', label: '💍 Stay after marriage…', noConsume: true,
    desc: function () {
      return FB.T('Reconsider abdication and residence in the wedding county before this journey ends.');
    },
    show: function (s) {
      return !!(s.player.travel && s.player.travel.marriageResidence);
    },
    can: function (s) {
      return FB.travelMarriageResidenceEligible
        ? FB.travelMarriageResidenceEligible(s)
        : FB.T('The post-marriage residence decision is unavailable.');
    },
    run: function () {
      if (FB.ui && FB.ui.showMarriageResidence) {
        FB.ui.showMarriageResidence();
      }
    } },
  { id: 'travel_settle_here', label: '🏠 Settle here permanently…', noConsume: true,
    desc: function () {
      return FB.T('Move the household here. Each character may make this permanent move only once in their lifetime.');
    },
    show: function (s) {
      return !!(s.player.travel && s.player.travel.phase === 'arrived' &&
        s.player.tier >= 1 && s.player.tier <= 2 &&
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
    desc: function (s) {
      const status = FB.papalAbsolutionStatus &&
        FB.papalAbsolutionStatus(s, s.player.charId);
      if (status) {
        return FB.T('Petition your recognized Pope for absolution. The offering is {money:gold} and the penance costs {piety} piety.', {
          gold:status.offering, piety:status.piety
        });
      }
      return FB.T('Ask the Pope to lift your excommunication. Costs {money:gold} and {piety} piety; Standing with Catholic rulers recovers by {standing}.', {
        gold:FB.religiousHeadBalance('religiousHeadAbsolutionGold', 100),
        piety:FB.religiousHeadBalance('religiousHeadAbsolutionPiety', 100),
        standing:FB.religiousHeadBalance('religiousHeadAbsolutionOpinion', 20)
      });
    },
    show: function (s) {
      return adult(s) && FB.playerExcommunicated && FB.playerExcommunicated(s);
    },
    can: function (s) {
      if (FB.papalAbsolutionStatus) {
        const status = FB.papalAbsolutionStatus(s, s.player.charId);
        return status.ready ? true : status.reason;
      }
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
  { id: 'papacy', label: '⛪ Papacy & College…', noConsume: true,
    desc: function () {
      return FB.T('Review the Pope, College, authority, investiture, sanctions, elections, and any rival obedience.');
    },
    show: function (s) {
      const c = me(s);
      return adult(s) && c && c.religion === 'catholic' && !!FB.ensurePapacy;
    },
    run: function () {
      if (FB.ui && FB.ui.showPapacy) FB.ui.showPapacy();
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
    desc: function (s) {
      if (s && !FB.religiousHeadVacancy(s, 'sunni')) {
        const cause = FB.caliphateWarCause(s);
        const enemy = cause && s.realms[cause.enemy];
        if (enemy) {
          return FB.T('Wrest the Sunni office from {realm} in a succession war — the Caliphate passes to the victor, the loser keeps his lands.', {
            realm:enemy.name
          });
        }
      }
      return FB.T('Attach the vacant Sunni office to your realm. Requires {prestige} prestige and a demesne of {counties} counties, and spends {piety} piety.', {
        prestige:FB.religiousHeadBalance('religiousHeadClaimPrestige', 500),
        counties:FB.religiousHeadBalance('religiousHeadClaimMinRealm', 6),
        piety:FB.religiousHeadBalance('religiousHeadClaimPiety', 300)
      });
    },
    show: function (s) {
      return adult(s) && me(s).religion === 'sunni' && s.player.tier >= 6 &&
        (!!FB.religiousHeadVacancy(s, 'sunni') || !!FB.caliphateWarCause(s));
    },
    can: function (s) {
      if (!FB.isPlayerSovereign(s)) return FB.T('Only an independent king or emperor may claim the Caliphate.');
      if (!FB.religiousHeadVacancy(s, 'sunni')) {
        const playerRealm = FB.playerRealmId(s);
        if (s.player.war ||
            (FB.greatHolyWarCamp && FB.greatHolyWarCamp(s, 'player')) ||
            (playerRealm && FB.isRealmAtWar(s, playerRealm))) {
          return FB.warLockedReason(s);
        }
        const cause = FB.caliphateWarCause(s);
        if (!cause) return FB.T('The sitting Caliph cannot be contested from this world state.');
        const blocked = diplomacyBlocksWar(s, cause.enemy);
        if (blocked === 'war') return FB.T('At war with another realm');
        if (blocked === 'alliance') return FB.T('Your defensive alliance forbids an attack on the Caliph’s realm.');
        if (blocked === 'pact') return FB.T('A sworn peace pact protects the Caliph’s realm.');
        return true;
      }
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
      if ((s.player.provs ? s.player.provs.length : 0) < FB.religiousHeadBalance('religiousHeadClaimMinRealm', 6)) {
        return FB.T('Your demesne needs at least {needed} counties (now {current}).', {
          needed:FB.religiousHeadBalance('religiousHeadClaimMinRealm', 6),
          current:s.player.provs ? s.player.provs.length : 0
        });
      }
      if (!FB.controlsReligiousHeadClaim(s, 'sunni', 'player')) {
        return FB.T('Control Baghdad, or both Mecca and Medina.');
      }
      return FB.canClaimReligiousHead(s, 'sunni', 'player')
        ? true : FB.T('Your realm is not eligible to claim the Caliphate.');
    },
    run: function () {
      const s = FB.state;
      if (s && !FB.religiousHeadVacancy(s, 'sunni')) {
        if (FB.ui && FB.ui.showCaliphateWarConfirmation) {
          FB.ui.showCaliphateWarConfirmation();
        }
        return;
      }
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
      if (FB.playerPope && FB.playerPope(s)) return true;
      for (const religionId in FBDATA.religions) {
        const religion = FBDATA.religions[religionId];
        const head = religion && religion.head && religion.head.greatHolyWar &&
          FB.religiousHeadOf(s, religionId);
        if (head && head.id === 'player') return true;
      }
      return false;
    },
    can: function (s) {
      if (FB.playerPope && FB.playerPope(s)) {
        return FB.canCallGreatHolyWar(s, 'catholic', null, 'player')
          ? true
          : FB.T('Papal authority, schism, the target list, or the campaign cooldown prevents a new call.');
      }
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
        : FB.T('Review coalition strength, resolve, occupations, vows, contribution, and claim standing.');
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
      const cost = FB.greatHolyWarWithdrawalCost
        ? FB.greatHolyWarWithdrawalCost(s)
        : { piety:100, prestige:50, inherited:false, broken:false };
      if (cost.inherited) {
        return FB.T('Decline the inherited vow without a personal penalty, but surrender territorial eligibility.');
      }
      return cost.broken
        ? FB.T('Break the unfinished vow for {piety} piety and {prestige} prestige.', {
          piety:cost.piety, prestige:cost.prestige
        })
        : FB.T('Withdraw after fulfilling the term for {piety} piety and {prestige} prestige.', {
          piety:cost.piety, prestige:cost.prestige
        });
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
  { id: 'great_holy_war_settlement', label: '👑 Enter the settlement council…', noConsume: true,
    desc: function () {
      return FB.T('Take your seat in the settlement council or decide a final territorial grant.');
    },
    show: function (s) {
      return !!(FB.greatHolyWarSettlementNeedsPlayer &&
        FB.greatHolyWarSettlementNeedsPlayer(s));
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
      return adult(s) && !!f &&
        FB.standingOf(s, { kind:'character', id:f.id }) >= 40 &&
        !s.player.flags.sworn_friend;
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
    desc: function () { return 'Maintain living standards and work outfits, or buy permanent household property.'; },
    show: function (s) { return s.player.tier <= 2 && adult(s); },
    can: function (s) {
      return ((FBDATA.householdStandards && FB.householdStandardIds().length) ||
        FB.holdingAvailable(s).length) ? true : 'Nothing suitable for your station remains.';
    },
    run: function (s) {
      if (FB.ui && FB.ui.showHousehold) FB.ui.showHousehold();
      else if (FB.ui && FB.ui.showHoldings) FB.ui.showHoldings();
    } },

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

  { id: 'petition_monopoly', label: '📜 Petition for a guild monopoly', cd: 360,
    requiresTech:'guild_charters',
    desc: function (s) {
      const status = FB.guildMonopolyPetitionStatus(s, true);
      if (!status.ready) return status.reason;
      return FB.T(
        'Ask {grantor} for a {years}-year monopoly: +{enterprise}% matching enterprise profit. Pay {money:25} or rely on Diplomacy.',
        {
          grantor:status.grantor.rulerName,
          years:status.terms.years,
          enterprise:Math.round(status.terms.enterpriseBonus * 100)
        });
    },
    show: function (s) {
      return !!FB.guildMonopolyCareer(s) &&
        !(FB.playerBishopricOnly && FB.playerBishopricOnly(s));
    },
    can: function (s) {
      const status = FB.guildMonopolyPetitionStatus(s, true);
      return status.ready ? true : status.reason;
    },
    run: function (s) {
      const ctx = FB.guildMonopolyPetitionContext(s);
      if (ctx) FB.queueEvent(s, 'guild_monopoly_petition', ctx);
    } },

  { id: 'buy_freedom', label: '⛓ Buy your freedom',
    desc: function () {
      return FB.T('Pay {money:gold} to be struck from the serf-roll.',
        { gold: FBDATA.balance.freedomCost });
    },
    show: function (s) { return s.player.tier === 0 && adult(s); },
    can: function (s) {
      if (s.player.gold < FBDATA.balance.freedomCost) return FB.T('Not enough money.');
      const lord = FB.getRole(s, 'lord', true);
      if (lord && FB.standingOf(s, { kind:'character', id:lord.id }) < -20) {
        return 'The lord despises you and refuses.';
      }
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
      const standing = lord
        ? FB.standingOf(s, { kind:'character', id:lord.id }) : 0;
      if (!lord || standing < B.baronyOpinion) return FB.T(
        'You need at least {needed} Standing with your lord (now {current}).',
        { needed: B.baronyOpinion, current: Math.round(standing) });
      return true;
    },
    run: function (s) {
      const lord = FB.getRole(s, 'lord', true);
      const chance = FB.liegeGrantChance(s,
        0.15 + FB.standingOf(s, { kind:'character', id:lord.id }) / 400 +
          s.player.prestige / 1200);
      if (FB.chance(chance)) {
        FB.queueEvent(s, 'grant_of_barony', {});
      } else {
        FB.news(s, FB.msg('news.action.barony_refused',
          'The lord smiles, promises nothing, and speaks of the weather.', {}));
        FB.adjustStanding(s, { kind:'character', id:lord.id }, -5,
          'deed:petition_barony');
      }
    } },

  { id: 'hold_court', label: '⚖ Hold court', cd: 90,
    desc: function () { return 'Hear petitions and render judgment.'; },
    show: function (s) {
      return s.player.tier >= 3 &&
        !(FB.playerBishopricOnly && FB.playerBishopricOnly(s));
    },
    run: function (s) { FB.queueEvent(s, 'hold_court_event', {}); } },
  { id: 'squeeze_taxes', label: '💰 Squeeze the taxes', cd: 180,
    desc: function () { return 'Extra silver now; grumbling later.'; },
    show: function (s) {
      return s.player.tier >= 3 &&
        !(FB.playerBishopricOnly && FB.playerBishopricOnly(s));
    },
    run: function (s) {
      const tax = Math.max(4, Math.round(FB.playerTax(s) * 0.8));
      FB.applyEffects(s, { gold: tax, popularOpinion: -6 });
    } },
  { id: 'grant_monopoly', label: '📜 Grant a guild monopoly…', noConsume: true,
    requiresTech:'guild_charters',
    desc: function (s) {
      const status = FB.guildMonopolyIssueStatus(s);
      if (!status.ready) return status.reason;
      return FB.T(
        'Grant one local Craft or Trade monopoly for {years} years: receive {money:fee}, gain +{tax}% tax, and change popular opinion by {opinion}.',
        {
          years:status.terms.years,
          fee:status.terms.rulerFee,
          tax:Math.round(status.terms.taxBonus * 100),
          opinion:status.terms.popularOpinion > 0
            ? '+' + status.terms.popularOpinion : status.terms.popularOpinion
        });
    },
    show: function (s) {
      return s.player.tier >= 3 &&
        !(FB.playerBishopricOnly && FB.playerBishopricOnly(s));
    },
    can: function (s) {
      const status = FB.guildMonopolyIssueStatus(s);
      return status.ready ? true : status.reason;
    },
    run: function () {
      if (FB.ui && FB.ui.showGuildMonopolyGrant) FB.ui.showGuildMonopolyGrant();
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
  { id: 'bishopric', label: '⛪ The Bishopric…', noConsume: true,
    desc: function () {
      return 'Review the see, investiture, temporalities, episcopal household, powers, and path to the College of Cardinals.';
    },
    show: function (s) {
      return !!(FB.hasBishopric && FB.hasBishopric(s, me(s)));
    },
    run: function () {
      if (FB.ui && FB.ui.showBishopric) FB.ui.showBishopric();
    } },
  { id: 'visit_diocese', label: '🛤 Visit the diocese', cd: 180,
    desc: function () {
      return 'Make a pastoral circuit, inspect the clergy, or receive local notables.';
    },
    show: function (s) {
      return !!(FB.hasBishopric && FB.hasBishopric(s, me(s)));
    },
    run: function (s) { FB.queueEvent(s, 'bishop_visit_diocese', {}); } },
  { id: 'ecclesiastical_court', label: '⚖ Hold ecclesiastical court', cd: 90,
    desc: function () {
      return 'Judge under canon law: mercifully, strictly, or for customary fees.';
    },
    show: function (s) {
      return !!(FB.hasBishopric && FB.hasBishopric(s, me(s)));
    },
    run: function (s) { FB.queueEvent(s, 'bishop_ecclesiastical_court', {}); } },
  { id: 'convene_synod', label: '📜 Convene a synod', cd: 360,
    desc: function () {
      return 'Spend 10 gold to gather the clergy for reform, learning, or alms.';
    },
    show: function (s) {
      return !!(FB.hasBishopric && FB.hasBishopric(s, me(s)));
    },
    can: function (s) {
      return s.player.gold >= 10 ? true : FB.T('Costs {money:10}.');
    },
    run: function (s) {
      s.player.gold -= 10;
      FB.queueEvent(s, 'bishop_synod', {});
    } },
  { id: 'extraordinary_tithe', label: '🪙 Levy an extraordinary tithe', cd: 360,
    desc: function () {
      return 'Collect fully, moderate the demand, or remit it for pastoral standing.';
    },
    show: function (s) {
      return !!(FB.hasBishopric && FB.hasBishopric(s, me(s)));
    },
    run: function (s) { FB.queueEvent(s, 'bishop_extraordinary_tithe', {}); } },
  { id: 'adopt_tech', label: '💡 Technology…', noConsume: true,
    desc: function (s) {
      const rid = FB.techRealmId(s);
      const realm = s.realms[rid];
      const record = FB.realmTechRecord(s, rid);
      return FB.T('{realm}: {completed} completed · {active}/{slots} active research.', {
        realm:realm ? realm.name : FB.T('Your nation'),
        completed:record.completed.length,
        active:record.active.length,
        slots:FB.techSlotCount(s, rid)
      });
    },
    show: function () { return true; },
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
    show: function (s) {
      return s.player.tier >= 3 && s.player.tier <= 5 && !!s.player.liege &&
        !(FB.playerBishopricOnly && FB.playerBishopricOnly(s));
    },
    can: function (s) {
      const standing = FB.standingOf(s, {
        kind:'realm', id:s.player.liege
      });
      if (standing < 65) return FB.T(
        'Your Standing with your liege must be 65 or more (now {current}).',
        { current: Math.round(standing) });
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
      const standing = FB.standingOf(s, {
        kind:'realm', id:s.player.liege
      });
      if (standing < B.petitionLiegeOp) {
        return FB.T('Your Standing with your liege must be {needed} or more (now {current}).', {
          needed: B.petitionLiegeOp,
          current: Math.round(standing)
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
      const standing = FB.standingOf(s, {
        kind:'realm', id:s.player.liege
      });
      if (standing < 20) {
        return FB.T('Your liege must at least tolerate you (Standing 20+, now {current}).',
          { current: Math.round(standing) });
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
      const preview = FB.playerMusterPreview ? FB.playerMusterPreview(s) : null;
      return FB.T('Raise your levies and hired companies as a field host — ~{men} men at your seat. Then tap the host on the map and tap a province to march it.',
        { men: preview ? preview.men : FB.playerLevy(s) });
    },
    show: function (s) {
      if (!s.player.war && !(FB.playerGreatHolyWarHostActive &&
          FB.playerGreatHolyWarHostActive(s))) return false;
      if (FB.playerHost && FB.playerHost(s)) return false; // already in the field
      const down = (s.armyDown || {})['player'];
      return down === undefined || s.turn - down >= FBDATA.balance.armyRearmDays;
    },
    can: function (s) {
      const preview = FB.playerMusterPreview ? FB.playerMusterPreview(s) : null;
      if (preview && !preview.canRaise) {
        return FB.T('At least {minimum} men must answer before a field host can form; only {men} are available. Hire mercenaries before mustering again.', {
          minimum:preview.minimum, men:preview.men
        });
      }
      return true;
    },
    run: function (s) { if (FB.raisePlayerHost) FB.raisePlayerHost(s); } },
  { id: 'demuster_host', label: '🏳 De-muster the host',
    desc: function (s) {
      const prev = FB.demusterPreview ? FB.demusterPreview(s) : null;
      if (!prev) return FB.T('Send the field host home.');
      const days = FBDATA.balance.armyRearmDays || 60;
      if (prev.where === 'own') {
        return FB.T('Send the host home where it stands. On your own land every man returns to the rolls — {men} preserved for the next muster, which must wait {days} days.',
          { men: prev.men, days: days });
      }
      if (prev.where === 'realm') {
        return FB.T('Send the host home where it stands. On your realm’s land only {pct}% return to the rolls — {men} preserved; the next muster must wait {days} days.',
          { men: prev.men, pct: Math.round(prev.frac * 100), days: days });
      }
      return FB.T('Send the host home where it stands. On foreign soil the host scatters — no men return to the rolls, and the next muster must wait {days} days.',
        { days: days });
    },
    show: function (s) {
      if (!s.player.war) return false;
      // a great-holy-war host is vow-bound — withdrawal runs its own path
      if (FB.playerGreatHolyWarHostActive && FB.playerGreatHolyWarHostActive(s)) return false;
      return !!(FB.playerHost && FB.playerHost(s));
    },
    run: function (s) { if (FB.demusterPlayerHost) FB.demusterPlayerHost(s); } },
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
      return !(FB.playerBishopricOnly && FB.playerBishopricOnly(s)) &&
        (s.player.tier >= 3 || !!(me && me.restorationRight));
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
    show: function (s) {
      return s.player.tier >= 3 && !!s.player.liege && !s.player.war &&
        !(FB.playerBishopricOnly && FB.playerBishopricOnly(s));
    },
    can: function (s) {
      const sovereign = FB.topRealm(s, s.player.liege);
      if (sovereign && FB.isRealmAtWar(s, sovereign)) return FB.T('At war with another realm');
      return s.player.prestige >= 200 ? true
        : FB.T('You need at least 200 prestige to rally men to your banner (now {current}).',
          { current: Math.round(s.player.prestige) });
    },
    run: function (s) { if (FB.ui && FB.ui.showIndependence) FB.ui.showIndependence(); } },
  { id: 'pay_homage', label: '🙇 Pay homage…', noConsume: true, cd: 180,
    desc: function () { return 'Bend the knee at your liege’s court — or a court above his. (+Standing)'; },
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
        return FB.T('Your council will not suffer it — crown authority is too weak ({authority}/100). Win their support, or let the crown’s rights mend with time.',
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
        return FB.T('Your council will not suffer it — crown authority is too weak ({authority}/100). Win their support, or let the crown’s rights mend with time.',
          { authority: Math.round(s.council.authority) });
      }
      return true;
    },
    run: function (s) { if (FB.ui && FB.ui.showRevoke) FB.ui.showRevoke(); } },
  { id: 'governance', label: '🏛 Governance…', noConsume: true,
    desc: function () {
      return FB.T('Your political position, domain, obligations, vassals, institution, and currently available realm actions.');
    },
    show: function (s) {
      return FB.governanceEligible && FB.governanceEligible(s);
    },
    run: function () {
      if (FB.ui && FB.ui.showGovernance) FB.ui.showGovernance();
    } },
  { id: 'the_estates', label: '🏛 The Estates…', noConsume: true,
    compatibilityAlias:true,
    desc: function () {
      return FB.T('The assembled lords of the realm — your voice among them, and the terms of your service: the liege’s aid, and silver in place of spears.');
    },
    show: function (s) { return FB.parliamentActive && FB.parliamentActive(s); },
    run: function (s) { if (FB.ui && FB.ui.showParliament) FB.ui.showParliament(); } },
  { id: 'coin_credit', label: '💰 Coin & Credit…', noConsume: true,
    desc: function () {
      return FB.T('Prices, reliable income, loans, pledged property, and trade ventures.');
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
    compatibilityAlias:true,
    desc: function () { return 'Your great officers of the crown — their offices, their tempers, and the weight they throw around.'; },
    show: function (s) { return s.player.tier >= 6; },
    run: function (s) { if (FB.ui && FB.ui.showCouncil) FB.ui.showCouncil(); } }
  ];

  /* ================= shared helpers ================= */

  function countyTaxBase(state, pid, rate) {
    const local = FB.modBonus ? FB.modBonus(state, 'tax', pid) : 0;
    return (state.dev[pid] || 1) * rate * Math.max(0, 1 + local);
  }

  /* One direct vassal's exact seasonal tax source. The settlement tax ledger
     and Governance use this same adapter. */
  FB.vassalTaxContribution = function (state, rid) {
    const realm = state.realms[rid];
    if (!realm || !realm.alive || realm.liege !== 'player') return 0;
    let total = 0;
    for (const pid of FB.realmHeldCounties(state, rid)) {
      total += countyTaxBase(state, pid, FBDATA.balance.vassalTaxRate);
    }
    return total;
  };

  /* One calculation feeds settlement, reliable income, and the displayed
     ledger. County rates are applied before domain and national modifiers. */
  FB.playerTaxParts = function (state) {
    const B = FBDATA.balance;
    const p = state.player;
    let rents = 0;
    for (const pid of (p.provs || [])) {
      rents += countyTaxBase(state, pid, B.taxPerDev);
    }
    const bishopric = FB.bishopricIncome ? FB.bishopricIncome(state) : 0;
    if (p.tier === 3 && !bishopric) {
      /* A baron's seat is their liege's county, so no rent line above covers
         it and the loop applied no county tax modifier. The estate records
         sitting on that seat still act on the baron's own revenues, by the
         same ownership rule that already charges them upkeep for those
         records. Without this a Market Charter costs a baron gold every
         season and returns nothing. See FB.modifierCounties. */
      const seat = FB.modifierSeat ? FB.modifierSeat(state) : null;
      const local = seat && FB.modBonus ? FB.modBonus(state, 'tax', seat) : 0;
      rents = Math.max(rents, 6 * Math.max(0, 1 + local));
    }
    rents *= FB.domainPenalty(state);
    const rentBase = rents;
    const rentTraits = [];
    const me = state.chars[p.charId];
    for (const tid of (me ? me.traits : [])) {
      const trait = FBDATA.traits[tid];
      const rate = trait && trait.estate && Number(trait.estate.rent);
      if (!isFinite(rate) || !rate) continue;
      const amount = rentBase * rate;
      rentTraits.push({ id:tid, amount:amount });
      rents += amount;
    }
    let dues = 0;
    for (const vid of FB.playerVassals(state)) {
      dues += FB.vassalTaxContribution(state, vid);
    }
    const tolls = FB.buildingBonus(state, 'tax');
    const taxable = rents + dues + tolls;
    const national = taxable * FB.techBonus(state, 'tax');
    const council = taxable * (FB.councilBonus ? FB.councilBonus(state, 'tax') : 0);
    const positions = taxable * (FB.positionBonus ? FB.positionBonus(state, 'tax') : 0);
    const monopoly = taxable *
      (FB.guildMonopolyTaxBonus ? FB.guildMonopolyTaxBonus(state) : 0);
    const papacy = taxable *
      (FB.papacyInvestitureTaxRate ? FB.papacyInvestitureTaxRate(state) : 0);
    const beforeLiege = taxable + national + council + positions + monopoly +
      papacy + bishopric;
    const liege = p.liege
      ? -beforeLiege * (FB.parliamentAid ? FB.parliamentAid(state) : 0.25) : 0;
    return {
      rents:rents, rentBase:rentBase, rentTraits:rentTraits,
      dues:dues, tolls:tolls, taxable:taxable,
      national:national, council:council, positions:positions,
      monopoly:monopoly, papacy:papacy, bishopric:bishopric,
      liege:liege, total:beforeLiege + liege
    };
  };

  FB.playerTax = function (state) {
    return Math.round(FB.playerTaxParts(state).total);
  };

  /* ===== domain limit: how much land the player may hold in his own hand =====
     A lord can only govern so many counties directly; past the cap, income and
     levy bleed. The remedy is to grant the surplus to vassals (grant_land). */
  FB.domainCap = function (state) {
    const B = FBDATA.balance;
    const me = state.chars[state.player.charId];
    const ste = me ? FB.skillOf(me, 'ste') : 0;
    return (B.domainBase || 4) + Math.floor(ste / (B.domainStewPer || 5)) +
      FB.techBonus(state, 'domain');
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

  function governancePromotion(state) {
    const tier = state.player.tier;
    const offered = [];
    function offer(kind, id, progress) {
      if (!progress || !progress.total) return;
      offered.push({
        kind:kind,
        id:id,
        have:progress.have,
        total:progress.total,
        need:progress.need,
        titled:progress.titled !== false
      });
    }
    if (tier <= 4) {
      for (const did in FBDATA.duchies) {
        const progress = FB.duchyProgress(state, did);
        if (progress.have) offer('duchy', did, progress);
      }
    } else if (tier === 5) {
      for (const kid in FBDATA.kingdoms) {
        const progress = FB.kingdomProgress(state, kid);
        if (progress.have) offer('kingdom', kid, progress);
      }
    } else if (tier === 6) {
      for (const eid in FBDATA.empires) {
        const progress = FB.empireProgress(state, eid);
        if (progress.have) offer('empire', eid, progress);
      }
    }
    offered.sort(function (a, b) {
      if (a.have !== b.have) return b.have - a.have;
      if (a.total !== b.total) return a.total - b.total;
      return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
    });
    return offered.length ? offered[0] : null;
  }

  /* Territorial politics is not a tier synonym: a barony qualifies, a
     see-only Bishop or Chief Qadi does not, and observe mode has no player
     management surface. */
  FB.governanceEligible = function (state) {
    if (!state || !state.player || !state.realms ||
        (FB.game && FB.game.observe)) return false;
    const p = state.player;
    if (p.dead || p.tier < 3) return false;
    if (p.provs && p.provs.length) return true;
    const me = state.chars && state.chars[p.charId];
    const ranks = me && me.religiousRanks || {};
    const seeOnly = !!(me && me.religion === 'catholic' &&
      me.papalOffice !== 'pope' && !(p.flags && p.flags.pope) &&
      ((me.bishopric && typeof me.bishopric === 'object' &&
        !Array.isArray(me.bishopric)) ||
       (me.bishopricVacatedTurn === undefined &&
        ((ranks.catholic_monastic || 0) >= 4 ||
         (ranks.catholic_clerical || 0) >= 5 ||
         (p.flags && p.flags.bishop)))));
    if (seeOnly) return false;
    if (p.flags && p.flags.chief_qadi) return false;
    if (p.tier !== 3 || !p.liege) return false;
    const holder = (state.holder && state.holder[p.provinceId]) ||
      (state.owner && state.owner[p.provinceId]);
    return holder === p.liege && !!(state.realms[p.liege] &&
      state.realms[p.liege].alive);
  };

  /* One deterministic, locale-neutral political projection. It stores
     nothing and delegates domain, hierarchy, institution, tax, levy, and
     Standing values to their owning helpers. */
  FB.governanceSummary = function (state) {
    if (!FB.governanceEligible(state)) return null;
    const p = state.player;
    const playerRealm = state.realms.player && state.realms.player.alive
      ? state.realms.player : null;
    const directCounties = (p.provs || []).slice();
    const realmCounties = playerRealm
      ? FB.realmTerritory(state, 'player').slice() : [];
    directCounties.sort();
    realmCounties.sort();
    const council = FB.councilSummary ? FB.councilSummary(state) : null;
    const estates = FB.parliamentSummary ? FB.parliamentSummary(state) : null;
    const politics = FB.politicalSummary ? FB.politicalSummary(state) : null;
    const obligations = p.liege && FB.parliamentTerms
      ? FB.parliamentTerms(state) : null;
    const levyFavors = p.vassalLevyFavors || {};
    const directVassals = [];
    const vassalIds = FB.playerVassals(state).slice().sort();
    for (const rid of vassalIds) {
      let seatId = null;
      if (council) {
        for (const seat of council.seats) {
          if (seat.holderId === rid) {
            seatId = seat.id;
            break;
          }
        }
      }
      const until = Number(levyFavors[rid]);
      directVassals.push({
        realmId:rid,
        countyIds:FB.realmHeldCounties(state, rid).slice().sort(),
        standing:FB.standingOf(state, { kind:'realm', id:rid }),
        taxContribution:FB.vassalTaxContribution(state, rid),
        levyContribution:FB.vassalLevyContribution
          ? FB.vassalLevyContribution(state, rid) : 0,
        councilSeatId:seatId,
        exceptionalLevyUntil:isFinite(until) && until > state.turn
          ? until : null
      });
    }
    let institution = 'none';
    if (estates) institution = 'estates';
    else if (council) institution = 'council';
    const pending = [];
    if (estates) {
      for (const id of estates.pendingEventIds) {
        pending.push({ kind:'event', id:id });
      }
    }
    if (council) {
      for (const id of council.vacancyIds) {
        pending.push({ kind:'vacancy', id:id });
      }
    }
    const domainCap = FB.domainCap(state);
    const domainExcess = Math.max(0, directCounties.length - domainCap);
    const warnings = [];
    if (domainExcess) {
      warnings.push({ id:'domain_excess', amount:domainExcess });
    }
    if (p.war) warnings.push({ id:'personal_war' });
    else if (p.flags && p.flags.with_liege_host) {
      warnings.push({ id:'liege_service' });
    } else if (FB.playerRealmAtWar && FB.playerRealmAtWar(state)) {
      warnings.push({ id:'realm_war' });
    }
    if (council && council.needsConsent) {
      warnings.push({ id:'council_consent' });
    }
    for (const rid of council ? council.schemerIds : []) {
      warnings.push({ id:'council_schemer', realmId:rid });
    }
    const sovereignId = p.liege ? FB.topRealm(state, p.liege)
      : (playerRealm ? 'player' : null);
    const grantableDuchies = FB.grantableDuchies(state).map(function (item) {
      return {
        id:item.did,
        countyIds:item.counties.slice().sort()
      };
    }).sort(function (a, b) {
      return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
    });
    const modifierCounties = [];
    if (FB.countyModifierSnapshot) {
      /* The same ownership rule the modifier consumers use, not the directly
         held list. A baron holds no county and would otherwise pay upkeep on
         a record with nowhere in the game to see it. */
      const scoped = (FB.modifierCounties
        ? FB.modifierCounties(state) : directCounties).slice().sort();
      for (const pid of scoped) {
        const records = FB.countyModifierSnapshot(state, pid).map(
          function (record) {
            const out = { id:record.id };
            if (record.endTurn !== undefined) out.endTurn = record.endTurn;
            if (record.sourceEventId) {
              out.sourceEventId = record.sourceEventId;
            }
            return out;
          });
        if (records.length) {
          modifierCounties.push({ provinceId:pid, records:records });
        }
      }
    }
    return {
      role:p.liege ? 'vassal' : (p.tier >= 6 ? 'crowned' : 'sovereign'),
      playerRealmId:playerRealm ? 'player' : null,
      liegeId:p.liege || null,
      sovereignId:sovereignId,
      homeCountyId:p.provinceId || null,
      capitalCountyId:playerRealm && playerRealm.capital
        ? playerRealm.capital : (p.provinceId || null),
      directCounties:directCounties,
      realmCounties:realmCounties,
      modifierCounties:modifierCounties,
      domainCap:domainCap,
      domainExcess:domainExcess,
      domainMultiplier:FB.domainPenalty(state),
      directVassals:directVassals,
      grantableDuchies:grantableDuchies,
      promotion:governancePromotion(state),
      institution:institution,
      estates:estates,
      council:council,
      politics:politics,
      obligations:obligations,
      warService:p.warService || 0,
      servingLiegeWar:!!(p.flags && p.flags.with_liege_host),
      pending:pending,
      warnings:warnings
    };
  };

  /* the current focus's expected per-season yield (the `gain` mirror of its
     daily tick), or null when the focus pays no gold/prestige/piety */
  FB.focusIncome = function (state) {
    if (state.player.travel) return null;
    for (const f of FB.focuses) {
      if (f.id === state.player.focus) {
        if (!f.gain) return null;
        const raw = f.gain(state);
        if (!raw) return null;
        const out = {};
        const mult = vocationalMultiplier(state, f);
        for (const key in raw) {
          out[key] = raw[key] > 0 ? raw[key] * mult : raw[key];
        }
        return out;
      }
    }
    return null;
  };

  /* Locale-neutral standing seasonal cash flow. Credit capacity and the
     displayed ledger both use this numeric source; neither parses localized
     labels from incomeBreakdown. */
  FB.reliableGoldIncome = function (state, ignoreAssignments) {
    const p = state.player;
    let total = -FB.householdUpkeep(state);
    if (FB.householdStandardsUpkeep) total -= FB.householdStandardsUpkeep(state);
    if (FB.playerHostUpkeepParts) total -= FB.playerHostUpkeepParts(state).total;
    if (FB.modifierUpkeep) total -= FB.modifierUpkeep(state, 'gold');
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
    const p = state.player;
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
       demesne rents, vassal dues, tolls — grown by national technology,
       cut by a liege */
    if (p.tier >= 3) {
      const tax = FB.playerTaxParts(state);
      add('gold', FB.T('Rents from your lands'), tax.rentBase);
      for (const source of tax.rentTraits) {
        const trait = FBDATA.traits[source.id];
        if (!trait) continue;
        add('gold', FB.T('{trait} — direct rent', {
          trait:FB.dataText(state, p.charId, 'trait', source.id, trait, 'name', {})
        }), source.amount);
      }
      add('gold', FB.T('Vassal dues'), tax.dues);
      addBuildings('gold', 'tax');
      add('gold', FB.T('National technology'), tax.national);
      add('gold', FB.T('Royal Seneschal'), tax.council);
      add('gold', FB.T('Guild monopoly tolls'), tax.monopoly);
      add('gold', FB.T('Investiture policy'), tax.papacy);
      add('gold', FB.T('Episcopal temporalities'), tax.bishopric);
      if (FB.positionContributions) {
        for (const source of FB.positionContributions(state, 'tax')) {
          const def = FBDATA.positions[source.id];
          if (!def) continue;
          const amount = tax.taxable * source.amount;
          const holder = source.charId && state.chars[source.charId];
          const name = FB.dataText(state, p.charId, 'position', source.id, def, 'name');
          add('gold', holder ? FB.T('{position} — {name}', {
            position:name, name:holder.name
          }) : name, amount);
        }
      }
      if (p.liege) {
        add('gold', FB.T('Liege’s cut'), tax.liege);
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
    if (FB.householdStandardsUpkeep) {
      add('gold', FB.T('Maintained household standards'),
        -FB.householdStandardsUpkeep(state));
    }
    if (FB.householdStandardEffect) {
      add('prestige', FB.T('Household luxuries'),
        FB.householdStandardEffect(state, 'prestige'));
    }
    add('gold', FB.T('Wartime scarcity for household necessities'), -upkeep.wartime);
    if (FB.modifierUpkeepEntries) {
      for (const entry of FB.modifierUpkeepEntries(state, 'gold')) {
        const def = FBDATA.modifiers[entry.id];
        const province = FB.world.byId[entry.pid];
        if (!def) continue;
        add('gold', FB.T('{modifier} — {county}', {
          modifier:def.icon + ' ' +
            FB.dataText(state, p.charId, 'modifier', entry.id, def, 'name'),
          county:province ? province.name : entry.pid
        }), -entry.amount);
      }
    }
    if (FB.playerHostUpkeepParts) {
      const hostUpkeep = FB.playerHostUpkeepParts(state);
      add('gold', FB.T('Raised-host base logistics'), -hostUpkeep.base);
      add('gold', FB.T('Levy food and supplies'), -hostUpkeep.levy);
      add('gold', FB.T('Archer food and supplies'), -hostUpkeep.archers);
      add('gold', FB.T('Cavalry fodder and supplies'), -hostUpkeep.cavalry);
      add('gold', FB.T('Men-at-arms food and supplies'), -hostUpkeep.retinue);
      add('gold', FB.T('Mercenary company contracts'), -hostUpkeep.mercenaries);
      if (hostUpkeep.campaignModifier) {
        add('gold', FB.T('Campaign supply modifiers'), -hostUpkeep.campaignModifier);
      }
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

  function plotOption(context, label, desc, icon, extra) {
    const out = {
      context:context, label:label, desc:desc || '', icon:icon || '🕸'
    };
    extra = extra || {};
    for (const key in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, key)) out[key] = extra[key];
    }
    return out;
  }

  function politicalRivalContext(state) {
    const rival = FB.getRole(state, 'rival', false);
    if (!rival || rival.dead) return null;
    const ctx = { characterId:rival.id };
    const rulingRealmId = FB.realmIdForRulerCharacter &&
      FB.realmIdForRulerCharacter(state, rival);
    const realmId = rulingRealmId ||
      (rival.royalLine && rival.royalLine.realmId) ||
      (rival.restorationRight && rival.restorationRight.realmId) || null;
    if (realmId && state.realms[realmId] && state.realms[realmId].alive) {
      ctx.realmId = realmId;
    }
    if (rival.restorationRight) {
      ctx.contractId = 'restoration_right:' +
        (rival.restorationRight.createdTurn || 0);
      return ctx;
    }
    const retainer = FB.retainerRecord && FB.retainerRecord(state, rival.id);
    if (retainer) {
      ctx.contractId = 'retainer:' + retainer.office + ':' +
        (retainer.startedTurn || 0);
      return ctx;
    }
    if (rulingRealmId && ctx.realmId && state.council &&
        state.council.seats) {
      for (const seatId in state.council.seats) {
        if (state.council.seats[seatId] === ctx.realmId) {
          ctx.institution = 'council';
          return ctx;
        }
      }
    }
    return ctx.realmId ? ctx : null;
  }

  FB.plotTargetOptions = function (state, def) {
    const out = [];
    if (!def || !def.target) return out;
    if (def.target === 'border_county_without_dejure') {
      for (const pid of FB.claimCandidates(state)) {
        const pr = FB.world.byId[pid], realm = pr && state.realms[state.owner[pid]];
        out.push(plotOption(
          { pid:pid }, pr ? pr.name : pid,
          realm ? FB.T('Held by {realm}', { realm:realm.name }) :
            FB.T('Held by another realm'),
          '📜', { provinceId:pid, realmId:realm ? realm.id : null }
        ));
      }
    } else if (def.target === 'current_liege_obligation') {
      const liege = state.player.liege && state.realms[state.player.liege];
      if (liege && FB.parliamentActive && FB.parliamentActive(state) &&
          FB.parliamentAid(state) >
            (FBDATA.balance.parliamentAidMin || 0.10) + 0.001) {
        out.push(plotOption(
          { realmId:liege.id, institution:'estates', contractId:'obl' },
          FB.T('The obligations owed to {realm}', { realm:liege.name }),
          FB.T('Aid {aid}% · {scutage}', {
            aid:Math.round(FB.parliamentAid(state) * 100),
            scutage:FB.parliamentScutage(state)
              ? FB.T('scutage in force') : FB.T('personal service owed')
          }),
          '⚖', { realmId:liege.id }
        ));
      }
    } else if (def.target === 'active_guild_monopoly') {
      if (FB.guildMonopolyPlotTargets) {
        for (const target of FB.guildMonopolyPlotTargets(state)) {
          out.push(plotOption(
            { contractId:target.contractId }, target.label, target.desc,
            '📜', { contractId:target.contractId, realmId:target.realmId || null }
          ));
        }
      }
    } else if (def.target === 'council_schemer') {
      if (FB.councilSchemers) {
        for (const member of FB.councilSchemers(state)) {
          const seatNames = {
            seneschal:'Seneschal', constable:'Constable', treasurer:'Treasurer',
            almoner:'Almoner', chamberlain:'Chamberlain'
          };
          const traitDef = FBDATA.traits &&
            FBDATA.traits[member.realm.ruler.trait];
          out.push(plotOption(
            {
              realmId:member.rid,
              institution:'council',
              rulerGeneration:FB.realmRulerGeneration(state, member.rid)
            },
            FB.T('{ruler} of {realm}', {
              ruler:member.realm.ruler.name, realm:member.realm.name
            }),
            FB.T('{office} · {trait} · Standing {standing}', {
              office:FB.T(seatNames[member.seat.id] || member.seat.id),
              trait:traitDef && FB.dataText
                ? FB.dataText(state, state.player.charId, 'trait',
                  member.realm.ruler.trait, traitDef, 'name', {})
                : member.realm.ruler.trait,
              standing:Math.round(FB.standingOf(state, {
                kind:'realm', id:member.rid
              }))
            }),
            '🗝', { realmId:member.rid }
          ));
        }
      }
    } else if (def.target === 'diplomatic_correspondence') {
      if (!FB.isPlayerSovereign(state)) return out;
      const seen = {};
      const ids = FB.foreignPolicyTargets(state).slice();
      for (const rid in (state.pacts || {})) {
        if (state.pacts[rid] > state.turn && ids.indexOf(rid) < 0) ids.push(rid);
      }
      const ally = FB.alliedRealm ? FB.alliedRealm(state, 'player') : null;
      if (ally && ids.indexOf(ally) < 0) ids.push(ally);
      ids.sort();
      for (const rid of ids) {
        const realm = state.realms[rid];
        if (!realm || !realm.alive || realm.liege || seen[rid]) continue;
        seen[rid] = 1;
        let relation = FB.T('neighboring sovereign');
        if (FB.areAllied(state, 'player', rid)) relation = FB.T('defensive ally');
        else if (state.pacts && state.pacts[rid] > state.turn) relation = FB.T('peace-pact partner');
        else if (FB.foreignPolicyStance(state, rid) > 0) relation = FB.T('Improve direction');
        else if (FB.foreignPolicyStance(state, rid) < 0) relation = FB.T('Provoke direction');
        out.push(plotOption(
          { realmId:rid }, FB.T('{ruler} of {realm}', {
            ruler:realm.ruler.name, realm:realm.name
          }),
          FB.T('{relation} · Standing {standing}', {
            relation:relation,
            standing:Math.round(FB.standingOf(state, { kind:'realm', id:rid }))
          }),
          '✉', { realmId:rid }
        ));
      }
    } else if (def.target === 'political_rival') {
      const context = politicalRivalContext(state);
      const rival = context && state.chars[context.characterId];
      if (rival) {
        let connection = FB.T('a political connection');
        if (context.institution === 'council') connection = FB.T('a seat on your Council');
        else if (context.contractId &&
            context.contractId.indexOf('restoration_right:') === 0) {
          connection = FB.T('a restoration claim');
        }
        else if (context.contractId &&
            context.contractId.indexOf('retainer:') === 0) {
          connection = FB.T('a household office');
        } else if (context.realmId) connection = FB.T('a royal or ruling house');
        out.push(plotOption(
          context, FB.fullName(rival),
          FB.T('Your rival · connected to {connection}', { connection:connection }),
          '🗡', { characterId:rival.id, realmId:context.realmId || null }
        ));
      }
    }
    return out;
  };

  function samePlotContext(expected, actual) {
    if (!expected || !actual) return false;
    for (const key in expected) {
      if (expected[key] !== actual[key]) return false;
    }
    return true;
  }

  FB.plotTargetValid = function (state, def, context) {
    if (!def || !def.target) return true;
    for (const option of FB.plotTargetOptions(state, def)) {
      if (samePlotContext(option.context, context)) return true;
    }
    return false;
  };

  FB.plotTargetContext = function (state, def, context) {
    for (const option of FB.plotTargetOptions(state, def)) {
      if (samePlotContext(option.context, context)) {
        const out = {};
        for (const key in option.context) out[key] = option.context[key];
        return out;
      }
    }
    return null;
  };

  FB.plotContextLabel = function (state, def, context) {
    for (const option of FB.plotTargetOptions(state, def)) {
      if (samePlotContext(option.context, context)) return option.label;
    }
    if (context && (context.provinceId || context.pid)) {
      const province = FB.world.byId[context.provinceId || context.pid];
      if (province) return province.name;
    }
    if (context && context.realmId && state.realms[context.realmId]) {
      return state.realms[context.realmId].name;
    }
    if (context && context.characterId && state.chars[context.characterId]) {
      return FB.fullName(state.chars[context.characterId]);
    }
    return '';
  };

  /* Legacy selector readers receive the primary stable id. New code uses
     plotTargetOptions so compound semantic contexts stay intact. */
  FB.plotTargets = function (state, def) {
    const out = [];
    for (const option of FB.plotTargetOptions(state, def)) {
      const ctx = option.context;
      out.push(ctx.provinceId || ctx.pid || ctx.realmId || ctx.characterId ||
        ctx.contractId);
    }
    return out;
  };

  FB.beginPlot = function (state, id, context) {
    const def = FBDATA.plots[id];
    if (!def || state.player.plot) return;
    if (def.trigger && !FB.checkTrigger(state, def.trigger)) return;
    if (def.target) {
      context = FB.plotTargetContext(state, def, context);
      if (!context) return;
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

  FB.activePlotContext = function (state, id, ctx) {
    const plot = state.player.plot;
    const def = FBDATA.plots[id];
    if (!plot || plot.id !== id || !def) return false;
    if (!def.target) return true;
    if (ctx && !samePlotContext(plot.context, ctx)) return false;
    return FB.plotTargetValid(state, def, plot.context);
  };

  FB.fns.plot_event_context_valid = function (state, ctx) {
    const plot = state.player.plot;
    const id = ctx && ctx.plotId;
    const def = id && FBDATA.plots[id];
    if (!plot || plot.id !== id || !def) return false;
    if (!def.target) return true;
    return samePlotContext(plot.context, ctx) &&
      FB.plotTargetValid(state, def, plot.context);
  };

  /* ================= liege chain & vassalage ================= */

  /* One player-relative relationship score, backed by the legacy save
     fields. Typed targets keep callers from having to know whether a
     counterpart currently lives in character.opinion, player.liegeOp, or
     player.liegeOps. A materialized reigning ruler always resolves through
     the realm store, so the character and realm sheets cannot diverge. */
  FB.standingOf = function (state, target) {
    if (!state || !state.player || !target || !target.kind || !target.id) {
      return 0;
    }
    if (target.kind === 'character') {
      const c = state.chars && state.chars[target.id];
      if (!c || c.dead || c.id === state.player.charId) return 0;
      const rid = FB.realmIdForRulerCharacter &&
        FB.realmIdForRulerCharacter(state, c);
      if (rid) return FB.standingOf(state, { kind:'realm', id:rid });
      return FB.clamp(Number(c.opinion) || 0, -100, 100);
    }
    if (target.kind === 'realm') {
      if (target.id === 'player') return 0;
      if (FB.realmRulerStandingSnapshot) {
        return FB.realmRulerStandingSnapshot(state, target.id);
      }
      const p = state.player;
      if (target.id === p.liege) return p.liegeOp || 0;
      return (p.liegeOps && p.liegeOps[target.id]) || 0;
    }
    return 0;
  };

  FB.adjustStanding = function (state, target, amount, source) {
    if (!state || !state.player || !target || !target.kind || !target.id) {
      return 0;
    }
    amount = Number(amount) || 0;
    /* `source` deliberately remains transient metadata for now. It must not
       put rendered prose or an itemized explanation into saved state. */
    void source;
    if (target.kind === 'character') {
      const c = state.chars && state.chars[target.id];
      if (!c || c.dead || c.id === state.player.charId) return 0;
      const rid = FB.realmIdForRulerCharacter &&
        FB.realmIdForRulerCharacter(state, c);
      if (rid) {
        return FB.adjustStanding(state, { kind:'realm', id:rid }, amount,
          source);
      }
      c.opinion = FB.clamp(FB.standingOf(state, target) + amount, -100, 100);
      return c.opinion;
    }
    if (target.kind === 'realm') {
      if (target.id === 'player') return 0;
      const value = FB.clamp(FB.standingOf(state, target) + amount,
        -100, 100);
      if (FB.setRealmRulerStanding) {
        return FB.setRealmRulerStanding(state, target.id, value);
      }
      const p = state.player;
      if (target.id === p.liege) p.liegeOp = value;
      else {
        p.liegeOps = p.liegeOps || {};
        p.liegeOps[target.id] = value;
      }
      return value;
    }
    return 0;
  };

  /* The direct liege uses a dedicated legacy field, so changing that pointer
     must move scores by realm identity before any later adjustment. */
  FB.changePlayerLiege = function (state, rid, source) {
    if (!state || !state.player) return null;
    const p = state.player;
    rid = rid || null;
    if (rid === 'player') rid = null;
    const oldRid = p.liege || null;
    if (oldRid === rid) {
      if (state.realms && state.realms.player &&
          state.realms.player.alive) {
        state.realms.player.liege = rid;
        if (FB.invalidateRealmCache) FB.invalidateRealmCache();
      }
      return rid;
    }
    const oldStanding = oldRid && oldRid !== 'player'
      ? FB.standingOf(state, { kind:'realm', id:oldRid }) : 0;
    const nextStanding = rid
      ? FB.standingOf(state, { kind:'realm', id:rid }) : 0;
    void source;
    p.liege = rid;
    p.liegeOp = 0;
    p.liegeOps = p.liegeOps || {};
    if (oldRid && oldRid !== 'player') {
      FB.setRealmRulerStanding(state, oldRid, oldStanding);
    }
    if (rid) {
      FB.setRealmRulerStanding(state, rid, nextStanding);
      delete p.liegeOps[rid];
    }
    if (state.realms && state.realms.player &&
        state.realms.player.alive) {
      state.realms.player.liege = rid;
    }
    if (FB.invalidateRealmCache) FB.invalidateRealmCache();
    if (FB.repairPolitics) FB.repairPolitics(state);
    return rid;
  };

  /* The current save shape records only counterpart-to-current-protagonist
     scores, not pairwise relationships. On succession every personal and
     political score therefore starts neutral; copying a predecessor's score
     would invent a relationship the game never tracked. */
  FB.resetStandingsForSuccession = function (state) {
    if (!state || !state.player) return;
    const chars = state.chars || {};
    for (const id in chars) {
      const c = chars[id];
      if (!c) continue;
      c.opinion = 0;
      if (c.realmStanding !== undefined) c.realmStanding = 0;
    }
    state.player.liegeOp = 0;
    state.player.liegeOps = {};
  };

  /* Historical names remain compatibility adapters for saves, events, and
     mods. New code should use the typed Standing interface above. */
  FB.liegeOpOf = function (state, rid) {
    return FB.standingOf(state, { kind:'realm', id:rid });
  };
  FB.adjustLiegeOp = function (state, rid, amt) {
    return FB.adjustStanding(state, { kind:'realm', id:rid }, amt,
      'legacy:adjustLiegeOp');
  };
  FB.realmOpinionOf = function (state, rid) {
    return FB.standingOf(state, { kind:'realm', id:rid });
  };
  FB.adjustRealmOpinion = function (state, rid, amt) {
    return FB.adjustStanding(state, { kind:'realm', id:rid }, amt,
      'legacy:adjustRealmOpinion');
  };

  /* Retained for older UI mods and historical durable gift-message keys.
     Standing no longer changes its player-facing name by feudal context. */
  FB.rulerGiftUsesFavor = function (state, rid) {
    if (!rid || rid === 'player') return false;
    const p = state.player;
    const upward = p.liege ? FB.liegeChain(state, p.liege) : [];
    if (upward.indexOf(rid) >= 0) return true;
    let cur = state.realms[rid];
    const seen = {};
    while (cur && cur.liege && !seen[cur.id]) {
      seen[cur.id] = 1;
      if (cur.liege === 'player') return true;
      cur = state.realms[cur.liege];
    }
    return false;
  };

  FB.rulerCashGiftCost = function (state, rid) {
    const fallback = [0, 10, 15, 25, 40];
    const costs = FBDATA.balance.rulerCashGiftCostByRank || fallback;
    const r = state.realms && state.realms[rid];
    const rank = FB.clamp(r && r.rank || 1, 1, 4);
    const value = costs[rank] === undefined ? fallback[rank] : costs[rank];
    return Math.max(0, Number(value) || 0);
  };

  FB.rulerCashGiftOpinion = function () {
    const value = FBDATA.balance.rulerCashGiftOpinion;
    return value === undefined ? 15 : value;
  };

  FB.rulerGiftStatus = function (state, rid) {
    const realm = state.realms && state.realms[rid];
    const cost = realm ? FB.rulerCashGiftCost(state, rid) : 0;
    const days = realm && FB.rulerGiftDaysRemainingSnapshot
      ? FB.rulerGiftDaysRemainingSnapshot(state, rid) : 0;
    const delivery = realm && FB.giftDeliveryPreview
      ? FB.giftDeliveryPreview(state, 'ruler', rid, {
        readOnly:true
      }) : null;
    const status = {
      ready:false,
      realmId:rid,
      cost:cost,
      standing:FB.rulerCashGiftOpinion(),
      cooldownDays:FB.socialGiftCooldownDays
        ? FB.socialGiftCooldownDays() : 90,
      daysRemaining:days,
      delivery:delivery,
      reason:''
    };
    if (!realm || !realm.alive || !realm.ruler || rid === 'player') {
      status.reason = FB.T('That ruler cannot receive a gift.');
    } else if (delivery && delivery.pending) {
      status.reason = FB.T(
        'A gift courier is already traveling for this ruler.');
    } else if (days) {
      status.reason = FB.T('Ready in {days} days.', { days:days });
    } else if (delivery && delivery.foreign && !delivery.eligible) {
      status.reason = delivery.reason;
    } else if (state.player.gold < cost) {
      status.reason = FB.T(
        'Rank price: {money:cost}; you have {money:current}.', {
          cost:cost,
          current:Math.floor(state.player.gold)
        });
    } else {
      status.ready = true;
    }
    return status;
  };

  FB.giveRulerCashGift = function (state, rid) {
    const p = state.player;
    const r = rid && state.realms[rid];
    const status = FB.rulerGiftStatus(state, rid);
    const cost = status.cost;
    if (!r || !status.ready) return false;
    const boost = FB.rulerCashGiftOpinion();
    const delivery = FB.giftDeliveryPreview &&
      FB.giftDeliveryPreview(state, 'ruler', rid);
    if (delivery && delivery.foreign) {
      return FB.dispatchGiftDelivery(state, {
        recipientKind:'ruler',
        recipientId:rid,
        giftKind:'cash',
        amount:cost,
        effect:boost
      });
    }
    p.gold -= cost;
    const standing = FB.adjustStanding(state, { kind:'realm', id:rid },
      boost, 'gift:cash');
    if (FB.noteRulerGift) FB.noteRulerGift(state, rid);
    if (FB.rulerGiftUsesFavor(state, rid)) {
      FB.news(state, FB.msg('news.realm.cash_gift_favor',
        '🎁 You offer {money:gold} to {ruler} of {realm}. (Standing {favor})', {
          gold:cost,
          ruler:r.ruler.name,
          realm:r.name,
          favor:Math.round(standing)
        }));
    } else {
      FB.news(state, FB.msg('news.realm.cash_gift_opinion',
        '🎁 You offer {money:gold} to {ruler} of {realm}. (Standing {opinion})', {
          gold:cost,
          ruler:r.ruler.name,
          realm:r.name,
          opinion:Math.round(standing)
        }));
    }
    return true;
  };

  FB.payHomage = function (state, rid) {
    const p = state.player;
    const r = state.realms[rid];
    if (!r || !r.alive) return;
    const m = state.chars[p.charId];
    FB.adjustStanding(state, { kind:'realm', id:rid },
      FBDATA.balance.homageOpinion + Math.floor(FB.skillOf(m, 'dip') / 2),
      'deed:homage');
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
    FB.changePlayerLiege(state, rid, 'deed:swear_fealty');
    if (!state.realms.player || !state.realms.player.alive) FB.foundPlayerRealm(state);
    state.realms.player.liege = rid;
    state.realms.player.war = null;
    FB.invalidateRealmCache();
    for (const pid of FB.realmTerritory(state, 'player')) state.owner[pid] = newTop;
    FB.adjustStanding(state, { kind:'realm', id:rid }, 20,
      'deed:swear_fealty');
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
    if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(state);
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
    const favors = p.vassalLevyFavors;
    if (!favors || typeof favors !== 'object' ||
        Array.isArray(favors)) return null;
    const until = favors[rid];
    const r = state.realms[rid];
    if (!until || until <= state.turn || !r || !r.alive || r.liege !== 'player') {
      return null;
    }
    return { rid:rid, until:until };
  };

  FB.vassalLevyRate = function (state, rid) {
    return (FBDATA.balance.vassalLevyRate || 0) +
      (FB.vassalLevyFavor(state, rid) ? (FBDATA.balance.vassalLevyFavorRate || 0.05) : 0);
  };

  /* One named vassal's exact contribution to the authoritative host ledger.
     playerCompositionBreakdown and Governance both consume this adapter. */
  FB.vassalLevyContribution = function (state, rid) {
    const realm = state.realms[rid];
    if (!realm || !realm.alive || realm.liege !== 'player') return 0;
    const B = FBDATA.balance;
    const rate = FB.vassalLevyRate(state, rid);
    let amount = 0;
    for (const pid of FB.realmHeldCounties(state, rid)) {
      const modifier = FB.modBonus
        ? Math.max(0, 1 + FB.modBonus(state, 'levy', pid)) : 1;
      amount += (state.dev[pid] || 1) * B.levyPerDev * modifier * rate;
    }
    return amount;
  };

  FB.vassalLevyFavorStatus = function (state, rid) {
    const realm = state.realms[rid];
    if (!realm || !realm.alive || realm.liege !== 'player') {
      return {
        ready:false,
        reason:FB.T('This ruler is not your direct vassal.')
      };
    }
    const active = FB.vassalLevyFavor(state, rid);
    if (active) {
      return {
        ready:false,
        reason:FB.T('The exceptional levy is already promised.'),
        until:active.until
      };
    }
    const value = FB.standingOf(state, { kind:'realm', id:rid });
    if (value < 40) {
      return {
        ready:false,
        reason:FB.T('Requires 40 Standing; currently {standing}.', {
          standing:Math.round(value)
        })
      };
    }
    return { ready:true, reason:'', until:null };
  };

  FB.canCallVassalLevyFavor = function (state, rid) {
    return FB.vassalLevyFavorStatus(state, rid).ready;
  };

  FB.callVassalLevyFavor = function (state, rid) {
    if (!FB.canCallVassalLevyFavor(state, rid)) return false;
    const r = state.realms[rid];
    const days = FBDATA.balance.vassalLevyFavorDays || 360;
    if (!state.player.vassalLevyFavors ||
        typeof state.player.vassalLevyFavors !== 'object' ||
        Array.isArray(state.player.vassalLevyFavors)) {
      state.player.vassalLevyFavors = {};
    }
    state.player.vassalLevyFavors[rid] = state.turn + days;
    FB.adjustStanding(state, { kind:'realm', id:rid }, -15,
      'deed:exceptional_levy');
    FB.news(state, FB.msg('news.realm.vassal_levy_favor',
      '🛡 {realm} promises an exceptional levy for one year; Standing falls by 15.',
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
    let revivedCourt = false;
    if (state.realms[vid]) {
      state.realms[vid].alive = true;
      state.realms[vid].liege = 'player';
      revivedCourt = true;
    } else {
      FB.makeVassalRealm(state, { id: vid, name: 'County of ' + pr.name, capital: pid, rank: 1, liege: 'player', culture: pr.culture });
    }
    state.holder[pid] = vid;
    state.owner[pid] = FB.playerRealmId(state) || 'player';
    /* Repair after the county is attached, so an heir who is the protagonist
       can absorb the revived demesne through ordinary succession. */
    if (revivedCourt && FB.ensureRealmCourt) FB.ensureRealmCourt(state, vid);
    else if (revivedCourt && FB.rebuildRulerIndex) FB.rebuildRulerIndex(state);
    FB.adjustStanding(state, { kind:'realm', id:vid }, 40,
      'deed:grant_county');
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
    let revivedCourt = false;
    if (state.realms[vid]) {
      state.realms[vid].alive = true;
      state.realms[vid].liege = 'player';
      state.realms[vid].capital = seat;
      revivedCourt = true;
    } else {
      FB.makeVassalRealm(state, { id: vid, name: 'Duchy of ' + dname, capital: seat, rank: 2, liege: 'player', culture: (FB.world.byId[seat] || {}).culture });
    }
    for (const pid of cs) {
      p.provs.splice(p.provs.indexOf(pid), 1);
      state.holder[pid] = vid;
      state.owner[pid] = FB.playerRealmId(state) || 'player';
    }
    /* Keep revival identical for retained and compacted dead ruler records:
       the successor is eagerly loaded before the grant returns. */
    if (revivedCourt && FB.ensureRealmCourt) FB.ensureRealmCourt(state, vid);
    else if (revivedCourt && FB.rebuildRulerIndex) FB.rebuildRulerIndex(state);
    FB.adjustStanding(state, { kind:'realm', id:vid }, 40,
      'deed:grant_duchy');
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
      FB.adjustStanding(state, { kind:'realm', id:vid }, -15,
        'deed:demand_taxes');
      if (FB.standingOf(state, { kind:'realm', id:vid }) <= -50) {
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
      if (FB.noteTraitProgress) FB.noteTraitProgress(state, 'rent_shrewd', 1);
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

  function foreignPolicyRead(state) {
    const policy = state && state.player && state.player.foreignPolicy;
    return policy && typeof policy === 'object' && !Array.isArray(policy)
      ? policy : {};
  }

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
    const policy = foreignPolicyRead(state);
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
    return foreignPolicyRead(state)[rid];
  };

  FB.foreignPolicyTargetStatus = function (state, rid) {
    const capacity = FB.politicalAttentionCapacity(state);
    const assignments = FB.foreignPolicyAssignments(state);
    const stance = FB.foreignPolicyStance(state, rid);
    const status = {
      relevant:false,
      ready:false,
      realmId:rid,
      capacity:capacity,
      used:assignments.length,
      stance:stance,
      amount:FB.foreignPolicyAmount(state),
      reason:''
    };
    if (!capacity) {
      status.reason = FB.T(
        'Political attention requires an independent county or greater realm.');
      return status;
    }
    if (!FB.isForeignPolicyTarget(state, rid)) {
      status.reason = FB.T(
        'This is not a neighboring sovereign court within political reach.');
      return status;
    }
    status.relevant = true;
    if (!stance && assignments.length >= capacity) {
      status.reason = FB.T(
        'All {capacity} political-attention assignments are in use. Set another court to Neutral first.', {
          capacity:capacity
        });
      return status;
    }
    status.ready = true;
    return status;
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
    const c = state.chars[state.player.charId];
    const diplomacy = FB.skillSnapshot
      ? FB.skillSnapshot(state, c, 'dip') : FB.skillOf(c, 'dip');
    return B.foreignPolicyBase + Math.min(B.foreignPolicyDipCap,
      diplomacy / 20);
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
      FB.adjustStanding(state, { kind:'realm', id:rid },
        policy[rid] * amount, 'foreign_policy');
    }
  };

  function diplomaticRealm(state, ctx) {
    const rid = ctx && (ctx.realmId || ctx.rid);
    const realm = rid && state.realms[rid];
    return realm && realm.alive && !realm.liege && rid !== 'player'
      ? realm : null;
  }

  function diplomaticContext(state, rid, extra) {
    const out = { realmId:rid };
    extra = extra || {};
    for (const key in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, key)) out[key] = extra[key];
    }
    return out;
  }

  /* Reusable random-event context selectors. They return only stable,
     JSON-safe semantic ids; the event picker chooses one after choosing the
     authored story, so eligibility checks never consume RNG. */
  FB.eventContextOptions = function (state, selector) {
    const out = [];
    if (!FB.isPlayerSovereign(state)) return out;
    if (selector === 'foreign_policy_improve' ||
        selector === 'foreign_policy_provoke') {
      const stance = selector === 'foreign_policy_improve' ? 1 : -1;
      for (const rid of FB.foreignPolicyAssignments(state)) {
        if (FB.foreignPolicyStance(state, rid) !== stance) continue;
        if (state.player.war && state.player.war.enemy === rid) continue;
        out.push(diplomaticContext(state, rid));
      }
    } else if (selector === 'active_pact') {
      for (const rid in (state.pacts || {})) {
        if (state.pacts[rid] <= state.turn || !diplomaticRealm(state, {
          realmId:rid
        })) continue;
        out.push(diplomaticContext(state, rid, {
          pactEndTurn:state.pacts[rid]
        }));
      }
    } else if (selector === 'active_alliance') {
      const rid = FB.alliedRealm ? FB.alliedRealm(state, 'player') : null;
      if (rid && diplomaticRealm(state, { realmId:rid })) {
        out.push(diplomaticContext(state, rid, {
          rulerGeneration:FB.realmRulerGeneration(state, rid)
        }));
      }
    }
    out.sort(function (a, b) {
      return a.realmId < b.realmId ? -1 : (a.realmId > b.realmId ? 1 : 0);
    });
    return out;
  };

  function activePactWith(state, rid) {
    return !!(rid && state.pacts && state.pacts[rid] > state.turn);
  }

  FB.fns.diplomacy_pact_active = function (state, ctx) {
    const realm = diplomaticRealm(state, ctx);
    return !!(FB.isPlayerSovereign(state) && realm &&
      activePactWith(state, realm.id));
  };

  FB.fns.diplomacy_alliance_active = function (state, ctx) {
    const realm = diplomaticRealm(state, ctx);
    return !!(FB.isPlayerSovereign(state) && realm &&
      FB.areAllied(state, 'player', realm.id));
  };

  FB.fns.diplomacy_can_offer_pact = function (state, ctx) {
    const realm = diplomaticRealm(state, ctx);
    if (!FB.isPlayerSovereign(state) || !realm ||
        activePactWith(state, realm.id) ||
        FB.areAllied(state, 'player', realm.id)) return false;
    if (state.player.war && state.player.war.enemy === realm.id) return false;
    return FB.realmsAdjacent(state, 'player', realm.id);
  };

  FB.fns.diplomacy_can_offer_alliance = function (state, ctx) {
    const realm = diplomaticRealm(state, ctx);
    return !!(realm && FB.allianceOfferTargets(state).indexOf(realm.id) >= 0);
  };

  FB.fns.diplomacy_make_pact = function (state, ctx) {
    if (!FB.fns.diplomacy_can_offer_pact(state, ctx)) return false;
    const realm = diplomaticRealm(state, ctx);
    state.pacts = state.pacts || {};
    state.pacts[realm.id] = state.turn + 8 * 90;
    FB.news(state, FB.msg('news.diplomacy.pact_made',
      '🕊 {realm} swears a two-year pact of peace.', { realm:realm.name }));
    return true;
  };

  FB.fns.diplomacy_extend_pact = function (state, ctx) {
    if (!FB.fns.diplomacy_pact_active(state, ctx)) return false;
    const realm = diplomaticRealm(state, ctx);
    state.pacts[realm.id] += 4 * 90;
    FB.news(state, FB.msg('news.diplomacy.pact_extended',
      '🕊 The pact with {realm} is renewed for another year.',
      { realm:realm.name }));
    return true;
  };

  FB.fns.diplomacy_end_pact = function (state, ctx) {
    if (!FB.fns.diplomacy_pact_active(state, ctx)) return false;
    const realm = diplomaticRealm(state, ctx);
    delete state.pacts[realm.id];
    FB.news(state, FB.msg('news.diplomacy.pact_ended',
      '🕊 The pact with {realm} is allowed to lapse.', { realm:realm.name }));
    return true;
  };

  FB.fns.diplomacy_form_alliance = function (state, ctx) {
    if (!FB.fns.diplomacy_can_offer_alliance(state, ctx)) return false;
    const realm = diplomaticRealm(state, ctx);
    if (!FB.formAlliance(state, 'player', realm.id, 'diplomatic_event')) {
      return false;
    }
    FB.news(state, FB.msg('news.diplomacy.alliance_formed',
      '🤝 Your crown and {realm} enter a defensive alliance.',
      { realm:realm.name }));
    return true;
  };

  FB.fns.diplomacy_break_alliance = function (state, ctx) {
    if (!FB.fns.diplomacy_alliance_active(state, ctx)) return false;
    const realm = diplomaticRealm(state, ctx);
    FB.breakAlliance(state, 'player', realm.id);
    FB.news(state, FB.msg('news.diplomacy.alliance_ended',
      '🤝 The defensive alliance with {realm} is ended.',
      { realm:realm.name }));
    return true;
  };

  FB.fns.diplomacy_succession_valid = function (state, ctx) {
    const realm = diplomaticRealm(state, ctx);
    return !!(FB.isPlayerSovereign(state) && realm && ctx &&
      ctx.rulerGeneration ===
      FB.realmRulerGeneration(state, realm.id));
  };

  FB.fns.diplomacy_succession_pact = function (state, ctx) {
    if (!FB.fns.diplomacy_succession_valid(state, ctx)) return false;
    if (FB.fns.diplomacy_pact_active(state, ctx)) {
      return FB.fns.diplomacy_extend_pact(state, ctx);
    }
    return FB.fns.diplomacy_make_pact(state, ctx);
  };

  FB.noteDiplomaticSuccession = function (state, rid, info) {
    const realm = diplomaticRealm(state, { realmId:rid });
    if (!realm || !FB.isPlayerSovereign(state)) return false;
    info = info || {};
    const related = info.formerAlliance || activePactWith(state, rid) ||
      FB.realmsAdjacent(state, 'player', rid) ||
      FB.foreignPolicyStance(state, rid);
    const successionChance = FBDATA.balance &&
      FBDATA.balance.diplomacySuccessionChance !== undefined
      ? FBDATA.balance.diplomacySuccessionChance : 0.35;
    if (!related || !FB.chance(successionChance)) return false;
    const compact = !!(info.formerAlliance || activePactWith(state, rid));
    FB.queueEvent(state, compact
      ? 'diplomacy_succession_compact' : 'diplomacy_succession_embassy', {
      realmId:rid,
      rulerGeneration:FB.realmRulerGeneration(state, rid),
      formerAlliance:info.formerAlliance ? 'yes' : 'no',
      pact:activePactWith(state, rid) ? 'yes' : 'no'
    });
    return true;
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

  FB.envoyStatus = function (state, rid) {
    const realm = state.realms && state.realms[rid];
    const status = {
      relevant:false,
      ready:false,
      realmId:rid,
      cost:10,
      durationDays:8 * 90,
      chance:0,
      reason:''
    };
    if (!FB.isPlayerSovereign(state)) {
      status.reason = FB.T('Only a sovereign may offer a foreign peace pact.');
      return status;
    }
    if (!realm || !realm.alive || rid === 'player' || realm.liege) {
      status.reason = FB.T('A peace envoy must address a living sovereign court.');
      return status;
    }
    if (!FB.realmsAdjacent(state, 'player', rid)) {
      status.reason = FB.T('Only a neighboring sovereign court lies within envoy reach.');
      return status;
    }
    status.relevant = true;
    status.chance = FB.envoyChance(state, rid);
    if (state.player.war && state.player.war.enemy === rid) {
      status.reason = FB.T('You are already at war with this realm.');
    } else if (state.pacts && state.pacts[rid] > state.turn) {
      status.reason = FB.T('A peace pact with this realm is already active.');
    } else if (FB.areAlliedSnapshot(state, 'player', rid)) {
      status.reason = FB.T('Your defensive alliance already forbids mutual attack.');
    } else if (state.player.gold < status.cost) {
      status.reason = FB.T(
        'An envoy requires {money:cost} in gifts; you have {money:current}.', {
          cost:status.cost,
          current:Math.floor(state.player.gold)
        });
    } else {
      status.ready = true;
    }
    return status;
  };

  FB.envoyChance = function (state, rid) {
    const p = state.player, m = state.chars[p.charId], B = FBDATA.balance;
    const diplomacy = FB.skillSnapshot
      ? FB.skillSnapshot(state, m, 'dip') : FB.skillOf(m, 'dip');
    let chance = 0.35 + diplomacy * 0.035 + p.prestige / 600 +
      FB.standingOf(state, { kind:'realm', id:rid }) /
        B.foreignOpinionEnvoyDivisor;
    if (FB.playerExcommunicated && FB.playerExcommunicated(state) &&
        FB.realmReligionId(state, rid) === 'catholic') chance -= 0.2;
    return FB.clamp(chance, 0.1, 0.9);
  };

  FB.sendEnvoy = function (state, rid) {
    const p = state.player;
    const r = state.realms[rid];
    const status = FB.envoyStatus(state, rid);
    if (!r || !status.ready) return false;
    p.gold -= status.cost;
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
    return true;
  };

  FB.allianceOfferTargets = function (state) {
    const out = [];
    const mine = state.realms.player;
    if (!FB.isPlayerSovereign(state) || !mine || mine.rank < 3 || FB.allianceOf(state, 'player')) return out;
    for (const rid in state.realms) {
      const r = state.realms[rid];
      if (rid === 'player' || !r.alive || r.liege || r.rank < 3 || r.war) continue;
      if (FB.allianceOf(state, rid) ||
          FB.standingOf(state, { kind:'realm', id:rid }) < 60) continue;
      if (!FB.realmsAdjacent(state, 'player', rid)) continue;
      out.push(rid);
    }
    return out;
  };

  FB.allianceOfferStatus = function (state, rid) {
    const mine = state.realms && state.realms.player;
    const realm = state.realms && state.realms[rid];
    const standing = realm
      ? FB.standingOf(state, { kind:'realm', id:rid }) : 0;
    const status = {
      relevant:false,
      ready:false,
      realmId:rid,
      cost:25,
      standing:standing,
      standingRequired:60,
      chance:0,
      reason:''
    };
    if (!FB.isPlayerSovereign(state) || !mine || mine.rank < 3) {
      status.reason = FB.T(
        'Only an independent king or emperor may offer a defensive alliance.');
      return status;
    }
    if (!realm || !realm.alive || rid === 'player' || realm.liege ||
        realm.rank < 3) {
      status.reason = FB.T(
        'A defensive alliance requires another sovereign king or emperor.');
      return status;
    }
    if (!FB.realmsAdjacent(state, 'player', rid)) {
      status.reason = FB.T(
        'A defensive alliance may be offered only to an adjacent sovereign.');
      return status;
    }
    status.relevant = true;
    status.chance = FB.envoyChance(state, rid);
    if (FB.allianceSnapshot(state, 'player')) {
      status.reason = FB.T('Your realm already has one defensive ally.');
    } else if (FB.allianceSnapshot(state, rid)) {
      status.reason = FB.T('This realm already has one defensive ally.');
    } else if (realm.war || FB.isRealmAtWar(state, rid)) {
      status.reason = FB.T('This realm is already at war.');
    } else if (standing < status.standingRequired) {
      status.reason = FB.T(
        'Requires {needed} Standing; currently {current}.', {
          needed:status.standingRequired,
          current:Math.round(standing)
        });
    } else if (state.player.gold < status.cost) {
      status.reason = FB.T(
        'An alliance envoy requires {money:cost}; you have {money:current}.', {
          cost:status.cost,
          current:Math.floor(state.player.gold)
        });
    } else {
      status.ready = true;
    }
    return status;
  };

  FB.offerAlliance = function (state, rid) {
    const status = FB.allianceOfferStatus(state, rid);
    if (!status.ready) return false;
    state.player.gold -= status.cost;
    const r = state.realms[rid];
    if (FB.chance(FB.envoyChance(state, rid)) && FB.formAlliance(state, 'player', rid, 'envoy')) {
      FB.news(state, FB.msg('news.action.alliance_success',
        '🤝 {realm} accepts your envoy: your crowns will defend one another until either ruler dies.',
        { realm: r.name }));
      return true;
    }
    FB.news(state, FB.msg('news.action.alliance_failure',
      '🕊 {realm} receives the gifts but refuses the defensive compact.', { realm: r.name }));
    /* The action was valid and its envoy/gifts were spent even though the
       diplomatic proposal failed. Callers use this result to distinguish an
       executed attempt from a stale or blocked click. */
    return true;
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

  FB.manorPlotPurchasePlan = function (state, settlement) {
    const p = state.player;
    settlement = Number(settlement);
    if (p.tier !== 1 || settlement < 0 ||
        settlement !== Math.floor(settlement)) return null;
    const need = FBDATA.balance.manorPlotRequirement || 5;
    const max = FBDATA.balance.landPlotMaxSettlement || need;
    const settlements = FB.settlementsOf(state, p.provinceId);
    if (max < need || !settlements[settlement]) return null;
    const count = FB.landCountAt(state, p.provinceId, settlement);
    const plots = need - count;
    if (plots <= 1) return null;
    const totalCost = FB.landPlotCost() * plots;
    return {
      provinceId:p.provinceId,
      settlement:settlement,
      settlementName:settlements[settlement].name,
      currentCount:count,
      plots:plots,
      resultingCount:count + plots,
      manorRequirement:need,
      totalCost:totalCost,
      currentYield:FB.landGroupYield(count),
      resultingYield:FB.landGroupYield(count + plots),
      moneyAfter:p.gold - totalCost,
      affordable:p.gold >= totalCost
    };
  };

  FB.buyRemainingManorPlots = function (state, settlement, expectedCount) {
    const plan = FB.manorPlotPurchasePlan(state, settlement);
    if (!plan || !plan.affordable ||
        (expectedCount !== undefined && plan.currentCount !== expectedCount)) {
      return false;
    }
    state.player.gold -= plan.totalCost;
    const plots = FB.landPlots(state);
    for (let i = 0; i < plan.plots; i++) {
      plots.push({
        provinceId:plan.provinceId, settlement:plan.settlement
      });
    }
    FB.news(state, FB.msg('news.action.land_batch_bought',
      '🌾 The household buys {plots} more plots at {settlement}, completing a manor-sized holding.',
      { plots:plan.plots, settlement:plan.settlementName }));
    return true;
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
    const list = state.buildings && state.buildings[pid];
    if (!list) return [];
    /* Read paths must not change the save. Old bare ids still project into the
       head settlement; a later building write persists that normalization. */
    let legacy = false;
    for (let i = 0; i < list.length; i++) {
      if (typeof list[i] === 'string') {
        legacy = true;
        break;
      }
    }
    if (!legacy) return list;
    return list.map(function (entry) {
      return typeof entry === 'string' ? { s: 0, id: entry } : entry;
    });
  };

  function builtInForWrite(state, pid) {
    state.buildings = state.buildings || {};
    const list = state.buildings[pid] = state.buildings[pid] || [];
    for (let i = 0; i < list.length; i++) {
      if (typeof list[i] === 'string') list[i] = { s: 0, id: list[i] };
    }
    return list;
  }

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
      Math.max(0, FB.techCostFactor(state, 'build') -
        (FB.councilBonus ? FB.councilBonus(state, 'build') : 0));
    c *= Math.max(0, 1 +
      (FB.modBonus ? FB.modBonus(state, 'buildingCost', pid) : 0));
    if (state.player.flags.mason_visit) c *= 0.75;
    return Math.round(c);
  };

  FB.canBuildAt = function (state, pid, idx, id) {
    const def = FBDATA.buildings[id];
    const pr = FB.world.byId[pid];
    if (!def || FB.demesne(state).indexOf(pid) < 0 || !FB.settlementsOf(state, pid)[idx]) return false;
    if (def.requiresTech && !FB.techRequirementMet(state, def.requiresTech)) return false;
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
    const cost = FB.buildCost(state, pid, id);
    if (state.player.gold < cost) return false;
    const done = builtInForWrite(state, pid);
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
    const done = FB.builtIn(state, pid);
    for (let i = 0; i < done.length; i++) {
      if (done[i].id === id && done[i].s === idx && !done[i].ruined) {
        builtInForWrite(state, pid)[i].ruined = true;
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

  function fabricatedClaimRecord(state, repair) {
    const p = state.player;
    let claim = p.fabricatedClaim;
    if (typeof claim === 'string') {
      claim = { pid:claim };
      if (repair) p.fabricatedClaim = claim;
    }
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
      if (repair) p.fabricatedClaim = null;
      return null;
    }
    return claim;
  }

  FB.fabricatedClaimOf = function (state) {
    return fabricatedClaimRecord(state, true);
  };

  /* The one religious succession war: a sovereign Sunni king or emperor may
     contest a sitting Caliph. The stake is the office, not land, so no shared
     border is required — victory transfers the Caliphate, the loser keeps his
     realm. Returns a warCauses-shaped record or null. */
  FB.caliphateWarClaimantEligible = function (state) {
    const p = state.player;
    const c = state.chars[p.charId];
    return !!(c && !c.dead && c.religion === 'sunni' && p.tier >= 6 &&
      FB.isPlayerSovereign(state));
  };

  FB.caliphateWarCause = function (state, readOnly) {
    if (!adult(state) || !FB.caliphateWarClaimantEligible(state)) return null;
    const head = readOnly && FB.religiousHeadSnapshot
      ? FB.religiousHeadSnapshot(state, 'sunni')
      : FB.religiousHeadOf(state, 'sunni');
    if (!head) return null;
    const enemy = FB.topRealm(state, head.id);
    if (!enemy || enemy === 'player' || enemy === FB.playerRealmId(state)) return null;
    const enemyRealm = state.realms[enemy];
    if (!enemyRealm || !enemyRealm.alive || !enemyRealm.capital) return null;
    return { type: 'caliphate', enemy: enemy, target: enemyRealm.capital };
  };

  function diplomacyBlocksWar(state, enemy, readOnly) {
    if (FB.isRealmAtWar(state, enemy)) return 'war';
    if (state.pacts && state.pacts[enemy] > state.turn) return 'pact';
    if ((readOnly && FB.areAlliedSnapshot
      ? FB.areAlliedSnapshot(state, 'player', enemy)
      : FB.areAllied(state, 'player', enemy))) return 'alliance';
    return null;
  }

  function annotateReligiousWarCause(state, cause, readOnly) {
    const c = state.chars[state.player.charId];
    if (!c || !cause || !FB.sameFaithHeadWarPolicy) return cause;
    cause.sameFaithHeadWar = FB.sameFaithHeadWarPolicy(
      state, c.religion, cause.enemy, cause.target, readOnly);
    cause.sacrilegious = cause.sameFaithHeadWar === 'sacrilege';
    return cause;
  }

  /* Semantic causes are the authoritative declaration surface. Passing true
     keeps diplomatically blocked causes so the UI can explain the exact lock. */
  FB.warCauses = function (state, includeBlocked, readOnly) {
    const p = state.player, out = [], seen = {};
    if (FB.greatHolyWarCamp && FB.greatHolyWarCamp(state, 'player')) return out;
    const playerRealm = FB.playerRealmId(state);
    if (playerRealm && FB.isRealmAtWar(state, playerRealm)) return out;
    const me = state.chars[p.charId];
    const restoration = me && me.restorationRight;
    if (restoration) {
      const rr = state.realms[restoration.realmId];
      if (!rr || !rr.alive || !rr.capital) {
        if (!readOnly) delete me.restorationRight;
      } else {
        const blocked = diplomacyBlocksWar(state, rr.id, readOnly);
        if (!blocked || includeBlocked) {
          out.push(annotateReligiousWarCause(state, {
            type: 'restoration',
            target: rr.capital,
            enemy: rr.id,
            titleName: restoration.titleName || rr.name,
            blocked: blocked
          }, readOnly));
        }
      }
    }
    const caliphate = FB.caliphateWarCause(state, readOnly);
    if (caliphate) {
      const blocked = diplomacyBlocksWar(state, caliphate.enemy, readOnly);
      if (!blocked || includeBlocked) {
        caliphate.blocked = blocked;
        out.push(annotateReligiousWarCause(state, caliphate, readOnly));
      }
    }
    const mine = playerBorderLands(state);
    if (!mine.length || p.tier < 4) return out;
    const mySovereign = FB.playerRealmId(state);
    const titles = heldTitleSets(state);
    const claim = fabricatedClaimRecord(state, !readOnly);
    for (const pid of mine) {
      for (const nb in (FB.world.adj[pid] || {})) {
        if (seen[nb]) continue;
        const pr = FB.world.byId[nb], enemy = state.owner[nb];
        if (!pr || pr.wasteland || !enemy || enemy === mySovereign || enemy === 'player') continue;
        let cause = deJureCause(state, nb, titles);
        if (!cause && claim && claim.pid === nb) cause = { type: 'fabricated', target: nb };
        if (!cause) continue;
        cause.enemy = enemy;
        cause.blocked = diplomacyBlocksWar(state, enemy, readOnly);
        annotateReligiousWarCause(state, cause, readOnly);
        seen[nb] = 1;
        if (!cause.blocked || includeBlocked) out.push(cause);
      }
    }
    return out;
  };

  FB.realmWarCauses = function (state, rid, includeBlocked) {
    return FB.warCauses(state, includeBlocked, true).filter(function (cause) {
      return cause.enemy === rid ||
        (!cause.enemy && state.owner[cause.target] === rid);
    });
  };

  FB.warCauseBlockedReason = function (cause) {
    if (!cause || !cause.blocked) return '';
    if (cause.blocked === 'war') return FB.T('At war with another realm.');
    if (cause.blocked === 'alliance') {
      return FB.T('Your defensive alliance forbids an attack on this realm.');
    }
    if (cause.blocked === 'pact') {
      return FB.T('A sworn peace pact protects this realm.');
    }
    return FB.T('This cause cannot be pressed now.');
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

  function plotRealmContext(state, id, ctx) {
    if (!FB.activePlotContext(state, id, ctx)) return null;
    const rid = ctx && ctx.realmId;
    const realm = rid && state.realms[rid];
    return realm && realm.alive ? realm : null;
  }

  FB.fns.plot_correspondence_steal = function (state, ctx) {
    const realm = plotRealmContext(state, 'diplomatic_correspondence', ctx);
    if (!realm) {
      if (state.player.plot &&
          state.player.plot.id === 'diplomatic_correspondence') FB.fns.plot_end(state);
      return false;
    }
    FB.adjustStanding(state, { kind:'realm', id:realm.id }, -12,
      'plot:correspondence_stolen');
    state.player.prestige += 7;
    const war = realm.war;
    FB.news(state, war
      ? FB.msg('news.plot.correspondence_war',
        '✉ Stolen letters show {realm} committed to war with {enemy}.', {
          realm:realm.name,
          enemy:state.realms[war.enemy] ? state.realms[war.enemy].name :
            FB.messageParam(FB.message('fx.param.the_enemy', {}))
        })
      : FB.msg('news.plot.correspondence_temper', {
        forms:{
          select:'value', param:'temper', cases:{
            bellicose:'✉ Stolen letters expose {realm}’s court as dangerously bellicose; no war order is presently sealed.',
            cautious:'✉ Stolen letters expose {realm}’s court as cautious; no war order is presently sealed.',
            other:'✉ Stolen letters expose {realm}’s court as watchful; no war order is presently sealed.'
          }
        }
      }, {
        realm:realm.name,
        temper:realm.aggression >= 0.65 ? 'bellicose' :
          (realm.aggression <= 0.25 ? 'cautious' : 'watchful')
      }));
    FB.fns.plot_end(state);
    return true;
  };

  FB.fns.plot_correspondence_preserve = function (state, ctx) {
    const realm = plotRealmContext(state, 'diplomatic_correspondence', ctx);
    if (!realm) {
      if (state.player.plot &&
          state.player.plot.id === 'diplomatic_correspondence') FB.fns.plot_end(state);
      return false;
    }
    FB.adjustStanding(state, { kind:'realm', id:realm.id }, 10,
      'plot:correspondence_preserved');
    if (state.pacts && state.pacts[realm.id] > state.turn) {
      state.pacts[realm.id] += 90;
    }
    FB.fns.plot_end(state);
    return true;
  };

  FB.fns.plot_correspondence_provoke = function (state, ctx) {
    const realm = plotRealmContext(state, 'diplomatic_correspondence', ctx);
    if (!realm) {
      if (state.player.plot &&
          state.player.plot.id === 'diplomatic_correspondence') FB.fns.plot_end(state);
      return false;
    }
    FB.adjustStanding(state, { kind:'realm', id:realm.id }, -18,
      'plot:correspondence_forged');
    FB.setForeignPolicy(state, realm.id, -1);
    state.player.prestige += 5;
    FB.fns.plot_end(state);
    return true;
  };

  FB.fns.plot_correspondence_failure = function (state, ctx) {
    const realm = plotRealmContext(state, 'diplomatic_correspondence', ctx);
    if (realm) {
      FB.adjustStanding(state, { kind:'realm', id:realm.id }, -15,
        'plot:correspondence_exposed');
      if (state.pacts && state.pacts[realm.id] > state.turn + 90) {
        state.pacts[realm.id] -= 90;
      }
    }
    FB.fns.plot_end(state);
    return !!realm;
  };

  function politicalRival(state, ctx) {
    if (!FB.activePlotContext(state, 'rival_claimant', ctx)) return null;
    const rival = ctx && state.chars[ctx.characterId];
    return rival && !rival.dead && state.roles.rival === rival.id ? rival : null;
  }

  FB.fns.plot_rival_discredit = function (state, ctx) {
    const rival = politicalRival(state, ctx);
    if (!rival) {
      if (state.player.plot && state.player.plot.id === 'rival_claimant') {
        FB.fns.plot_end(state);
      }
      return false;
    }
    let consequence = 'standing';
    if (rival.restorationRight) {
      delete rival.restorationRight;
      consequence = 'claim';
    } else if (FB.retainerRecord && FB.retainerRecord(state, rival.id)) {
      FB.removeRetainer(state, rival.id, 'dismissed');
      consequence = 'office';
    } else if (ctx.institution === 'council' && ctx.realmId &&
        state.council && state.council.seats && FB.councilDismiss) {
      for (const seatId in state.council.seats) {
        if (state.council.seats[seatId] === ctx.realmId) {
          FB.councilDismiss(state, seatId);
          consequence = 'council';
          break;
        }
      }
    }
    FB.adjustStanding(state, { kind:'character', id:rival.id }, -18,
      'plot:rival_discredited');
    FB.changeRivalHeat(state, 18);
    state.player.prestige += 8;
    FB.news(state, FB.msg('news.plot.rival_discredited', {
      forms:{
        select:'value', param:'consequence', cases:{
          claim:'🗡 Evidence ruins {rival}’s claim before it can be pressed.',
          office:'🗡 Evidence drives {rival} from household office.',
          council:'🗡 Evidence drives {rival} from the Council board.',
          standing:'🗡 Evidence publicly blackens {rival}’s political name.',
          other:'🗡 Evidence publicly blackens {rival}’s political name.'
        }
      }
    }, { rival:FB.fullName(rival), consequence:consequence }));
    FB.fns.plot_end(state);
    return true;
  };

  FB.fns.plot_rival_settlement = function (state, ctx) {
    const rival = politicalRival(state, ctx);
    if (!rival) {
      if (state.player.plot && state.player.plot.id === 'rival_claimant') {
        FB.fns.plot_end(state);
      }
      return false;
    }
    FB.adjustStanding(state, { kind:'character', id:rival.id }, 15,
      'plot:rival_settlement');
    FB.endRivalry(state, rival.id);
    state.player.prestige += 4;
    FB.fns.plot_end(state);
    return true;
  };

  FB.fns.plot_rival_dossier = function (state, ctx) {
    const rival = politicalRival(state, ctx);
    if (!rival) {
      if (state.player.plot && state.player.plot.id === 'rival_claimant') {
        FB.fns.plot_end(state);
      }
      return false;
    }
    FB.adjustStanding(state, { kind:'character', id:rival.id }, -8,
      'plot:rival_dossier');
    FB.changeRivalHeat(state, 25);
    state.player.prestige += 5;
    FB.gainSkill(state.chars[state.player.charId], 'int', 2);
    FB.fns.plot_end(state);
    return true;
  };

  FB.fns.plot_rival_failure = function (state, ctx) {
    const rival = politicalRival(state, ctx);
    if (rival) {
      FB.adjustStanding(state, { kind:'character', id:rival.id }, -20,
        'plot:rival_exposed');
      FB.changeRivalHeat(state, 25);
    }
    FB.fns.plot_end(state);
    return !!rival;
  };

  function discoveryPlotHandler(state, ctx, kind) {
    const id = ctx && ctx.plotId;
    const names = {
      feudal_obligation:{
        success:'plot_obligation_evidence', failure:'plot_obligation_failure'
      },
      guild_monopoly:{
        success:'plot_guild_expose', failure:'plot_guild_failure'
      },
      council_counter:{
        success:'plot_council_expose', failure:'plot_council_failure'
      },
      diplomatic_correspondence:{
        success:'plot_correspondence_steal', failure:'plot_correspondence_failure'
      },
      rival_claimant:{
        success:'plot_rival_discredit', failure:'plot_rival_failure'
      }
    };
    const name = names[id] && names[id][kind];
    if (!name || !FB.fns[name]) return false;
    FB.fns[name](state, ctx);
    return true;
  }

  FB.fns.plot_discovery_abandon = function (state, ctx) {
    const id = ctx && ctx.plotId;
    if (!state.player.plot || state.player.plot.id !== id) return false;
    const def = FBDATA.plots[id];
    if (!def || (def.target && !FB.plotTargetValid(state, def, ctx))) {
      FB.fns.plot_end(state);
      return false;
    }
    if (id === 'feudal_obligation' && ctx.realmId) {
      FB.adjustStanding(state, { kind:'realm', id:ctx.realmId }, -8,
        'plot:obligation_abandoned');
    } else if (id === 'guild_monopoly' && FB.fns.plot_guild_discovery) {
      FB.fns.plot_guild_discovery(state, ctx, false);
      return true;
    } else if (id === 'council_counter' && FB.fns.plot_council_discovery) {
      FB.fns.plot_council_discovery(state, ctx, false);
      return true;
    } else if (id === 'diplomatic_correspondence' && ctx.realmId) {
      FB.adjustStanding(state, { kind:'realm', id:ctx.realmId }, -8,
        'plot:correspondence_abandoned');
    } else if (id === 'rival_claimant') {
      const rival = state.chars[ctx.characterId];
      if (rival && !rival.dead && state.roles.rival === rival.id) {
        FB.adjustStanding(state, { kind:'character', id:rival.id }, -8,
          'plot:rival_abandoned');
        FB.changeRivalHeat(state, 12);
      }
    }
    FB.fns.plot_end(state);
    return true;
  };

  FB.fns.plot_discovery_contain = function (state, ctx) {
    const plot = state.player.plot;
    const def = plot && FBDATA.plots[plot.id];
    if (!plot || !def || plot.id !== (ctx && ctx.plotId) ||
        (def.target && !FB.plotTargetValid(state, def, ctx))) {
      if (plot) FB.fns.plot_end(state);
      return false;
    }
    plot.sprung = 0;
    plot.exposure = (plot.exposure || 0) + 1;
    plot.power = Math.max(0, plot.power - 4);
    return true;
  };

  FB.fns.plot_discovery_success = function (state, ctx) {
    if (ctx && ctx.plotId === 'fabricate_claim') FB.fns.fabricate_claim_success(state, ctx);
    else if (discoveryPlotHandler(state, ctx, 'success')) return;
    else {
      FB.applyEffects(state, { prestige: 6, skills: { int: 2 } }, ctx || {});
      FB.fns.plot_end(state);
    }
  };

  FB.fns.plot_discovery_failure = function (state, ctx) {
    if (ctx && ctx.plotId === 'fabricate_claim') FB.fns.fabricate_claim_failure(state, ctx);
    else if (discoveryPlotHandler(state, ctx, 'failure')) return;
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
    if (FB.playerBishopricOnly && FB.playerBishopricOnly(state)) return false;
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
    if (cause.type === 'caliphate') {
      const liveCaliphate = FB.caliphateWarCause(state);
      if (!liveCaliphate || liveCaliphate.enemy !== cause.enemy ||
          liveCaliphate.target !== cause.target) return false;
      cause = liveCaliphate;
    }
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

  FB.instantStatus = function (state, id) {
    let action = null;
    for (const candidate of FB.instants) {
      if (candidate.id === id) {
        action = candidate;
        break;
      }
    }
    if (!action) return {
      action:null, shown:false, can:false, reason:''
    };
    const shown = !!action.show(state);
    let can = shown, reason = '';
    if (shown && action.cd !== undefined) {
      const cooldowns = state.player.cooldowns || {};
      const last = cooldowns[action.id];
      if (last !== undefined && state.turn - last < action.cd) {
        can = false;
        reason = FB.T('Ready in {days} days.', {
          days:action.cd - (state.turn - last)
        });
      }
    }
    if (can && action.requiresTech &&
        !FB.techRequirementMet(state, action.requiresTech)) {
      can = false;
      reason = FB.T('A required national technology has not been completed.');
    }
    if (can && action.can) {
      const result = action.can(state);
      if (result !== true) {
        can = false;
        reason = result;
      }
    }
    return {
      action:action,
      shown:shown,
      can:can,
      reason:reason
    };
  };

  FB.listInstants = function (state) {
    const out = [];
    for (const a of FB.instants) {
      if (state.player.travel &&
        ['travel_turn_back', 'travel_marriage_residence',
          'travel_settle_here'].indexOf(a.id) < 0) continue;
      if (a.compatibilityAlias) continue;
      const status = FB.instantStatus(state, a.id);
      if (!status.shown) continue;
      out.push({ a:a, can:status.can, reason:status.reason });
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
    if (FB.playerBishopricOnly && FB.playerBishopricOnly(state)) {
      want = 'shepherd_diocese';
    }
    else if (p.tier >= 3) want = 'govern';
    else if (p.tier === 2) want = 'manage_manor';
    else if (p.profession === 'monk') want = 'copy_books';
    else if (p.profession === 'priest') want = 'serve_church';
    else {
      want = ({ farmer: p.tier === 0 ? 'toil' : 'work_land', craftsman: 'craft_work',
        merchant: 'trade_run', administration:'market',
        soldier: 'drill', noble: 'train_arms' })[p.profession];
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
      if (f.id === state.player.focus) {
        const mult = vocationalMultiplier(state, f);
        const before = {
          gold:state.player.gold,
          prestige:state.player.prestige,
          piety:state.player.piety
        };
        f.tick(state);
        if (mult > 1) {
          for (const key of ['gold', 'prestige', 'piety']) {
            const gained = state.player[key] - before[key];
            if (gained > 0) state.player[key] += gained * (mult - 1);
          }
        }
        return;
      }
    }
  };

  FB.runInstant = function (state, id) {
    const status = FB.instantStatus(state, id);
    if (!status.shown || !status.can) return;
    const a = status.action;
    if (a) {
      if (a.cd !== undefined) {
        state.player.cooldowns = state.player.cooldowns || {};
        state.player.cooldowns[id] = state.turn;
      }
      a.run(state);
      if (a.noConsume) { if (FB.ui && FB.ui.refresh) FB.ui.refresh(); }
      else if (FB.game && FB.game.passDay) FB.game.passDay({ skipFocus: true });
    }
  };
})();
