'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/map_data.js', 'data/counties.js', 'data/bookmarks.js',
  'data/bookmark_476.js', 'data/settlements.js',
  'data/settlements_real.js', 'data/cultures.js', 'data/starts.js',
  'data/technology.js', 'data/political_institutions.js', 'data/units.js',
  'data/economy.js',
  'js/main.js', 'js/situation476.js', 'js/authority.js', 'js/world.js',
  'js/holywar.js', 'js/actions.js',
  'js/armies.js', 'js/treasury.js', 'js/lordships.js', 'js/model.js',
  'js/politics.js', 'js/technology.js', 'js/settlement.js',
  'js/population.js', 'js/wars.js',
  'js/i18n.js', 'js/portrait.js', 'js/ui_panels.js', 'js/ui_misc.js',
  'js/ui_modals.js', 'js/save.js', 'js/save_v4.js',
  'js/governments.js', 'data/eras.js',
  'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

async function start476(page, testInfo) {
  await openGame(page, testInfo);
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(
    'RAVENNA476-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await page.locator('[data-tab="actions"]').click();
  await expect(page.locator('#deeds-476-situation')).toBeVisible();
}

async function choose(page, id) {
  await page.locator('#deeds-476-situation').click();
  await page.locator('[data-476-choice="' + id + '"]').click();
  await expect(page.locator('#gm-476-confirm')).toBeVisible();
  await page.locator('#gm-476-confirm').click();
  await page.locator('#gm-476-continue').click();
}

test('476 bookmark and free federate start preserve 867 and 1066 data',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, sc = s.situation476;
      const inhabited = FB.bookmark('476').provinces.filter(function (p) {
        return !p.wasteland;
      });
      const before = JSON.stringify(s), rng = FB.getRngState();
      const quote = FB.situation476Quote(s, 'accept_delegate');
      const ordinary = FB.bookmark('867');
      const brokenSacred = Object.assign({}, ordinary, {
        provinces:ordinary.provinces.map(function (province) {
          return province.id === 'jerusalem'
            ? Object.assign({}, province, { wasteland:true }) : province;
        })
      });
      return {
        errors:FB.validateBookmark(FB.bookmark('476')),
        greatHolyWarsEnabled:FB.greatHolyWarsEnabled(s),
        olderHolyWarsEnabled:['867','1066'].every(function (id) {
          return FB.greatHolyWarsEnabled({ start:{ id:id } });
        }),
        rejectsActiveSacredTarget:FB.validateBookmark(brokenSacred).some(function (error) {
          return error.indexOf('faith catholic greatHolyWar has invalid sacred county ' +
            'jerusalem for syria') >= 0;
        }),
        older:['867','1066'].map(function (id) {
          return FB.validateBookmark(FB.bookmark(id));
        }),
        noIslam:inhabited.every(function (p) {
          return p.religion !== 'sunni' && p.religion !== 'shia' &&
            FB.provinceCommunities(p).every(function (c) {
              return c.religion !== 'sunni' && c.religion !== 'shia';
            });
        }),
        sites:FB.world.sitesByProv.ravenna.list.map(function (site) {
          return site.site;
        }),
        age:FB.ageOf(s.chars[s.player.charId], s.date.year),
        station:s.player.tier, gold:s.player.gold, land:s.player.provs.length,
        role:sc.role, sitting:FB.realmRulerCharacterSnapshot(s, 'byzantium').name,
        claimant:s.chars[sc.zenoId].name,
        periodCareer:FB.careerTitle(s, s.chars[s.player.charId]),
        periodRank:FB.rankTitleSnapshot(s, 1).word,
        periodTroops:FB.dataText(s, s.player.charId, 'unitClass',
          'ret', FBDATA.unitClasses.ret, 'name', {}),
        periodHolding:FB.dataText(s, s.player.charId, 'holding',
          'good_mail', FBDATA.holdings.good_mail, 'name', {}),
        quotePure:before === JSON.stringify(s) && rng === FB.getRngState(),
        quoted:quote.allowed,
        techReview:FB.validateTechnologyData()
      };
    });
    expect(result.errors).toEqual([]);
    expect(result.greatHolyWarsEnabled).toBe(false);
    expect(result.olderHolyWarsEnabled).toBe(true);
    expect(result.rejectsActiveSacredTarget).toBe(true);
    expect(result.older).toEqual([[], []]);
    expect(result.noIslam).toBe(true);
    expect(result.sites).toEqual(['ravenna_476', 'classis_476']);
    expect(result.age).toBe(24);
    expect(result.station).toBe(1);
    expect(result.gold).toBe(20);
    expect(result.land).toBe(0);
    expect(result.role).toBe('ordinary');
    expect(result.sitting).toBe('Basiliscus');
    expect(result.claimant).toBe('Zeno');
    expect(result.periodCareer).toContain('Federate');
    expect(result.periodRank).toBe('Free Citizen');
    expect(result.periodTroops).toBe('Household soldiers');
    expect(result.periodHolding).toBe('Mail shirt');
    expect(result.quotePure).toBe(true);
    expect(result.quoted).toBe(true);
    expect(result.techReview).toEqual([]);
  });

