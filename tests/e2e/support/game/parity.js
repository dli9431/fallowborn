'use strict';

/* Parity journeys: deterministic starts and save imports, bounded advances to
   the next season or year, and a compact world snapshot captured inside the
   page. Only the parity specs import this leaf module. */

const { expect } = require('../fixture');
const { openGame } = require('./navigation');

const PARITY_SEED = 'PARITY';
const ORDINARY_SCENARIOS = ['serf', 'farmer', 'apprentice', 'monk', 'soldier', 'knight', 'baron'];
const FRESH_JOURNEYS = [];
['867', '1066'].forEach(function (bookmark) {
  ORDINARY_SCENARIOS.forEach(function (scenario) {
    FRESH_JOURNEYS.push({
      id:'fresh-' + bookmark + '-' + scenario,
      bookmark:bookmark,
      scenario:scenario,
      code:PARITY_SEED + '-' + bookmark + '-' + scenario + '-london-m-Parity'
    });
  });
});
FRESH_JOURNEYS.push({
  id:'fresh-476-federate_476',
  bookmark:'476',
  scenario:'federate_476',
  code:PARITY_SEED + '-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian'
});
FRESH_JOURNEYS.push({
  id:'fresh-476-curialis_476',
  bookmark:'476',
  scenario:'curialis_476',
  // Roman Nicene is Ravenna's own community, so the canonical code omits it
  code:PARITY_SEED + '-476-curialis_476-ravenna-m-Marcus-established'
});

/* Fixed samples. Deeds and focuses are listed whether or not a start can see
   them, so a gating change shows up as a changed status. */
const SAMPLE_DEEDS = [
  'go_to_town', 'seek_match', 'give_alms', 'seek_blessing', 'buy_land', 'review_serf_tenure',
  'declare_manor', 'petition_barony', 'seek_field_command', 'hold_feast', 'hold_court',
  'squeeze_taxes', 'build', 'adopt_tech', 'petition_county', 'buy_county',
  'muster_host', 'hire_mercs', 'declare_war'
];
const SAMPLE_FOCUSES = [
  'study', 'toil', 'work_land', 'market', 'pray', 'drill', 'manage_manor',
  'govern', 'train_arms', 'lead_host'
];

/* Browser-local automation preferences are not part of a save, so every
   journey fixes them. Events resolve with their first option. */
const PARITY_AUTOMATION = {
  minor:false, major:false, war:false, all:true, style:'first',
  hosts:'manual', hostResupply:true, buySupplies:true, forceSupplies:false,
  supplyTarget:75, build:false, research:false, researchMode:'cheapest'
};

async function settleForParity(page) {
  await page.evaluate(function (automation) {
    FB.game.setPaused(true);
    Object.keys(automation).forEach(function (key) { FB.game.auto[key] = automation[key]; });
    FB.game.uiPrefs.hideTips = true;
    FB.game.uiPrefs.hideBeginnerHints = true;
    if (FB.ui && FB.ui.coachmarkReset) FB.ui.coachmarkReset();
  }, PARITY_AUTOMATION);
}

