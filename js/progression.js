/* Data-driven station recognition. Quotes read current careers and authority;
   a recognition never manufactures an office, host or private estate. */
(function () {
  'use strict';
  function ruleFor(s, c) { return FB.station.promotion(FB.station.subject(c, s), s); }
  FB.standingProgression = function (s, c) {
    c = c || s.chars[s.player.charId];
    return !!c && FB.station.usesStanding(FB.station.subject(c, s), s);
  };
  function patronStanding(s, c, rid, patron) {
    if (!patron) return 0;
    if (c.id === s.player.charId) return FB.standingOf(s, { kind:'realm', id:patron });
    if (rid && s.realms[rid].liege === patron) return Number(s.realms[rid].favor) || 0;
    /* A resident's civic standing belongs to that person. Unrecorded patron
       relationships start neutral, never at the player's reputation. */
    var rows = s.localInstitutions || {}, key = 'character:' + c.id, best = null;
    for (var id in rows) {
      var def = FB.localInstitutionDefinitions(s)[id];
      if (def && def.provinceId && rows[id] && rows[id].standing &&
          FB.settlementCountyHolder(s, def.provinceId) === patron &&
          Object.prototype.hasOwnProperty.call(rows[id].standing, key)) {
        var value = Number(rows[id].standing[key]) || 0;
        best = best === null ? value : Math.max(best, value);
      }
    }
    return best === null ? 0 : best;
  }
  function facts(s, c) {
    var isPlayer = c.id === s.player.charId, subject = FB.station.subject(c, s);
    var rid = isPlayer && s.realms.player && s.realms.player.alive ? 'player' :
      FB.realmIdForRulerCharacter(s, c.id);
    var patron = isPlayer ? s.player.liege || s.holder[s.player.provinceId] || s.owner[s.player.provinceId] :
      rid && s.realms[rid].liege || s.holder[c.homeProvinceId] || s.owner[c.homeProvinceId];
    if (patron === rid) patron = s.realms[rid] && s.realms[rid].liege || null;
    if (patron && !FB.political.actor(s, { kind:'realm', id:patron })) patron = null;
    var ref = { kind:'character', id:c.id }, career = c.career || {};
    var offices = FB.political.offices(s, ref).filter(function (o) { return o.status === 'active'; });
    var recognitions = FB.political.legitimacy(s, ref);
    return { charId:c.id, tier:subject.tier, context:FB.station.context(subject, s),
      age:FB.ageOf(c, s.date.year), dead:!!c.dead,
      gold:Number(isPlayer ? s.player.gold : rid ? FB.treasuryAvailable(s, rid) : c.gold) || 0,
      prestige:Number(isPlayer ? s.player.prestige : rid ? s.realms[rid].stationPrestige : c.prestige) || 0,
      piety:Number(isPlayer ? s.player.piety : c.piety) || 0,
      travel:isPlayer && !!s.player.travel,
      profession:career.profession || null, years:Number(career.experience) || 0,
      offices:offices.map(function (o) { return o.ref.appointmentId || o.ref.officeId; }).sort(),
      sources:recognitions.map(function (r) { return r.source; }).sort(),
      recognitionIds:recognitions.map(function (r) { return r.id; }).sort(),
      counties:rid ? FB.realmHeldCounties(s, rid).slice().sort() : [],
      sovereign:!!rid && (isPlayer ? FB.isPlayerSovereign(s) : !s.realms[rid].liege),
      patron:patron || null,
      standing:patronStanding(s, c, rid, patron),
      patronGeneration:patron ? FB.realmRulerGeneration(s, patron) : null };
  }
  function meets(f, path) {
    return (path.wealth === undefined || f.gold >= path.wealth) &&
      (path.prestige === undefined || f.prestige >= path.prestige) &&
      (path.years === undefined || f.years >= path.years) &&
      (!path.roles || FB.professionHasRole(f.profession, path.roles)) &&
      (!path.office || f.offices.length > 0) &&
      (!path.source || f.sources.indexOf(path.source) >= 0) &&
      (path.counties === undefined || f.counties.length >= path.counties) &&
      (!path.sovereign || f.sovereign) &&
      (path.standing === undefined || !!f.patron && f.standing >= path.standing || f.sovereign);
  }
  function pathText(path) {
    var rows = [];
    if (path.wealth !== undefined) rows.push(FB.T('Savings of {money:amount}', { amount:path.wealth }));
    if (path.prestige !== undefined) rows.push(FB.T('{amount} prestige', { amount:path.prestige }));
    if (path.years !== undefined) rows.push(FB.T('{years} completed years in qualifying work', { years:path.years }));
    if (path.roles) rows.push(FB.T('Qualifying work: {roles}', { roles:path.roles.map(function (role) {
      var names = { civic:FB.T('civic service'), arms:FB.T('military service'), clergy:FB.T('clerical service'),
        labor:FB.T('agriculture'), craft:FB.T('craft'), trading:FB.T('trade'), cloister:FB.T('monastic service'),
        learned:FB.T('learned work'), noble:FB.T('estate service') };
      return names[role];
    }).join(', ') }));
    if (path.office) rows.push(FB.T('An effective personal appointment'));
    if (path.source) {
      var sources = { army_acclamation:FB.T('Live army acclamation'), imperial_commission:FB.T('Live imperial commission'),
        civic_acceptance:FB.T('Live civic acceptance'), church_support:FB.T('Live church support'), dynastic_succession:FB.T('Dynastic recognition') };
      rows.push(sources[path.source]);
    }
    if (path.counties !== undefined) rows.push(FB.T('{amount} directly held counties', { amount:path.counties }));
    if (path.sovereign) rows.push(FB.T('Sovereignty'));
    if (path.standing !== undefined) rows.push(FB.T('{amount} Standing with a living patron, or sovereignty', { amount:path.standing }));
    return rows.join(' · ');
  }
  FB.standingElevationStatus = function (s, c, countyId, prospectiveOffice) {
    c = c || s.chars[s.player.charId];
    var rule = c && ruleFor(s, c);
    if (!rule || rule.route !== 'standing') return null;
    var f = facts(s, c);
    /* An appointment review can preview its promised office without creating
       it. This stamp cannot confirm until a fresh real-office quote exists. */
    if (prospectiveOffice) f.offices.push('prospective');
    var isPlayer = c.id === s.player.charId, candidates = rule.countyGrant && isPlayer ? FB.countyGrantCandidates(s) : [];
    var site = candidates.filter(function (q) {
      return (!countyId || q.provinceId === countyId) && !!FB.political.actor(s, { kind:'realm', id:q.grantorId });
    })[0] || null;
    var qualified = rule.paths.some(function (path) { return meets(f, path); });
    var reason = f.dead ? FB.T('A living candidate is required.') :
      f.age < 16 ? FB.T('Come of age before seeking recognition.') :
      f.travel ? FB.T('Return home before seeking recognition at a new rank.') :
      !qualified ? FB.T('Meet every requirement in at least one recognition route.') :
      rule.countyGrant && !site ? FB.T('A living ruler must have an eligible county to invest. Their seat and last county remain protected.') : '';
    var cost = rule.cost, eligible = !reason;
    if (!reason && (f.gold < cost.gold || f.prestige < cost.prestige || f.piety < cost.piety))
      reason = FB.T('You cannot yet pay the displayed recognition cost.');
    var title = FB.rankTitleSnapshot(s, rule.next, site && FB.world.byId[site.provinceId].name || null);
    var quoteFacts = { candidate:f, rule:rule, site:site,
      siteHolder:site && FB.settlementCountyHolder(s, site.provinceId),
      grantorGeneration:site && FB.realmRulerGeneration(s, site.grantorId) };
    return { visible:true, eligible:eligible, ready:eligible && !reason, reason:reason,
      route:'standing', fromTier:f.tier, targetTier:rule.next, region:null,
      formId:f.context.formId,
      titleData:title, cost:cost,
      site:site && { provinceId:site.provinceId, settlement:0 },
      grantorId:site && site.grantorId || null, liegeId:isPlayer ? s.player.liege || null : f.patron,
      requirements:rule.paths.map(pathText), stamp:JSON.stringify(quoteFacts) };
  };
  /* Non-player candidates use the identical rules and personal resources.
     Territorial acquisition remains with ordinary grants, war and succession. */
  FB.advanceNPCStanding = function (s, c) {
    if (!c || c.id === s.player.charId) return false;
    var q = FB.standingElevationStatus(s, c);
    if (!q || !q.ready || ruleFor(s, c).countyGrant || FB.realmIdForRulerCharacter(s, c.id)) return false;
    c.gold = (Number(c.gold) || 0) - q.cost.gold;
    c.prestige = (Number(c.prestige) || 0) - q.cost.prestige;
    c.piety = (Number(c.piety) || 0) - q.cost.piety;
    c.station = FB.station.socialClass({ tier:q.targetTier, formId:FB.station.context(c, s).formId }, s);
    return true;
  };
  /* AI rulers earn the same rank prestige as the household and spend their
     own treasury. One bounded yearly pass, never an automatic de jure award. */
  FB.realmStandingYearly = function (s) {
    Object.keys(s.realms).sort().forEach(function (rid) {
      var r = s.realms[rid];
      if (rid === 'player' || !r.alive || r.stationStandingYear === s.date.year) return;
      var subject = { tier:FB.realmRank.tier(r, s), formId:FB.station.context(r, s).formId };
      if (!FB.station.usesStanding(subject, s)) return;
      r.stationStandingYear = s.date.year;
      r.stationPrestige = Math.max(0, Number(r.stationPrestige) || 0) +
        (Number(FBDATA.rankPrestigeYearly.ruling[subject.tier]) || 0);
      var c = FB.realmRulerCharacterSnapshot(s, rid);
      if (!c) return;
      var q = FB.standingElevationStatus(s, c);
      if (!q || !q.ready || ruleFor(s, c).countyGrant || !FB.treasurySpend(s, rid, q.cost.gold)) return;
      r.stationPrestige -= q.cost.prestige;
      if (q.cost.piety) c.piety -= q.cost.piety;
      r.rank = FB.station.realmRank({ tier:q.targetTier, formId:subject.formId }, s);
      /* A newly recognized period office has no invented de jure title. */
      delete r.titleKind;
      delete r.titleId;
      if (FB.noteLifeAccession) FB.noteLifeAccession(s, c, FB.realmRulerTitleSnapshot(s, r, c));
      FB.invalidateRealmCache();
      FB.news(s, FB.msg('news.realm.station_recognized',
        '🏛 {ruler} receives recognition at a higher station in {realm}.',
        { ruler:c.name, realm:FB.realmNameParam(s, r) }));
    });
  };
})();