test('476 does not unlock great holy wars in later years',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, rng = FB.getRngState();
      s.date.year = 1200;
      const targets = FB.greatHolyWarTargets(s, 'catholic');
      FB.greatHolyWarYearly(s);
      FB.greatHolyWarTick(s);
      return { targets:targets, call:FB.canCallGreatHolyWar(s, 'catholic'),
        campaign:s.greatHolyWar, rngUnchanged:rng === FB.getRngState() };
    });
    expect(result).toEqual({ targets:[], call:false, campaign:null,
      rngUnchanged:true });
  });

test('invalid bookmark dialog has one Close action',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await page.evaluate(function () {
      FBDATA.bookmarks['476'].realms[0].capital = 'missing_476';
    });
    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill(
      'RAVENNA476-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#gm-title')).toHaveText('Bookmark unavailable');
    await expect(page.locator('#gm-body').getByRole('button',
      { name:'Close', exact:true })).toHaveCount(1);
    await page.locator('#gm-body').getByRole('button',
      { name:'Close', exact:true }).click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  });

test('negotiation uses scoped command, treasury, civic consent and saved contract',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    await choose(page, 'accept_delegate');
    await choose(page, 'seek_commission');
    await choose(page, 'offer_pay');
    await choose(page, 'seek_mediation');
    await choose(page, 'present_civic');
    await choose(page, 'uphold_nepos');
    await choose(page, 'escort_court');
    const beforeArrival = await page.evaluate(function () {
      const s = FB.state, sc = s.situation476;
      return {
        phase:sc.phase, court:sc.courtAt, owner:s.owner.ravenna,
        command:FB.political.permission(s,
          { kind:'character', id:s.player.charId }, 'command_host',
          { hostId:'host_476_federates' }).allowed,
        peace:FB.political.permission(s,
          { kind:'character', id:s.player.charId }, 'judge',
          { provinceId:'ravenna' }).allowed,
        westernGold:FB.treasuryAvailable(s, 'italy'),
        bodyGold:FB.treasuryAvailable(s, 'federates_476')
      };
    });
    expect(beforeArrival).toEqual({ phase:'court', court:'ravenna',
      owner:'italy', command:true, peace:false,
      westernGold:90, bodyGold:30 });
    const arrived = await page.evaluate(function () {
      for (let n = 0; n < 75 && FB.state.situation476.courtAt !== 'pavia'; n++) {
        FB.state.turn++;
        FB.armyTick(FB.state);
        FB.situation476Day(FB.state);
      }
      FB.ui.refresh();
      return { court:FB.state.situation476.courtAt,
        capital:FB.state.realms.italy.capital };
    });
    expect(arrived).toEqual({ court:'pavia', capital:'pavia' });
    await choose(page, 'court_maintenance');
    await choose(page, 'request_classis');
    await choose(page, 'move_to_ratification');
    await choose(page, 'ratify');
    const result = await page.evaluate(function () {
      const s = FB.state, sc = s.situation476;
      const row = FB.political.contract(s, sc.contractId);
      const saved = JSON.parse(FB.save.serialize());
      const owner = s.owner.ravenna;
      FB.save.restore(saved);
      const authority = JSON.stringify(FB.state.authority);
      FB.save.restore(saved);
      return {
        format:saved.v, stableAuthority:authority === JSON.stringify(FB.state.authority),
        phase:sc.phase, result:sc.result, owner:owner,
        westOffice:FB.state.authority.appointments.some(function (a) {
          return a.id === sc.westOfficeId && a.status === 'active';
        }),
        award:row.settlementAwards[0].fulfilled,
        veteran:FB.settlementHolder(FB.state, 'ravenna', 1),
        veteranId:sc.veteranId,
        veteranHome:FB.state.chars[sc.veteranId].homeProvinceId,
        migration:sc.veteranMigration && sc.veteranMigration.settlement,
        civicRights:(sc.cityRightIds || []).length,
        restored:FB.state.situation476.result,
        communities:FB.countyCultureShare(FB.state, 'ravenna', 'roman')
      };
    });
    expect(result.phase).toBe('complete');
    expect(result.format).toBe(4);
    expect(result.stableAuthority).toBe(true);
    expect(result.result).toBe('negotiated');
    expect(result.owner).toBe('italy');
    expect(result.westOffice).toBe(true);
    expect(result.award).toBe(true);
    expect(result.veteran).toEqual({ kind:'character', id:result.veteranId });
    expect(result.restored).toBe('negotiated');
    expect(result.veteranHome).toBe('ravenna');
    expect(result.migration).toBe(1);
    expect(result.civicRights).toBe(2);
    expect(result.communities).toBeGreaterThan(0.5);
  });