async function startParityGame(page, testInfo, journey) {
  await openGame(page, testInfo);
  await page.evaluate(function () { FB.startProgression.noteTier(3); });
  const fullStartButton = page.locator('#btn-choose-beginning');
  if (await fullStartButton.isVisible()) await fullStartButton.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  const seedInput = page.locator('#ng-seed');
  await seedInput.fill(journey.code);
  await expect(seedInput).toHaveValue(journey.code);
  await seedInput.press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true })
    .click({ timeout:30 * 1000 });
  await expect(page.getByRole('heading', { name:'Your Story Begins', exact:true }))
    .toBeVisible();
  await expect(page.getByRole('button', { name:'Begin', exact:true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  const started = await page.evaluate(function () {
    return { bookmark:FB.state.start.id, seed:FB.state.seed };
  });
  expect(started.bookmark).toBe(journey.bookmark);
  expect(started.seed).toBe(journey.code);
  await settleForParity(page);
  /* Journeys are not tutorial tests; drop the synthetic tutorial in every
     tree the same way, as the shared start journey does. */
  await page.evaluate(function () {
    if (FB.state.player.flags) delete FB.state.player.flags.tutorial;
  });
}

async function loadParitySave(page, testInfo, text) {
  await openGame(page, testInfo);
  await page.evaluate(function (source) {
    const data = FB.save.parseExport(source);
    if (!data) throw new Error('Parity input is not a readable exported save.');
    window.__parityLoaded = false;
    const accepted = FB.game.loadData(data, function () {
      FB.game.setPaused(true);
      window.__parityLoaded = true;
    });
    if (accepted === false) throw new Error('The game refused the parity save.');
  }, text);
  await expect.poll(function () {
    return page.evaluate(function () { return window.__parityLoaded === true; });
  }, { timeout:120 * 1000 }).toBe(true);
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  await settleForParity(page);
  return page.evaluate(function () {
    return (FB.game.lastLoadWarnings || []).map(function (warning) {
      return warning.stage;
    });
  });
}

/* Passes whole days until the season (or year) differs from where it began.
   A day that cannot pass, or the player's death, ends the advance; the stop
   is reported so the snapshot records it instead of hanging. */
async function advanceTo(page, boundary, maxDays) {
  return page.evaluate(function (options) {
    const s = FB.state;
    const from = { year:s.date.year, season:s.date.season };
    function reached() {
      return FB.state.date.year !== from.year ||
        options.boundary === 'season' && FB.state.date.season !== from.season;
    }
    function busy() {
      if (FB.ui && FB.ui.eventsBusy && FB.ui.eventsBusy()) return 'event';
      if (document.querySelector('#genmodal:not(.hidden)')) {
        const title = document.getElementById('gm-title');
        return 'modal:' + (title && title.textContent || '');
      }
      if (FB.papacyPendingDecision && FB.papacyPendingDecision(FB.state)) return 'papacy';
      if (FB.greatHolyWarSettlementNeedsPlayer &&
          FB.greatHolyWarSettlementNeedsPlayer(FB.state)) return 'great_holy_war_settlement';
      return 'unknown';
    }
    FB.game.setPaused(true);
    let days = 0, stop = null;
    while (!reached()) {
      if (FB.state.player.dead) { stop = 'player_dead'; break; }
      if (days >= options.maxDays) { stop = 'day_limit'; break; }
      const before = FB.state.turn;
      FB.game.passDay();
      if (FB.state.turn !== before + 1) { stop = 'stalled:' + busy(); break; }
      days++;
    }
    return { days:days, stop:stop };
  }, { boundary:boundary, maxDays:maxDays });
}

/* A compact, comparable view of the world: saved facts, query answers and
   the cost text a player is shown. No derived caches and no timing. Reads
   should leave state, RNG and uid as found; readsArePure records whether
   they did. */
async function captureWorldSnapshot(page, advance) {
  return page.evaluate(function (input) {
    const s = FB.state, Q = FB.political, p = s.player;
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const before = JSON.stringify(s);
    function safe(read) {
      try {
        const value = read();
        return value === undefined ? null : JSON.parse(JSON.stringify(value));
      } catch (error) {
        return { error:String(error && error.message || error) };
      }
    }
    function sorted(object) {
      const out = {};
      Object.keys(object).sort().forEach(function (key) { out[key] = object[key]; });
      return out;
    }

    const character = s.chars[p.charId] || null;
    const career = character && character.career || null;
    const player = {
      charId:p.charId,
      dead:!!p.dead,
      tier:p.tier,
      station:character ? safe(function () { return FB.stationOf(character); }) : null,
      profession:p.profession || null,
      career:career ? {
        profession:career.profession || null,
        rank:career.rank || null,
        guildRank:career.guildRank || null
      } : null,
      provinceId:p.provinceId,
      liege:p.liege || null,
      gold:p.gold,
      prestige:p.prestige,
      piety:p.piety,
      directCounties:(p.provs || []).slice().sort()
    };

    const provinces = {};
    const ids = {};
    Object.keys(s.owner || {}).forEach(function (pid) { ids[pid] = true; });
    Object.keys(s.holder || {}).forEach(function (pid) { ids[pid] = true; });
    Object.keys(ids).sort().forEach(function (pid) {
      provinces[pid] = (s.owner[pid] || '-') + ' / ' + (s.holder[pid] || '-');
    });

    const realms = {};
    const forms = {};
    Object.keys(s.realms).sort().forEach(function (rid) {
      const r = s.realms[rid];
      if (!r || !r.alive) return;
      const succession = r.succession;
      const member = succession && succession.members &&
        succession.members[succession.rulerMemberId];
      realms[rid] = [
        'rank ' + r.rank,
        'liege ' + (r.liege || '-'),
        'ruler ' + (member && member.charId || '-'),
        'gen ' + JSON.stringify(safe(function () { return FB.realmRulerGeneration(s, rid); }))
      ].join(' | ');
      const government = safe(function () {
        return Q.government ? Q.government(s, { kind:'realm', id:rid }) : null;
      });
      const formId = government && government.formId || 'none';
      forms[formId] = (forms[formId] || 0) + 1;
    });

    const treasury = { playerGold:p.gold, accounts:0, gold:0, militaryAccrued:0 };
    Object.keys(s.realms).sort().forEach(function (rid) {
      const account = s.realms[rid] && s.realms[rid].treasury;
      if (!account || account.retired) return;
      treasury.accounts++;
      treasury.gold += Number(account.gold) || 0;
      treasury.militaryAccrued += Number(account.militaryAccrued) || 0;
    });
    treasury.accounting = s.treasuryAccounting && s.treasuryAccounting.mode || null;

    const pid = p.provinceId;
    const me = { kind:'character', id:p.charId };
    const homeRealm = safe(function () { return FB.settlementCountyHolder(s, pid); });
    const sovereign = typeof homeRealm === 'string'
      ? safe(function () { return FB.topRealm(s, homeRealm); }) : null;
    const actors = { player:me };
    if (typeof homeRealm === 'string') actors.home = { kind:'realm', id:homeRealm };
    if (typeof sovereign === 'string') actors.sovereign = { kind:'realm', id:sovereign };
    const political = {
      homeRealm:homeRealm,
      sovereign:sovereign,
      government:{
        home:actors.home ? safe(function () { return Q.government(s, actors.home).formId; }) : null,
        sovereign:actors.sovereign
          ? safe(function () { return Q.government(s, actors.sovereign).formId; }) : null,
        forms:sorted(forms)
      },
      power:{},
      permission:{}
    };
    function brief(result) {
      if (!result || result.error) return result;
      return {
        allowed:!!result.allowed,
        reason:result.reason || null,
        basis:(result.basis || []).map(function (row) { return row.kind + ':' + row.id; })
      };
    }
    Object.keys(actors).forEach(function (name) {
      ['peace', 'revenue', 'consent'].forEach(function (power) {
        political.power[name + '.' + power] = brief(safe(function () {
          return Q.power(s, actors[name], power, { provinceId:pid });
        }));
      });
    });
    const host = (s.armies || []).filter(function (army) {
      return army && (army.realm === sovereign || army.realm === 'player');
    }).map(function (army) { return army.id; }).sort()[0] || null;
    if (host) {
      Object.keys(actors).forEach(function (name) {
        political.power[name + '.ban'] = brief(safe(function () {
          return Q.power(s, actors[name], 'ban', { hostId:host });
        }));
      });
    }
    ['arrest', 'judge', 'collect_render'].forEach(function (operation) {
      political.permission['player.' + operation] = brief(safe(function () {
        return Q.permission(s, me, operation, { provinceId:pid });
      }));
    });
    if (actors.home) {
      political.permission['home.grant_settlement'] = brief(safe(function () {
        return Q.permission(s, actors.home, 'grant_settlement',
          { provinceId:pid, settlement:0, recipientId:p.charId });
      }));
    }

    function costRecords(preview) {
      return (preview && preview.costs || []).map(function (record) {
        return safe(function () { return FB.eventImpactText(s, record, 'resolved'); });
      });
    }
    const deeds = {};
    input.deeds.forEach(function (id) {
      deeds[id] = safe(function () {
        const status = FB.instantStatus(s, id);
        if (!status.action) return 'unknown';
        if (!status.shown) return 'hidden';
        return { can:status.can, costs:costRecords(status.preview) };
      });
    });
    const focuses = {};
    input.focuses.forEach(function (id) {
      focuses[id] = safe(function () {
        const status = FB.focusStatus(s, id);
        if (!status.action) return 'unknown';
        if (!status.shown) return 'hidden';
        return { can:status.can, costs:costRecords(status.preview) };
      });
    });
    const quotes = {
      freedomPrice:FB.freedomPurchasePrice
        ? safe(function () { return FB.freedomPurchasePrice(s); }) : null,
      landPlot:FB.landPlotCost ? safe(function () { return FB.landPlotCost(s, 1); }) : null,
      rankElevation:FB.rankElevationCost && p.tier < 7
        ? safe(function () { return FB.rankElevationCost(s, p.tier, p.tier + 1); }) : null
    };

    const snapshot = {
      date:{ year:s.date.year, season:s.date.season, day:s.date.day },
      turn:s.turn,
      advance:input.advance || null,
      rng:rng,
      uid:uid,
      player:player,
      treasury:treasury,
      political:political,
      costs:{ deeds:deeds, focuses:focuses, quotes:quotes },
      realms:realms,
      provinces:provinces
    };
    snapshot.readsArePure = rng === FB.getRngState() && uid === FB.getUidCounter() &&
      before === JSON.stringify(s);
    return snapshot;
  }, { deeds:SAMPLE_DEEDS, focuses:SAMPLE_FOCUSES, advance:advance || null });
}

/* Day 0, the next season boundary and the next year boundary. */
async function captureJourney(page) {
  const checkpoints = {};
  checkpoints.start = await captureWorldSnapshot(page, null);
  const season = await advanceTo(page, 'season', 120);
  checkpoints.season = await captureWorldSnapshot(page, season);
  if (!season.stop) {
    const year = await advanceTo(page, 'year', 400);
    checkpoints.year = await captureWorldSnapshot(page, year);
  }
  return checkpoints;
}

/* Every authored start scenario and the bookmarks it is limited to. The
   fresh journeys cover exactly this table; a new scenario needs a journey. */
async function startScenarioTable(page) {
  return page.evaluate(function () {
    const out = {};
    FBDATA.startScenarios.forEach(function (scenario) {
      out[scenario.id] = scenario.bookmarkIds ? scenario.bookmarkIds.slice().sort() : 'any';
    });
    return out;
  });
}

function expectedScenarioTable() {
  const out = {};
  ORDINARY_SCENARIOS.forEach(function (id) { out[id] = 'any'; });
  out.federate_476 = ['476'];
  out.curialis_476 = ['476'];
  return out;
}

module.exports = {
  FRESH_JOURNEYS:FRESH_JOURNEYS,
  advanceTo:advanceTo,
  captureJourney:captureJourney,
  captureWorldSnapshot:captureWorldSnapshot,
  loadParitySave:loadParitySave,
  expectedScenarioTable:expectedScenarioTable,
  startParityGame:startParityGame,
  startScenarioTable:startScenarioTable
};
