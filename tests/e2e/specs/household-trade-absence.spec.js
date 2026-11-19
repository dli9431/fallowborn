'use strict';
const { test, expect } = require('../support/fixture');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['js/ui_panels.js', 'js/ui_misc.js', 'js/economy.js',
  'js/travel.js', 'js/actions.js', 'js/model.js', 'js/save.js', 'data/economy.js',
  'data/travel.js']);
test.describe.configure({ mode:'parallel' });

for (const bookmark of ['867', '476']) {
  test('household work survives accompanied and dispatched trade in ' + bookmark,
    async function ({ page }, info) {
      await beginBookmark(page, info, bookmark);
      const results = await page.evaluate(function () {
        let s = FB.state;
        const me = s.chars[s.player.charId];
        s.player.tier = 1;
        s.player.gold = 1000;
        s.player.focus = 'work_land';
        s.player.travel = null;
        s.player.retainers = [];
        s.player.enterpriseLabor = [];
        function career(c) {
          c.career = { profession:'farmer', chosen:true, rank:'journeyman',
            experience:1, guildRank:'none', guildStanding:0 };
        }
        career(me);
        FB.syncPlayerCareer(s);
        function person(name, family) {
          const c = FB.makeCharacter(s, { name:name, sex:'m', born:s.date.year - 25,
            culture:me.culture, religion:me.religion, dyn:me.dyn, traitsN:0,
            fatherId:family && me.sex === 'm' ? me.id : null,
            motherId:family && me.sex === 'f' ? me.id : null });
          c.homeProvinceId = s.player.provinceId;
          career(c);
          if (family) me.childrenIds.push(c.id);
          return c;
        }
        const resident = person('Resident orchard worker', true);
        const wageEarner = person('Resident livelihood worker', true);
        const hire = person('Paid orchard worker', false);
        const factor = person('Resident household factor', false);
        factor.role = 'retainer';
        s.player.retainers = [{ charId:factor.id, office:'factor', pay:2,
          unpaid:0, startedTurn:s.turn }];
        hire.role = 'laborer';
        FB.touchFamily();
        const home = s.player.provinceId;
        s.player.enterprises = [me, resident, hire].map(function (c, i) {
          return { uid:'absence_orchard_' + i, type:'orchard_business', provinceId:home,
            settlement:i, workerId:c.id, workerLocked:true };
        });
        s.player.enterpriseLabor = [{ charId:hire.id, enterpriseUid:'absence_orchard_2',
          pay:1, unpaid:0, startedTurn:s.turn }];
        FB.enterpriseList(s);
        FB.ensureEconomy(s);
        const destination = FB.travelDestinations(s, FB.travelDefault('trade')).filter(function (d) {
          return FB.tradeVentureCanStart(s, 'accompany', 10, d.destinationId) === true;
        })[0];
        if (!destination) throw new Error('No ordinary trade destination');
        const base = JSON.parse(FB.save.serialize());
        function facts() {
          return JSON.stringify({ home:s.player.provinceId,
            enterprises:s.player.enterprises, labor:s.player.enterpriseLabor, retainers:s.player.retainers,
            residence:[resident.id, wageEarner.id, hire.id, factor.id].map(function (id) {
              return [id, FB.characterResidence(s, s.chars[id])];
            }) });
        }
        function checkpoint() {
          return JSON.stringify({ facts:facts(), gold:s.player.gold, travel:s.player.travel,
            income:FB.livelihoodBreakdown(s), rng:FB.getRngState() >>> 0, uid:FB.getUidCounter() });
        }
        const out = [];
        for (const mode of ['home', 'dispatch', 'accompany']) {
          FB.save.restore(base); s = FB.state;
          const original = facts();
          let started = true;
          if (mode === 'dispatch') started = !!FB.startTradeVenture(s, 10, destination.destinationId, 'cautious');
          if (mode === 'accompany') started = FB.travelStart(s, FB.travelDefault('trade'),
            destination.destinationId, destination.destinationRealm,
            { kind:'trade_venture', stake:10, strategy:'cautious' });
          const yields = FB.enterpriseList(s).map(function (e) { return FB.enterpriseYield(s, e); });
          FB.ui.showTab('network', { history:false }); FB.ui.refresh();
          const roster = document.querySelector('#tab-network').textContent;
          const phases = [];
          if (s.player.travel) {
            for (const phase of ['outbound', 'arrived', 'return']) {
              s.player.travel.phase = phase;
              const box = document.createElement('div');
              box.innerHTML = FB.ui.ongoingCommitmentsHtml(s);
              const work = box.querySelector('[data-travel-household-work]');
              phases.push(!!work && work.textContent.indexOf('Paused while traveling') >= 0 &&
                work.textContent.indexOf(resident.name) >= 0 &&
                work.textContent.indexOf(hire.name) >= 0 &&
                work.textContent.indexOf(factor.name) >= 0 &&
                work.textContent.indexOf('household duty continues') >= 0 &&
                work.textContent.indexOf('Staffing continues') >= 0 &&
                work.querySelectorAll('canvas').length >= 3);
            }
            s.player.travel.phase = 'outbound';
          }
          const beforeFocus = s.player.gold;
          FB.tickFocus(s);
          const focusGain = s.player.gold - beforeFocus;
          const projected = FB.livelihoodBreakdown(s).reduce(function (sum, line) { return sum + line.amount; }, 0);
          const beforeSeason = s.player.gold;
          FB.livelihoodSeason(s); FB.enterpriseLaborSeason(s); FB.retainerSeason(s);
          const seasonalGain = s.player.gold - beforeSeason;
          const saved = checkpoint();
          FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
          out.push({ mode:mode, started:started, yields:yields, focusGain:focusGain,
            seasonalGain:seasonalGain, projected:projected, phases:phases,
            rosterPaused:roster.indexOf('Paused while traveling') >= 0,
            rosterStaffing:roster.indexOf('Staffing continues') >= 0,
            rosterLivelihood:roster.indexOf('household livelihood continues') >= 0,
            rosterHire:roster.indexOf(hire.name) >= 0,
            rosterOffice:roster.indexOf('household duty continues') >= 0,
            preserved:original === facts(), restored:saved === checkpoint() });
          if (mode === 'accompany') {
            const shared = s.player.enterprises[0];
            shared.level = 1;
            shared.workerIds = [me.id, resident.id];
            s.player.enterprises[1].workerId = null;
            const box = document.createElement('div');
            box.innerHTML = FB.ui.ongoingCommitmentsHtml(s);
            const residentRow = Array.from(box.querySelectorAll('.review-person')).filter(function (row) {
              return row.textContent.indexOf(resident.name) >= 0;
            })[0];
            out[out.length - 1].sharedBusiness = !!residentRow &&
              residentRow.textContent.indexOf('Assigned; business inactive') >= 0 &&
              FB.enterpriseOperationalWorkerIds(s, shared).join(',') === resident.id &&
              FB.enterpriseYield(s, shared) === 0;
          }
        }
        return out;
      });
      for (const r of results) {
        expect(r.started).toBe(true);
        expect(r.yields[0]).toBe(r.mode === 'accompany' ? 0 : results[0].yields[0]);
        expect(r.yields[1]).toBeGreaterThan(0);
        expect(r.yields[2]).toBeGreaterThan(0);
        expect(r.yields.slice(1)).toEqual(results[0].yields.slice(1));
        expect(r.focusGain).toBe(r.mode === 'accompany' ? 0 : results[0].focusGain);
        if (r.mode !== 'accompany') expect(r.focusGain).toBeGreaterThan(0);
        expect(r.seasonalGain).toBeCloseTo(r.projected - 3, 8);
        expect(r.phases).toEqual(r.mode === 'accompany' ? [true, true, true] : []);
        expect(r.rosterPaused).toBe(r.mode === 'accompany');
        expect(r.rosterStaffing).toBe(true);
        expect(r.rosterLivelihood).toBe(true);
        expect(r.rosterHire).toBe(true);
        expect(r.rosterOffice).toBe(true);
        expect(r.preserved).toBe(true);
        expect(r.restored).toBe(true);
        if (r.mode === 'accompany') expect(r.sharedBusiness).toBe(true);
      }
      expect(results[2].projected).toBeCloseTo(results[0].projected - results[0].yields[0], 8);
    });
}