test('contest waits for a real host result and does not erase communities',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    await choose(page, 'accept_delegate');
    await choose(page, 'back_odoacer');
    await choose(page, 'refuse_pay');
    await choose(page, 'demand_force');
    const result = await page.evaluate(function () {
      const s = FB.state, sc = s.situation476;
      const before = s.owner.ravenna;
      FB.situation476Day(s);
      const noInstantConquest = s.owner.ravenna === before;
      const federates = s.armies.filter(function (a) {
        return a.id === 'host_476_federates';
      })[0];
      const italian = s.armies.filter(function (a) {
        return a.id === 'host_476_italy';
      })[0];
      federates.at = 'ravenna'; federates.moveLeft = 0;
      italian.men = 0;
      FB.situation476Day(s);
      return { noInstantConquest:noInstantConquest,
        owner:s.owner.ravenna, result:sc.result, deposed:sc.romulusDeposed,
        communities:FB.countyCultureShare(s, 'ravenna', 'roman'),
        household:s.player.tier };
    });
    expect(result.noInstantConquest).toBe(true);
    expect(result.owner).toBe('federates_476');
    expect(result.result).toBe('contested_victory');
    expect(result.deposed).toBe(true);
    expect(result.communities).toBeGreaterThan(0.5);
    expect(result.household).toBe(1);
  });

test('Zeno return depends on living rulers and invalidates Basiliscus recognition',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    await choose(page, 'accept_delegate');
    await choose(page, 'back_odoacer');
    await choose(page, 'offer_pay');
    await choose(page, 'seek_mediation');
    await choose(page, 'present_civic');
    await choose(page, 'petition_basiliscus');
    const result = await page.evaluate(function () {
      const s = FB.state, sc = s.situation476;
      const old = sc.imperialRecognitionId;
      s.turn = 180;
      FB.situation476Day(s);
      return { return:sc.easternReturn,
        ruler:FB.realmRulerCharacterSnapshot(s, 'byzantium').name,
        oldEffective:FB.political.legitimacy(s,
          { kind:'realm', id:'federates_476' },
          { kind:'realm', id:'federates_476' }, 'imperial_commission')
          .some(function (r) { return r.id === old; }) };
    });
    expect(result).toEqual({ return:'restored', ruler:'Zeno', oldEffective:false });
  });


