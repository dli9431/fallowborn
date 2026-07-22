/* Fallowborn — player activity.
   FOCUSES run every day until changed (work, drill, prayer, courtship...).
   INSTANTS are one-shot deeds (poach, scheme, petitions...) that spend the day
   and may have day-cooldowns. Daily rates are tuned so a season (90 days) of a
   focus roughly equals one old seasonal deed. */
window.FB = window.FB || {};

(function () {
  'use strict';

  const D = 90; // days per season

  function me(state) { return state.chars[state.player.charId]; }
  function adult(state) { return FB.ageOf(me(state), state.date.year) >= 16; }
  function suitorReady(state) {
    return !!(state.player.flags.courting && FB.getRole(state, 'suitor'));
  }
  /* daily chance equivalent to a once-per-season probability */
  function dch(seasonalProb) { return FB.chance(seasonalProb / D); }
  function skillUp(state, key) {
    const m = me(state);
    if (!FB.gainSkill(m, key, 1)) return; // soft-capped: the point didn't land
    FB.news(state, '📈 Your ' + FB.SKILL_NAMES[key].toLowerCase() + ' improves (' + FB.skillOf(m, key) + ').');
  }

  /* ================= FOCUSES (daily) ================= */
  FB.focuses = [

  { id: 'study', label: '📖 Study', desc: function () { return 'Learn from whoever will teach you.'; },
    show: function (s) { return !adult(s); },
    tick: function (s) { if (dch(0.5)) skillUp(s, FB.pick(['lea', 'ste', 'dip'])); } },
  { id: 'play', label: '🪁 Play', desc: function () { return 'Childhood is short. Spend it well.'; },
    show: function (s) { return !adult(s); },
    tick: function (s) {
      me(s).health = FB.clamp(me(s).health + 0.012, 0, 10);
      if (dch(0.3)) skillUp(s, 'mar');
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
    } },
  { id: 'court_suitor', label: '🌷 Court {suitor}',
    desc: function (s) {
      const su = FB.getRole(s, 'suitor');
      return 'Win the favor of ' + (su ? su.name : 'your intended') + ', day by day.';
    },
    show: suitorReady,
    tick: function (s) {
      const su = FB.getRole(s, 'suitor');
      if (su) su.opinion = FB.clamp(su.opinion + (8 + FB.skillOf(me(s), 'dip') / 3) / D, -100, 100);
    } },

  { id: 'toil', label: '🌾 Toil in the lord’s fields',
    desc: function () { return 'Hard bread, hard-earned.'; },
    show: function (s) { return s.player.tier === 0 && adult(s); },
    tick: function (s) {
      s.player.gold += FB.rf(FBDATA.balance.serfWage[0], FBDATA.balance.serfWage[1]) / D;
      if (dch(0.1)) { me(s).health = Math.max(0, me(s).health - 1); FB.news(s, 'The labor grinds you down.'); }
    } },
  { id: 'militia', label: '🛡 Drill with the levy',
    desc: function () { return 'Spear practice on the green. (+martial over time)'; },
    show: function (s) { return s.player.tier <= 1 && adult(s) && s.player.profession !== 'monk'; },
    tick: function (s) { if (dch(0.6)) skillUp(s, 'mar'); } },

  { id: 'work_land', label: '🌾 Work your land',
    desc: function () { return 'Your own soil, your own sweat.'; },
    show: function (s) { return s.player.tier === 1 && s.player.profession === 'farmer'; },
    tick: function (s) {
      let g = FB.rf(FBDATA.balance.freeWage[0], FBDATA.balance.freeWage[1]);
      if (s.player.flags.has_farm) g += 2;
      if (s.player.flags.own_ox) g += 1;
      s.player.gold += g / D;
    } },
  { id: 'market', label: '⚖ Haggle at market',
    desc: function () { return 'Turn surplus into silver. (stewardship pays)'; },
    show: function (s) { return s.player.tier === 1 && adult(s); },
    tick: function (s) {
      s.player.gold += (1 + FB.skillOf(me(s), 'ste') / 3) / D;
      if (dch(0.35)) skillUp(s, 'ste');
    } },

  { id: 'craft_work', label: '🔨 Work the bench',
    desc: function () { return 'Steady hands, steady coin.'; },
    show: function (s) { return s.player.profession === 'craftsman' && s.player.tier <= 2; },
    tick: function (s) {
      s.player.gold += (FB.rf(2, 5) + (s.player.flags.guild_member ? 1 : 0)) / D;
      if (dch(0.3)) skillUp(s, 'ste');
    } },
  { id: 'trade_run', label: '🐫 Run trade ventures',
    desc: function (s) { return s.player.gold < 10 ? 'Little stock, little profit — but a start.' : 'Buy low here, sell high there.'; },
    show: function (s) { return s.player.profession === 'merchant' && s.player.tier <= 2; },
    tick: function (s) {
      const ste = FB.skillOf(me(s), 'ste');
      const c = 0.55 + ste * 0.015;
      let g = c * (9 + ste / 2) - (1 - c) * 6; // expected seasonal profit
      if (s.player.gold < 10) g *= 0.3;
      s.player.gold += Math.max(0.5, g) / D;
      if (dch(0.4)) skillUp(s, 'ste');
    } },

  { id: 'drill', label: '⚔ Drill at arms',
    desc: function () { return 'The sergeant’s stick teaches quickly.'; },
    show: function (s) { return s.player.profession === 'soldier'; },
    tick: function (s) {
      s.player.gold += 1 / D;
      if (dch(0.7)) skillUp(s, 'mar');
    } },
  { id: 'stand_guard', label: '🏰 Stand garrison duty',
    desc: function () { return 'Dull, cold, and paid.'; },
    show: function (s) { return s.player.profession === 'soldier'; },
    tick: function (s) {
      s.player.gold += 2 / D;
      const lord = FB.getRole(s, 'lord', false);
      if (lord) lord.opinion = FB.clamp(lord.opinion + 2 / D, -100, 100);
    } },

  { id: 'copy_books', label: '✒ Copy manuscripts',
    desc: function () { return 'Letters, slowly mastered. (+learning, +piety)'; },
    show: function (s) { return s.player.profession === 'monk' || s.player.profession === 'priest'; },
    tick: function (s) {
      s.player.piety += 2 / D;
      if (dch(0.6)) { skillUp(s, 'lea'); FB.addTrait(me(s), 'literate'); }
    } },
  { id: 'serve_church', label: '🕯 Serve the faithful',
    desc: function () { return 'Alms, sermons, and burials.'; },
    show: function (s) { return s.player.profession === 'monk' || s.player.profession === 'priest'; },
    tick: function (s) {
      s.player.piety += 4 / D;
      s.player.prestige += 2 / D;
      s.player.pop = FB.clamp(s.player.pop + 2 / D, -100, 100);
    } },

  { id: 'manage_manor', label: '🏡 Manage the manor',
    desc: function () { return 'Rents, reeves, and repairs.'; },
    show: function (s) { return s.player.tier === 2; },
    tick: function (s) {
      const B = FBDATA.balance;
      s.player.gold += (FB.rf(B.manorIncome[0], B.manorIncome[1]) + FB.skillOf(me(s), 'ste') / 4) / D;
    } },
  { id: 'serve_lord', label: '🤝 Attend the lord’s hall',
    desc: function () { return 'Be seen, be useful, be remembered.'; },
    show: function (s) { return s.player.tier === 2; },
    tick: function (s) {
      const lord = FB.getRole(s, 'lord', true);
      if (lord) lord.opinion = FB.clamp(lord.opinion + 6 / D, -100, 100);
      s.player.prestige += 2 / D;
      if (dch(0.3)) skillUp(s, 'dip');
    } },
  { id: 'train_arms', label: '⚔ Train at arms',
    desc: function () { return 'A blade kept sharp.'; },
    show: function (s) { return s.player.tier >= 2 && adult(s); },
    tick: function (s) { if (dch(0.6)) skillUp(s, 'mar'); } },
  { id: 'lead_host', label: '🚩 Lead the host',
    desc: function (s) {
      return s.player.war ? 'Command your men in the field. (better odds at the war council)'
        : 'Serve in your liege’s host. (+liege’s favor)';
    },
    show: function (s) {
      return !!s.player.war ||
        !!(s.player.flags.with_liege_host && s.player.liege && FB.isRealmAtWar(s, s.player.liege));
    },
    tick: function (s) {
      if (s.player.war) s.player.war.led = (s.player.war.led || 0) + 1;
      else s.player.liegeOp = FB.clamp((s.player.liegeOp || 0) + 4 / D, -100, 100);
      if (dch(0.5)) skillUp(s, 'mar');
    } },
  { id: 'scheming', label: '🕸 Advance the plot',
    desc: function (s) {
      const pl = s.player.plot;
      if (!pl) return 'No plot in motion.';
      const def = FBDATA.plots[pl.id];
      return 'Weaving: ' + Math.floor(pl.power) + '/' + (def ? def.need : '?') + ' — patience, whispers, ink.';
    },
    show: function (s) { return !!s.player.plot && adult(s); },
    tick: function (s) {
      const pl = s.player.plot;
      if (!pl) return;
      const def = FBDATA.plots[pl.id];
      if (!def) { s.player.plot = null; return; }
      pl.power += (2 + FB.skillOf(me(s), 'int') / 3) / D;
      if (dch(0.25)) skillUp(s, 'int');
      if (pl.sprung) return;
      if (dch(0.12)) { pl.sprung = 1; s.eventQueue.push({ id: 'plot_discovered', ctx: {} }); return; }
      if (pl.power >= def.need) { pl.sprung = 1; s.eventQueue.push({ id: def.event, ctx: {} }); }
    } },

  { id: 'govern', label: '🏛 Govern the demesne',
    desc: function () { return 'Ledgers, judgments, and roads. (+revenue, +standing)'; },
    show: function (s) { return s.player.tier >= 3; },
    tick: function (s) {
      s.player.gold += FB.playerTax(s) * 0.15 / D;
      s.player.pop = FB.clamp(s.player.pop + 3 / D, -100, 100);
      if (dch(0.25)) skillUp(s, 'ste');
    } },
  { id: 'patronize', label: '📜 Patronize scholars',
    desc: function (s) {
      return 'Fund learned men; scholarship accrues toward innovations. (Scholarship: ' +
        Math.floor(s.player.research || 0) + ')';
    },
    show: function (s) { return s.player.tier >= 3 && adult(s); },
    tick: function (s) {
      s.player.research = (s.player.research || 0) + (4 + FB.skillOf(me(s), 'lea') / 3) / D;
      s.player.gold = Math.max(0, s.player.gold - 2 / D);
      if (dch(0.3)) skillUp(s, 'lea');
    } }
  ];

  /* ================= INSTANTS (one-shot deeds) ================= */
  FB.instants = [

  { id: 'poach', label: '🏹 Poach the lord’s game', cd: 30,
    desc: function () { return 'Meat and coin — if the forester is elsewhere.'; },
    show: function (s) { return s.player.tier <= 1 && adult(s); },
    run: function (s) {
      if (FB.chance(0.65)) FB.applyEffects(s, { gold: FB.ri(2, 5), skills: { int: FB.chance(0.4) ? 1 : 0 } });
      else s.eventQueue.push({ id: 'caught_poaching', ctx: {} });
    } },
  { id: 'scheme_rival', label: '🗡 Scheme against {rival}', cd: 60,
    desc: function (s) {
      const r = FB.getRole(s, 'rival');
      return 'Undermine ' + (r ? r.name : 'your rival') + ' by fair means or foul.';
    },
    show: function (s) { return !!FB.getRole(s, 'rival') && adult(s); },
    run: function (s) {
      const r = FB.getRole(s, 'rival');
      const inn = FB.skillOf(me(s), 'int');
      if (FB.chance(0.35 + inn * 0.03)) {
        FB.applyEffects(s, { prestige: 4, skills: { int: FB.chance(0.5) ? 1 : 0 } });
        r.opinion = FB.clamp(r.opinion - 10, -100, 100);
        FB.news(s, 'Your quiet work costs ' + r.name + ' dearly.');
      } else {
        FB.applyEffects(s, { prestige: -4 });
        FB.news(s, 'The scheme unravels, and fingers point at you.');
      }
    } },
  { id: 'seek_match', label: '💍 Seek a match', cd: 30,
    desc: function () { return 'Ask kin and gossips to find you a spouse from your own walk of life.'; },
    show: function (s) {
      const m = me(s);
      const clergyCelibate = s.player.profession === 'monk' && FB.religionOf(m.religion).group !== 'muslim';
      return adult(s) && FB.canWed(s) && !s.player.courtingId && !clergyCelibate;
    },
    run: function (s) {
      FB.spawnSuitor(s);
      s.eventQueue.push({ id: 'meet_suitor', ctx: {} });
    } },
  { id: 'propose', label: '💒 Propose marriage', cd: 20,
    desc: function () { return 'Ask for their hand. Standing and wealth weigh heavily.'; },
    show: function (s) {
      const su = FB.getRole(s, 'suitor');
      return suitorReady(s) && su && su.opinion >= 5;
    },
    run: function (s) { s.eventQueue.push({ id: 'proposal_made', ctx: {} }); } },

  { id: 'go_to_town', label: '🏘 Go into town…', cd: 30, noConsume: true,
    desc: function () { return 'Spend a day at one of the province’s settlements — markets, pulpits, and hiring fairs, as fits your station.'; },
    show: function (s) { return adult(s); },
    can: function (s) { return FB.settlementsOf(s, s.player.provinceId).length ? true : 'Only wilderness here.'; },
    run: function (s) { if (FB.ui && FB.ui.showSettlements) FB.ui.showSettlements(); } },

  { id: 'seek_blessing', label: '🕊 Seek a blessing', cd: 90,
    desc: function (s) { return 'Bring your piety to the ' + FB.templeWord(me(s).religion) + ' and ask for grace.'; },
    show: function (s) { return adult(s); },
    run: function (s) { s.eventQueue.push({ id: 'seek_blessing', ctx: {} }); } },
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
        FB.news(s, '🤝 Your judgment mends a feud; both houses owe you thanks.');
      } else {
        FB.applyEffects(s, { prestige: -2 });
        FB.news(s, '🤝 Both sides leave angrier — at each other, and at you.');
      }
    } },
  { id: 'swear_friend', label: '🔗 Swear brotherhood with {friend}',
    desc: function (s) {
      const f = FB.getRole(s, 'friend', false);
      return 'Bind ' + (f ? f.name : 'your friend') + ' to your house by oath — for life.';
    },
    show: function (s) {
      const f = FB.getRole(s, 'friend', false);
      return adult(s) && !!f && f.opinion >= 40 && !s.player.flags.sworn_friend;
    },
    run: function (s) {
      FB.applyEffects(s, { setFlag: 'sworn_friend', prestige: 4, opinion: { role: 'friend', amt: 20 }, log: 'Swore an oath of brotherhood.' });
    } },
  { id: 'send_envoy', label: '🕊 Send an envoy…', noConsume: true,
    desc: function () { return 'Gifts and good words buy years of quiet borders. (10 gold)'; },
    show: function (s) { return s.player.tier >= 4 && s.realms.player && s.realms.player.alive; },
    can: function (s) {
      if (s.player.gold < 10) return 'An envoy without gifts insults his host.';
      return FB.envoyTargets(s).length ? true : 'No neighboring court to treat with.';
    },
    run: function (s) { if (FB.ui && FB.ui.showEnvoys) FB.ui.showEnvoys(); } },

  { id: 'better_household', label: '🏠 Better the household…', noConsume: true,
    desc: function () { return 'Beasts, tools, and standing — bought once, kept for generations.'; },
    show: function (s) { return s.player.tier <= 2 && adult(s); },
    can: function (s) {
      return FB.holdingAvailable(s).length ? true : 'Nothing suitable for your station remains.';
    },
    run: function (s) { if (FB.ui && FB.ui.showHoldings) FB.ui.showHoldings(); } },

  { id: 'buy_freedom', label: '⛓ Buy your freedom',
    desc: function () { return 'Pay ' + FBDATA.balance.freedomCost + ' gold to be struck from the serf-roll.'; },
    show: function (s) { return s.player.tier === 0 && adult(s); },
    can: function (s) {
      if (s.player.gold < FBDATA.balance.freedomCost) return 'Not enough gold.';
      const lord = FB.getRole(s, 'lord', true);
      if (lord && lord.opinion < -20) return 'The lord despises you and refuses.';
      return true;
    },
    run: function (s) {
      FB.applyEffects(s, { gold: -FBDATA.balance.freedomCost, tierSet: 1, prestige: 15, piety: 5, log: 'Bought freedom from serfdom!' });
    } },
  { id: 'buy_manor', label: '🏡 Buy a manor',
    desc: function () { return FBDATA.balance.manorCost + ' gold and ' + FBDATA.balance.manorPrestige + ' prestige — join the gentry.'; },
    show: function (s) { return s.player.tier === 1; },
    can: function (s) {
      if (s.player.gold < FBDATA.balance.manorCost) return 'Not enough gold.';
      if (s.player.prestige < FBDATA.balance.manorPrestige) return 'You lack the standing.';
      return true;
    },
    run: function (s) {
      FB.applyEffects(s, { gold: -FBDATA.balance.manorCost, tierSet: 2, prestige: 30, log: 'Bought a manor — gentry now!' });
    } },
  { id: 'petition_barony', label: '📜 Petition for a barony', cd: 360,
    desc: function (s) { return 'Ask ' + (FB.getRole(s, 'lord', true) || {}).name + ' for lands and a banner.'; },
    show: function (s) { return s.player.tier === 2; },
    can: function (s) {
      const lord = FB.getRole(s, 'lord', true);
      if (s.player.prestige < 250) return 'You need at least 250 prestige.';
      if (!lord || lord.opinion < 40) return 'The lord’s favor is not yet sufficient.';
      return true;
    },
    run: function (s) {
      const lord = FB.getRole(s, 'lord', true);
      if (FB.chance(0.15 + lord.opinion / 400 + s.player.prestige / 1200)) {
        s.eventQueue.push({ id: 'grant_of_barony', ctx: {} });
      } else {
        FB.news(s, 'The lord smiles, promises nothing, and speaks of the weather.');
        lord.opinion = FB.clamp(lord.opinion - 5, -100, 100);
      }
    } },

  { id: 'hold_court', label: '⚖ Hold court', cd: 90,
    desc: function () { return 'Hear petitions and render judgment.'; },
    show: function (s) { return s.player.tier >= 3; },
    run: function (s) { s.eventQueue.push({ id: 'hold_court_event', ctx: {} }); } },
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
      for (const pid of FB.demesne(s)) if (FB.buildable(s, pid).length) return true;
      return 'Nothing more can be raised in your lands.';
    },
    run: function (s) { if (FB.ui && FB.ui.showBuildings) FB.ui.showBuildings(); } },
  { id: 'adopt_tech', label: '💡 Adopt an innovation…', noConsume: true,
    desc: function (s) {
      return 'Scholarship: ' + Math.floor(s.player.research || 0) + ' — spend it on advances that outlive you.';
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
    run: function (s) { s.eventQueue.push({ id: 'court_feast', ctx: {} }); } },
  { id: 'petition_liege', label: '👑 Petition the liege for title', cd: 1440,
    desc: function () { return 'Ask for greater lands and higher style.'; },
    show: function (s) { return s.player.tier >= 3 && s.player.tier <= 5 && !!s.player.liege; },
    can: function (s) {
      if ((s.player.liegeOp || 0) < 65) return 'Your liege’s favor must be 65 or more (now ' + Math.round(s.player.liegeOp || 0) + ').';
      if (s.player.prestige < 400) return 'You need at least 400 prestige (now ' + Math.round(s.player.prestige) + ').';
      return true;
    },
    run: function (s) { s.eventQueue.push({ id: 'title_request', ctx: {} }); } },
  { id: 'muster_host', label: '🚩 Muster the host',
    desc: function (s) {
      const w = s.player.war;
      return 'Raise your levies and hired companies as a field host — ~' +
        (FB.playerLevy(s) + ((w && w.mercCos) || 0) * 150) +
        ' men at your seat. Then tap the host on the map and tap a province to march it.';
    },
    show: function (s) {
      if (!s.player.war) return false;
      if (FB.playerHost && FB.playerHost(s)) return false; // already in the field
      const down = (s.armyDown || {})['player'];
      return down === undefined || s.turn - down >= FBDATA.balance.armyRearmDays;
    },
    run: function (s) { if (FB.raisePlayerHost) FB.raisePlayerHost(s); } },
  { id: 'hire_mercs', label: '⚔ Hire a mercenary company', cd: 45,
    desc: function (s) {
      const w = s.player.war;
      const n = (w && w.mercCos) || 0;
      return '~150 spears: 15 gold now, 4 a season while the war lasts.' +
        (n ? ' (' + n + ' compan' + (n > 1 ? 'ies' : 'y') + ' under your banner)' : '');
    },
    show: function (s) { return !!s.player.war; },
    can: function (s) { return s.player.gold >= 15 ? true : 'Costs 15 gold.'; },
    run: function (s) {
      const w = s.player.war;
      if (!w || s.player.gold < 15) return;
      s.player.gold -= 15;
      FB.fns.war_mercs(s);
    } },
  { id: 'declare_war', label: '⚔ Declare war…', noConsume: true,
    desc: function () { return 'Choose a neighboring land to seize by force.'; },
    show: function (s) { return s.player.tier >= 4 && !s.player.war; },
    can: function (s) {
      return FB.warTargets(s).length ? true : 'No reachable enemy lands border yours.';
    },
    run: function (s) { if (FB.ui && FB.ui.showWarTargets) FB.ui.showWarTargets(); } },
  { id: 'declare_independence', label: '⚑ Declare independence…', noConsume: true,
    desc: function (s) {
      const lg = s.realms[s.player.liege];
      return 'Renounce ' + (lg ? lg.name : 'your liege') + ' and raise your own banner — it means war.';
    },
    show: function (s) { return s.player.tier >= 3 && !!s.player.liege && !s.player.war; },
    can: function (s) {
      return s.player.prestige >= 200 ? true
        : 'You need at least 200 prestige to rally men to your banner (now ' + Math.round(s.player.prestige) + ').';
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
  { id: 'grant_county', label: '🎁 Grant a county…', noConsume: true,
    desc: function () { return 'Raise a loyal man to a county of yours. Vassals pay taxes — and remember.'; },
    show: function (s) { return s.realms.player && s.realms.player.alive && s.player.provs && s.player.provs.length >= 2; },
    run: function (s) { if (FB.ui && FB.ui.showGrantCounty) FB.ui.showGrantCounty(); } },
  { id: 'demand_taxes', label: '💰 Demand extraordinary taxes', cd: 90,
    desc: function () { return 'Squeeze your vassals for three seasons’ taxes at once. They will not love it.'; },
    show: function (s) { return FB.playerVassals(s).length >= 1; },
    run: function (s) { FB.demandTaxes(s); } },
  { id: 'revoke_county', label: '📜 Revoke a county…', noConsume: true,
    desc: function () { return 'Take a fief back from a vassal — by law if he bends, by force if he rises.'; },
    show: function (s) { return FB.playerVassals(s).length >= 1 && !s.player.war; },
    run: function (s) { if (FB.ui && FB.ui.showRevoke) FB.ui.showRevoke(); } }
  ];

  /* ================= shared helpers ================= */

  FB.playerTax = function (state) {
    const B = FBDATA.balance;
    let t = 0;
    for (const pid of (state.player.provs || [])) t += (state.dev[pid] || 1) * B.taxPerDev;
    if (state.player.tier === 3) t = Math.max(t, 6); // barony rents
    // vassals render their seasonal due
    for (const vid of FB.playerVassals(state)) {
      for (const pid of FB.realmHeldCounties(state, vid)) t += (state.dev[pid] || 1) * B.vassalTaxRate;
    }
    t += FB.buildingBonus(state, 'tax');
    t *= 1 + FB.techBonus(state, 'tax');
    if (state.player.liege) t *= 0.75; // liege's cut
    return Math.round(t);
  };

  /* ================= items (personal treasures) =================
     Carried by the player, added to their skills via FB.skillOf, and
     passed to heirs. Acquired from peddlers, markets, war, plots, finds. */
  FB.itemList = function (state) {
    return state.player.items = state.player.items || []; // lazy init for older saves
  };

  FB.itemBonus = function (state, key) {
    let sum = 0;
    for (const id of FB.itemList(state)) {
      const def = FBDATA.items[id];
      if (def && def.fx && def.fx[key]) sum += def.fx[key];
    }
    return sum;
  };

  /* unowned items, weighted by rarity (or restricted to one rarity) */
  function itemPool(state, rarity) {
    const owned = FB.itemList(state);
    const W = { common: 6, fine: 3, famed: 1 };
    const pool = [];
    for (const id in FBDATA.items) {
      const def = FBDATA.items[id];
      if (owned.indexOf(id) >= 0) continue;
      if (rarity && def.rarity !== rarity) continue;
      const w = W[def.rarity] || 1;
      for (let i = 0; i < w; i++) pool.push(id);
    }
    return pool;
  }

  FB.lootItem = function (state, rarity, prefix) {
    const pool = itemPool(state, rarity);
    if (!pool.length) return null;
    const id = FB.pick(pool);
    FB.itemList(state).push(id);
    const def = FBDATA.items[id];
    FB.news(state, (prefix || '🎒 Yours now') + ': ' + def.icon + ' ' + FB.fmt(state, def.name, {}) + '.');
    return id;
  };

  /* parting with a treasure: sold against its value, or given away for the
     regard such largesse buys (scaled by rarity; the lord's favor rises too).
     Given items sit on the receiving character (c.items) — worn as chips on
     their card, and rejoining the family hoard if that character succeeds. */
  FB.sellItem = function (state, id) {
    const list = FB.itemList(state);
    const i = list.indexOf(id);
    const def = FBDATA.items[id];
    if (i < 0 || !def) return;
    list.splice(i, 1);
    const gold = Math.round(def.value * (FBDATA.balance.itemSellRatio || 0.5));
    state.player.gold += gold;
    FB.news(state, '💰 Sold: ' + def.icon + ' ' + FB.fmt(state, def.name, {}) + ' for ' + gold + ' gold.');
  };

  FB.giftOpinion = function (def) {
    return { common: 15, fine: 25, famed: 40 }[def.rarity] || 15;
  };
  FB.giveItem = function (state, id, cid) {
    const list = FB.itemList(state);
    const i = list.indexOf(id);
    const c = state.chars[cid];
    const def = FBDATA.items[id];
    if (i < 0 || !c || c.dead || !def) return;
    list.splice(i, 1);
    c.items = c.items || [];
    if (c.items.indexOf(id) < 0) c.items.push(id);
    const boost = FB.giftOpinion(def);
    c.opinion = FB.clamp(c.opinion + boost, -100, 100);
    if (state.roles.lord === cid) state.player.liegeOp = FB.clamp((state.player.liegeOp || 0) + boost, -100, 100);
    FB.news(state, '🎁 You give ' + def.icon + ' ' + FB.fmt(state, def.name, {}) + ' to ' +
      c.name + '. (regard ' + Math.round(c.opinion) + ')');
  };

  FB.offerItem = function (state) {
    const pool = itemPool(state, null);
    if (!pool.length) { FB.news(state, '🎒 Nothing is offered that you do not already own.'); return; }
    const id = FB.pick(pool);
    state.player.itemOffer = { id: id, price: FBDATA.items[id].value };
    state.eventQueue.push({ id: 'item_offer', ctx: {} });
  };

  FB.fns.offer_item = function (state) { FB.offerItem(state); };
  FB.fns.can_afford_item = function (state) {
    const o = state.player.itemOffer;
    return !!o && state.player.gold >= o.price;
  };
  FB.fns.buy_item = function (state) {
    const o = state.player.itemOffer;
    if (!o || state.player.gold < o.price) return;
    state.player.gold -= o.price;
    state.player.itemOffer = null;
    const def = FBDATA.items[o.id];
    FB.itemList(state).push(o.id);
    FB.news(state, '🎒 Bought: ' + def.icon + ' ' + FB.fmt(state, def.name, {}) + '.');
  };
  FB.fns.clear_item_offer = function (state) { state.player.itemOffer = null; };
  FB.fns.loot_item = function (state) { FB.lootItem(state, null, '🎒 Plunder'); };
  FB.fns.find_artifact = function (state) { FB.lootItem(state, 'famed', '✨ Out of the earth'); };
  FB.fns.plot_loot = function (state) {
    FB.lootItem(state, null, '🎒 From the chest');
    FB.fns.plot_end(state);
  };

  /* ================= plots (the intrigue game) ================= */
  FB.plotAvailable = function (state) {
    const out = [];
    if (state.player.plot) return out;
    for (const id in FBDATA.plots) {
      const def = FBDATA.plots[id];
      if (def.trigger && !FB.checkTrigger(state, def.trigger)) continue;
      out.push({ id: id, def: def });
    }
    return out;
  };

  FB.beginPlot = function (state, id) {
    const def = FBDATA.plots[id];
    if (!def || state.player.plot) return;
    if (def.trigger && !FB.checkTrigger(state, def.trigger)) return;
    state.player.plot = { id: id, power: 0 };
    if (state.player.focus !== 'scheming') {
      state.player.focusBack = state.player.focus;
      state.player.focus = 'scheming';
    }
    FB.news(state, '🕸 A plot is set in motion: ' + FB.fmt(state, def.name, {}) + '.');
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

  FB.payHomage = function (state, rid) {
    const p = state.player;
    const r = state.realms[rid];
    if (!r || !r.alive) return;
    const m = state.chars[p.charId];
    FB.adjustLiegeOp(state, rid, FBDATA.balance.homageOpinion + Math.floor(FB.skillOf(m, 'dip') / 2));
    p.prestige += 2;
    FB.news(state, '🙇 You bend the knee at the court of ' + r.name + '.');
  };

  /* sovereign realms bordering the player's lands (fealty candidates) */
  FB.fealtyTargets = function (state) {
    const p = state.player;
    const cur = FB.playerRealmId(state);
    const out = [];
    for (const pid of (p.provs || [])) {
      for (const nb in (FB.world.adj[pid] || {})) {
        const own = state.owner[nb];
        if (!own || own === cur || own === 'player' || out.indexOf(own) >= 0) continue;
        if (state.realms[own] && state.realms[own].alive && !state.realms[own].liege) out.push(own);
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
    if (!r || !r.alive) return;
    const oldTop = p.liege ? FB.topRealm(state, p.liege) : null;
    const newTop = FB.topRealm(state, rid);
    for (const pid of (p.provs || [])) {
      state.owner[pid] = newTop;
      state.holder[pid] = 'player';
    }
    if (state.realms.player && state.realms.player.alive) {
      state.realms.player.alive = false;
      state.realms.player.war = null;
      // the old realm's other vassals go free
      for (const vid in state.realms) if (state.realms[vid].liege === 'player') state.realms[vid].liege = null;
    }
    p.liege = rid;
    FB.adjustLiegeOp(state, rid, 20);
    FB.invalidateRealmCache();
    FB.news(state, '🤝 You swear fealty to ' + r.name + '. Your banners now fly under ' + state.realms[newTop].name + '.');
    if (oldTop && oldTop !== newTop && state.realms[oldTop] && state.realms[oldTop].alive && FB.chance(0.5)) {
      p.war = { enemy: oldTop, target: null, wins: 0, losses: 0, seasons: 0, defending: true };
      FB.warFooting(state);
      FB.news(state, '🔥 ' + state.realms[oldTop].name + ' names you traitor — war for your defection!');
    }
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
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
    state.owner[pid] = 'player';
    FB.adjustLiegeOp(state, vid, 40);
    FB.invalidateRealmCache();
    FB.news(state, '🎁 ' + pr.name + ' is granted to a loyal man — ' + state.realms[vid].ruler.name + ' holds it in your name.');
  };

  /* three seasons' taxes squeezed out of every vassal at once */
  FB.demandTaxes = function (state) {
    const p = state.player;
    let gold = 0;
    for (const vid of FB.playerVassals(state)) {
      for (const pid of FB.realmHeldCounties(state, vid)) gold += Math.ceil((state.dev[pid] || 1) * FBDATA.balance.vassalTaxRate * 3);
      FB.adjustLiegeOp(state, vid, -15);
      if (FB.liegeOpOf(state, vid) <= -50) state.eventQueue.push({ id: 'vassal_revolt', ctx: { rid: vid } });
    }
    if (gold > 0) {
      p.gold += gold;
      FB.news(state, '💰 Your vassals render ' + gold + ' gold in extraordinary taxes — grumbling all the while.');
    }
  };

  /* ================= envoys & pacts (the diplomacy game) ================= */
  FB.envoyTargets = function (state) {
    const out = [];
    for (const id in state.realms) {
      const r = state.realms[id];
      if (id === 'player' || !r.alive || r.liege) continue; // sovereigns only
      if (state.player.war && state.player.war.enemy === id) continue;
      if (state.pacts && state.pacts[id] > state.turn) continue;
      if (!FB.realmsAdjacent(state, 'player', id)) continue;
      out.push(id);
    }
    return out;
  };

  FB.sendEnvoy = function (state, rid) {
    const p = state.player;
    const r = state.realms[rid];
    if (!r || !r.alive || p.gold < 10) return;
    p.gold -= 10;
    const m = state.chars[p.charId];
    if (FB.chance(FB.clamp(0.35 + FB.skillOf(m, 'dip') * 0.035 + p.prestige / 600, 0.1, 0.9))) {
      state.pacts = state.pacts || {};
      state.pacts[rid] = state.turn + 8 * 90; // two years of peace
      FB.applyEffects(state, { prestige: 3, skills: { dip: FB.chance(0.5) ? 1 : 0 } });
      FB.news(state, '🕊 ' + r.name + ' swears a pact of peace — two years of quiet borders.');
    } else {
      FB.news(state, '🕊 The envoy returns, gifts refused. ' + r.name + ' is unmoved.');
    }
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
    if (!def || done.indexOf(id) >= 0) return;
    if (def.req && done.indexOf(def.req) < 0) return;
    if (state.player.gold < def.cost) return;
    state.player.gold -= def.cost;
    done.push(id);
    FB.news(state, '🏠 ' + FB.fmt(state, def.name, {}) + ' now belongs to the household.');
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
      if (done.indexOf(id) >= 0) continue;
      if (def.yearMin && state.date.year < def.yearMin) continue;
      if (def.req && done.indexOf(def.req) < 0) continue;
      out.push({ id: id, def: def });
    }
    return out;
  };

  /* ---- automation (the ⚙ Automation dialog): one purchase per season ---- */
  FB.autoBuild = function (state) {
    let best = null, bestPid = null;
    for (const pid of FB.demesne(state)) {
      for (const b of FB.buildable(state, pid)) {
        if (!best || b.cost < best.cost) { best = b; bestPid = pid; }
      }
    }
    // keep a prudent reserve so upkeep and events never find an empty chest
    if (best && state.player.gold >= best.cost + 25) FB.build(state, bestPid, best.id);
  };

  FB.autoResearch = function (state) {
    let best = null;
    for (const t of FB.techAvailable(state)) {
      if (!best || t.def.cost < best.def.cost) best = t;
    }
    if (best && (state.player.research || 0) >= best.def.cost) FB.adoptTech(state, best.id);
  };

  FB.adoptTech = function (state, id) {
    const def = FBDATA.tech[id];
    const done = FB.techList(state);
    if (!def || done.indexOf(id) >= 0) return;
    if (def.yearMin && state.date.year < def.yearMin) return;
    if (def.req && done.indexOf(def.req) < 0) return;
    if ((state.player.research || 0) < def.cost) return;
    state.player.research -= def.cost;
    done.push(id);
    FB.news(state, '💡 ' + FB.fmt(state, def.name, {}) + ' takes root in your lands.');
  };

  /* ================= demesne buildings =================
     One of each per province, raisable in ANY province the player holds.
     state.buildings maps province id -> [building ids], so conquest takes
     them with the land. */
  FB.demesne = function (state) {
    const p = state.player;
    return (p.provs && p.provs.length) ? p.provs : [p.provinceId];
  };

  FB.homeProv = function (state) {
    return FB.demesne(state)[0];
  };

  FB.builtIn = function (state, pid) {
    state.buildings = state.buildings || {}; // lazy init for older saves
    return state.buildings[pid] = state.buildings[pid] || [];
  };

  /* built anywhere in the demesne (the reading used by event triggers) */
  FB.hasBuilding = function (state, id) {
    for (const pid of FB.demesne(state)) {
      if (FB.builtIn(state, pid).indexOf(id) >= 0) return true;
    }
    return false;
  };

  FB.buildingBonus = function (state, key) {
    let sum = 0;
    for (const pid of FB.demesne(state)) {
      for (const bid of FB.builtIn(state, pid)) {
        const def = FBDATA.buildings[bid];
        if (def && def[key]) sum += def[key];
      }
    }
    return sum;
  };

  FB.buildCost = function (state, def) {
    let c = def.cost * (1 - FB.techBonus(state, 'build'));
    if (state.player.flags.mason_visit) c *= 0.75;
    return Math.round(c);
  };

  FB.buildable = function (state, pid) {
    const pr = FB.world.byId[pid];
    const done = FB.builtIn(state, pid);
    const out = [];
    for (const id in FBDATA.buildings) {
      const def = FBDATA.buildings[id];
      if (done.indexOf(id) >= 0) continue;
      if (def.devMin && (state.dev[pid] || 1) < def.devMin) continue;
      if (def.coastal && (!pr || !pr.coastal)) continue;
      if (def.terrains && (!pr || def.terrains.indexOf(pr.terrain) < 0)) continue;
      out.push({ id: id, def: def, cost: FB.buildCost(state, def) });
    }
    return out;
  };

  FB.build = function (state, pid, id) {
    const def = FBDATA.buildings[id];
    if (!def || FB.demesne(state).indexOf(pid) < 0) return;
    const done = FB.builtIn(state, pid);
    if (done.indexOf(id) >= 0) return;
    const cost = FB.buildCost(state, def);
    if (state.player.gold < cost) return;
    state.player.gold -= cost;
    delete state.player.flags.mason_visit; // the mason's discount is spent
    done.push(id);
    if (def.dev) state.dev[pid] = FB.clamp((state.dev[pid] || 1) + def.dev, 1, FB.devCap(state, pid));
    const fx = {};
    if (def.pop) fx.popularOpinion = def.pop;
    if (def.prestige) fx.prestige = def.prestige;
    FB.applyEffects(state, fx, {});
    FB.news(state, '🏗 ' + FB.fmt(state, def.name, {}) + ' rises in ' + FB.world.byId[pid].name + '.');
  };

  FB.warTargets = function (state) {
    const p = state.player;
    const mine = (p.provs && p.provs.length) ? p.provs : [p.provinceId];
    const myRealm = state.realms.player && state.realms.player.alive ? 'player'
      : (p.liege ? FB.topRealm(state, p.liege) : null);
    const out = [];
    for (const pid of mine) {
      for (const nb in (FB.world.adj[pid] || {})) {
        const own = state.owner[nb];
        if (!own || own === myRealm || own === 'player') continue;
        if (FB.world.byId[nb].wasteland) continue;
        if (state.pacts && state.pacts[own] > state.turn) continue; // a sworn pact holds
        if (out.indexOf(nb) < 0) out.push(nb);
      }
    }
    return out;
  };

  FB.startPlayerWar = function (state, targetProv) {
    const enemy = state.owner[targetProv];
    if (!enemy) return;
    state.player.war = { enemy: enemy, target: targetProv, wins: 0, losses: 0, seasons: 0, defending: false };
    FB.news(state, '⚔ You declare war upon ' + (state.realms[enemy] ? state.realms[enemy].name : enemy) +
      ' for ' + FB.world.byId[targetProv].name + '!');
    state.player.prestige += 5;
    FB.warFooting(state);
    state.eventQueue.push({ id: 'war_muster', ctx: {} });
  };

  FB.listFocuses = function (state) {
    return FB.focuses.filter(function (f) { return f.show(state); });
  };

  FB.listInstants = function (state) {
    const out = [];
    for (const a of FB.instants) {
      if (!a.show(state)) continue;
      let can = true, reason = '';
      if (a.cd !== undefined) {
        const last = state.player.cooldowns[a.id];
        if (last !== undefined && state.turn - last < a.cd) {
          can = false;
          reason = 'Ready in ' + (a.cd - (state.turn - last)) + ' days.';
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
    let want;
    if (p.profession === 'monk') want = 'copy_books';
    else if (p.profession === 'priest') want = 'serve_church';
    else if (p.tier >= 3) want = 'govern';
    else if (p.tier === 2) want = 'manage_manor';
    else {
      want = ({ farmer: p.tier === 0 ? 'toil' : 'work_land', craftsman: 'craft_work',
        merchant: 'trade_run', soldier: 'drill', noble: 'train_arms' })[p.profession];
    }
    const shown = FB.listFocuses(state);
    for (const f of shown) if (f.id === want) return want;
    return shown.length ? shown[0].id : null;
  };

  FB.validateFocus = function (state) {
    const cur = state.player.focus;
    // daily hot path: if the current focus is still offered, skip the full
    // listFocuses sweep (all ~27 show() callbacks) entirely
    if (cur) {
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