test('backed Zeno issues a commission only after returning to office',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    await choose(page, 'remain_service');
    await choose(page, 'keep_serving');
    await choose(page, 'offer_pay');
    await choose(page, 'seek_mediation');
    await choose(page, 'present_civic');
    await choose(page, 'back_zeno');
    const result = await page.evaluate(function () {
      const s = FB.state, sc = s.situation476;
      s.turn = 150;
      FB.situation476Day(s);
      const recognized = sc.imperialRecognitionId &&
        FB.political.legitimacy(s, { kind:'realm', id:'federates_476' },
          { kind:'realm', id:'federates_476' }, 'imperial_commission')
          .some(function (row) { return row.id === sc.imperialRecognitionId; });
      return { return:sc.easternReturn, ruler:
        FB.realmRulerCharacterSnapshot(s, 'byzantium').name,
        recognized:recognized };
    });
    expect(result).toEqual({ return:'restored', ruler:'Zeno', recognized:true });
  });


test('seasonal service share is paid from the body exactly once across v4 restore',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    await choose(page, 'remain_service');
    await choose(page, 'keep_serving');
    await choose(page, 'offer_pay');
    const result = await page.evaluate(function () {
      const s = FB.state, sc = s.situation476;
      s.turn = 90;
      FB.authoritySeason(s);
      FB.situation476Season(s);
      const first = { household:s.player.gold,
        body:FB.treasuryAvailable(s, 'federates_476'),
        period:sc.lastAllocatedPeriod };
      FB.save.restore(FB.save.parseExport(FB.save.exportState()));
      FB.authoritySeason(FB.state);
      FB.situation476Season(FB.state);
      return { first:first,
        household:FB.state.player.gold,
        body:FB.treasuryAvailable(FB.state, 'federates_476') };
    });
    expect(result).toEqual({ first:{ household:22, body:38, period:1 },
      household:22, body:38 });
  });


test('476 regional assignments and dress stay local to the bookmark',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, b = FB.bookmark('476');
      const byId = function (id) {
        return b.provinces.filter(function (p) { return p.id === id; })[0];
      };
      const look = FB.characterLook(s.chars[s.player.charId], 476, s);
      const court = FB.realmRulerCharacterSnapshot(s, 'italy');
      const high = FB.characterLook(court, 476, s, { tier:7 });
      const me = s.chars[s.player.charId];
      const laterStart = Object.assign({}, s, { start:{ id:'867' } });
      return { errors:FB.validateBookmark(b),
        civicCareer476:FB.careerChoices(s, me).some(function (row) {
          return row.id === 'civic_clerk';
        }),
        civicCareer867:FB.careerChoices(laterStart, me).some(function (row) {
          return row.id === 'civic_clerk';
        }),
        directCareer867:FB.setCareer(laterStart, Object.assign({}, me),
          'civic_clerk'),
        barcelona:byId('barcelona').realm,
        coruna:byId('coruna').realm,
        rennes:byId('rennes').realm,
        constantine:byId('constantine').realm,
        pliska:byId('pliska').realm,
        faith:byId('coruna').communities.map(function (c) {
          return c.religion;
        }),
        dress:[look.period476, look.cloth.kind, high.cloth.kind],
        frankHeir:s.realms.franks_476.succession.members[
          s.realms.franks_476.succession.heirId].charId ===
          s.situation476.clovisId,
        strait:b.straits.some(function (pair) {
          return pair[0] === 'siracusa' && pair[1] === 'tunis';
        }),
        older:[FB.bookmark('867').provinces.filter(function (p) {
          return p.id === 'barcelona';
        })[0].realm, FB.bookmark('1066').provinces.filter(function (p) {
          return p.id === 'barcelona';
        })[0].realm]
      };
    });
    expect(result.errors).toEqual([]);
    expect(result.civicCareer476).toBe(true);
    expect(result.civicCareer867).toBe(false);
    expect(result.directCareer867).toBe(false);
    expect(result.barcelona).toBe('aquitaine');
    expect(result.coruna).toBe('suebi_476');
    expect(result.rennes).toBe('armorica_476');
    expect(result.constantine).toBe('mauri_476');
    expect(result.pliska).toBe('byzantium');
    expect(result.faith).toEqual(['nicene','homoian']);
    expect(result.dress).toEqual([true,'lateTunic','lateMantle']);
    expect(result.strait).toBe(true);
    expect(result.frankHeir).toBe(true);
    expect(result.older[0]).toBe('west_francia');
  });

test('civic service grants a scoped court appointment without land or revenue',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    await choose(page, 'seek_city_service');
    await choose(page, 'petition_city_office');
    const result = await page.evaluate(function () {
      const s = FB.state, sc = s.situation476;
      const who = { kind:'character', id:s.player.charId };
      return { phase:sc.phase, result:sc.result,
        career:FB.careerOf(s, s.chars[s.player.charId]).profession,
        peace:FB.political.permission(s, who, 'judge',
          { provinceId:'ravenna' }).allowed,
        revenue:FB.political.permission(s, who, 'collect_revenue',
          { provinceId:'ravenna' }).allowed,
        owner:s.owner.ravenna, land:s.player.provs.length,
        office:sc.cityOfficeId };
    });
    expect(result.phase).toBe('complete');
    expect(result.result).toBe('civic_office');
    expect(result.career).toBe('civic_clerk');
    expect(result.peace).toBe(true);
    expect(result.revenue).toBe(false);
    expect(result.owner).toBe('italy');
    expect(result.land).toBe(0);
    expect(result.office).toBeTruthy();
  });

test('clerical mediation uses a late antique path and leaves faiths intact',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    const otherFaithBlocked = await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId];
      me.religion = 'nicene';
      const blocked = !FB.situation476Quote(s, 'seek_church_service').allowed;
      me.religion = 'homoian';
      return blocked;
    });
    expect(otherFaithBlocked).toBe(true);
    await choose(page, 'seek_church_service');
    await choose(page, 'seek_homoian_commission');
    await choose(page, 'mediate_communities');
    const result = await page.evaluate(function () {
      const s = FB.state, sc = s.situation476;
      const me = s.chars[s.player.charId];
      return { phase:sc.phase, career:FB.careerOf(s, me).profession,
        path:FB.religiousPathOf(s, me).id, faith:me.religion,
        local:FB.countyReligionShare(s, 'ravenna', 'nicene'),
        recognition:!!sc.interfaithRecognitionId,
        owner:s.owner.ravenna };
    });
    expect(result.phase).toBe('civic_service');
    expect(result.career).toBe('priest');
    expect(result.path).toBe('late_antique_clerical');
    expect(result.faith).toBe('homoian');
    expect(result.local).toBeGreaterThan(0.5);
    expect(result.recognition).toBe(true);
    expect(result.owner).toBe('italy');
  });

test('later campaigns register ordinary wars only with their living political predicates',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, sc = s.situation476;
      s.date.year = 486;
      FB.situation476Day(s);
      const noForcedClovis = !FB.ordinaryWarBetween(s,
        'franks_476', 'west_francia');
      FB.advanceRealmSuccession(s, 'franks_476');
      const clovisInherited = FB.realmRulerCharacterSnapshot(s,
        'franks_476').id === sc.clovisId;
      FB.situation476Day(s);
      const frankWar = FB.ordinaryWarBetween(s,
        'franks_476', 'west_francia');
      s.turn = 180; s.date.year = 489;
      FB.situation476Day(s);
      const gothicWar = FB.ordinaryWarBetween(s,
        'pannonia', s.owner.ravenna);
      const saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      return { noForcedClovis:noForcedClovis,
        clovisInherited:clovisInherited,
        frankTarget:frankWar && frankWar.objectives[0].target,
        gothicTarget:gothicWar && gothicWar.objectives[0].target,
        frankStatus:FB.state.situation476.historical.clovis,
        gothicStatus:FB.state.situation476.historical.theoderic };
    });
    expect(result).toEqual({ noForcedClovis:true, clovisInherited:true,
      frankTarget:'paris',
      gothicTarget:'ravenna', frankStatus:'started', gothicStatus:'started' });
  });

test('reconquest targets current owners and never awards a county at declaration',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state;
      s.date.year = 533;
      const before = s.owner.tunis;
      FB.situation476Day(s);
      const war = FB.ordinaryWarBetween(s, 'byzantium', before);
      return { before:before, after:s.owner.tunis,
        target:war && war.objectives[0].target,
        status:s.situation476.historical.africa };
    });
    expect(result).toEqual({ before:'aghlabids', after:'aghlabids',
      target:'tunis', status:'started' });
  });


test('declining involvement leaves AI courts bound by pay and city rights',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    await choose(page, 'refuse_involvement');
    const result = await page.evaluate(function () {
      const s = FB.state, sc = s.situation476;
      s.turn = 90;
      FB.situation476Day(s);
      const gold = s.player.gold;
      FB.authoritySeason(s);
      FB.situation476Season(s);
      return { phase:sc.phase, result:sc.result,
        ai:sc.aiResolution, contract:FB.political.contract(s, sc.contractId).status,
        westernGold:FB.treasuryAvailable(s, 'italy'),
        rights:(sc.cityRightIds || []).length,
        householdBefore:gold, householdAfter:s.player.gold };
    });
    expect(result.phase).toBe('complete');
    expect(result.result).toBe('ai_negotiated');
    expect(result.ai).toBe('negotiated');
    expect(result.contract).toBe('active');
    expect(result.westernGold).toBe(90);
    expect(result.rights).toBe(2);
    expect(result.householdAfter).toBe(result.householdBefore);
  });


test('succession reopens stale service terms without trapping the household',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    await choose(page, 'remain_service');
    await choose(page, 'keep_serving');
    await choose(page, 'offer_pay');
    const result = await page.evaluate(function () {
      const s = FB.state, sc = s.situation476;
      const old = sc.contractId;
      FB.assignRealmRulerCharacter(s, 'italy', sc.senatorId,
        { replaceAuthored:true });
      s.turn++;
      FB.situation476Day(s);
      return { phase:sc.phase, oldEffective:FB.political.contract(s, old).effective,
        escape:FB.situation476Quote(s, 'leave_dispute').allowed };
    });
    expect(result).toEqual({ phase:'contract', oldEffective:false,
      escape:true });
  });

test('loss of Ravenna moves a surviving court and records exile on extinction',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    await choose(page, 'remain_service');
    await choose(page, 'keep_serving');
    const result = await page.evaluate(function () {
      const s = FB.state, sc = s.situation476;
      FB.transferProvince(s, 'ravenna', 'pannonia');
      FB.situation476Day(s);
      const displaced = { court:sc.courtAt, capital:s.realms.italy.capital,
        owner:s.owner[s.realms.italy.capital],
        escape:FB.situation476Quote(s, 'leave_dispute').allowed };
      s.realms.italy.alive = false;
      FB.situation476Day(s);
      return { displaced:displaced, exile:sc.displacedCourts.italy,
        court:sc.courtAt };
    });
    expect(result.displaced.court).toBe('displaced');
    expect(result.displaced.capital).not.toBe('ravenna');
    expect(result.displaced.owner).toBe('italy');
    expect(result.displaced.escape).toBe(true);
    expect(result.exile).toBe('exiled');
    expect(result.court).toBe('displaced');
  });

test('a federate victory can preserve civic Peace and acknowledge Nepos',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    await choose(page, 'accept_delegate');
    await choose(page, 'back_odoacer');
    await choose(page, 'refuse_pay');
    await choose(page, 'demand_force');
    await page.evaluate(function () {
      const s = FB.state;
      const federates = s.armies.filter(function (a) {
        return a.id === 'host_476_federates';
      })[0];
      const italian = s.armies.filter(function (a) {
        return a.id === 'host_476_italy';
      })[0];
      federates.at = 'ravenna'; federates.moveLeft = 0;
      italian.men = 0;
      FB.situation476Day(s);
      FB.ui.refresh();
    });
    await choose(page, 'accept_aftermath');
    await choose(page, 'adopt_civic_rule');
    await choose(page, 'recognize_nepos_west');
    const result = await page.evaluate(function () {
      const s = FB.state, sc = s.situation476;
      return { owner:s.owner.ravenna, governance:sc.governanceResolved,
        government:FB.political.government(s,
          { kind:'realm', id:'federates_476' }).formId,
        rights:(sc.cityRightIds || []).length,
        office:sc.westernOfficeResolved,
        holder:s.authority.appointments.filter(function (a) {
          return a.id === sc.westOfficeId;
        })[0].holder.id, nepos:sc.neposId };
    });
    expect(result.owner).toBe('federates_476');
    expect(result.governance).toBe('civic');
    expect(result.government).toBe('roman_civic');
    expect(result.rights).toBe(2);
    expect(result.office).toBe('nepos');
    expect(result.holder).toBe(result.nepos);
  });

test('AI contest begins through an ordinary war if no pay is available',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    await choose(page, 'refuse_involvement');
    const result = await page.evaluate(function () {
      const s = FB.state;
      s.realms.italy.treasury.gold = 0;
      s.turn = 90;
      FB.situation476Day(s);
      const war = FB.ordinaryWarBetween(s, 'federates_476', 'italy');
      return { status:s.situation476.aiResolution,
        target:war && war.objectives[0].target,
        owner:s.owner.ravenna };
    });
    expect(result).toEqual({ status:'war', target:'ravenna', owner:'italy' });
  });


test('western office can be restored after Ravenna returns from a rival claim',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    await choose(page, 'accept_delegate');
    await choose(page, 'back_odoacer');
    await choose(page, 'refuse_pay');
    await choose(page, 'demand_force');
    await page.evaluate(function () {
      const s = FB.state;
      const federates = s.armies.filter(function (a) {
        return a.id === 'host_476_federates';
      })[0];
      const italian = s.armies.filter(function (a) {
        return a.id === 'host_476_italy';
      })[0];
      federates.at = 'ravenna'; federates.moveLeft = 0;
      italian.men = 0;
      FB.situation476Day(s);
      FB.ui.refresh();
    });
    await choose(page, 'accept_aftermath');
    await choose(page, 'recognize_nepos_west');
    const result = await page.evaluate(function () {
      const s = FB.state, sc = s.situation476;
      const formerOffice = sc.westOfficeId;
      const before = FB.situation476Quote(s, 'restore_western_office').allowed;
      FB.transferProvince(s, 'ravenna', 'italy');
      const review = FB.situation476Quote(s, 'restore_western_office');
      const applied = FB.situation476Apply(s, 'restore_western_office', review);
      return { before:before, reviewed:review.allowed, applied:applied,
        outcome:sc.westernOfficeResolved, owner:s.owner.ravenna,
        former:s.authority.appointments.filter(function (row) {
          return row.id === formerOffice;
        })[0].status };
    });
    expect(result).toEqual({ before:false, reviewed:true, applied:true,
      outcome:'restored', owner:'italy', former:'removed' });
  });
