/* Pure activity proposals over canonical travel, institution property and projects. */
(function () {
  'use strict';
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function plain(v) { return !!v && Object.prototype.toString.call(v) === '[object Object]'; }
  function number(v) { return typeof v === 'number' && isFinite(v) && v >= 0; }
  function ident(v) { return typeof v === 'string' && /^[a-z][a-z0-9_]{0,79}$/.test(v); }
  function keys(v, allowed) { return plain(v) && Object.keys(v).every(function (k) { return allowed.indexOf(k) >= 0; }); }
  function list(v) { return Array.isArray(v) && v.length <= 32 && v.every(ident); }
  function live(s, d) {
    return d.period.yearMin <= s.date.year && (d.period.yearMax === null || s.date.year <= d.period.yearMax) &&
      (!d.openings.length || d.openings.some(function (o) { return o.id === s.start.id && o.revision === (s.start.revision || 'baseline'); }));
  }
  function at(s, cid) {
    return cid === s.player.charId ? (s.player.travel ? s.player.travel.currentId : s.player.provinceId) : FB.characterResidence(s, s.chars[cid]);
  }
  function available(s, c) {
    return c && !c.dead && (c.health === undefined || c.health > 0) && FB.ageOf(c, s.date.year) >= 16 &&
      !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s, c.id)) &&
      !(FB.justiceCustodyOf && FB.justiceCustodyOf(s, c.id)) &&
      !(s.justice && s.justice.exiles && s.justice.exiles[c.id] && s.justice.exiles[c.id].endTurn > s.turn) &&
      (c.id !== s.player.charId || !(s.player.flags && s.player.flags.in_prison) && !FB.atWarPersonally(s));
  }
  function house(s, iid) {
    var d = FB.localInstitutionDefinitions(s)[iid];
    return d && (s.abbeys && s.abbeys.houses || []).filter(function (h) { return h.id === d.abbeyId; })[0] || null;
  }
  function participant(s, d, cid) {
    var c = s.chars[cid], ins = d.institutionId && FB.religiousInstitutionSnapshot(s, d.institutionId);
    if (!available(s, c) || !live(s, d) || d.faithIds.length && d.faithIds.indexOf(c.religion) < 0 ||
        !d.affiliationIds.every(function (aid) { return (c.religiousAffiliations || []).some(function (a) {
          return a.id === aid && (!d.institutionId || a.institutionId === d.institutionId);
        }); })) return false;
    /* The legacy protection projection repairs modifier rows; isolate that read. */
    if (d.institutionId && (!ins || !ins.available || !FB.political.worshipProtected(copy(s), at(s, cid)))) return false;
    if (d.roleIds.length && (!ins || !ins.members[cid] || ins.members[cid].status !== 'active' ||
        d.roleIds.indexOf(ins.members[cid].roleId) < 0 ||
        !FB.religiousInstitutionRoleEligibility(s, d.institutionId, cid, ins.members[cid].roleId))) return false;
    return !d.institutionId || ins.definition.provinceId === at(s, cid) ||
      ins.definition.offMap && ins.definition.jurisdictionIds.indexOf(at(s, cid)) >= 0;
  }
  function payer(s, cid, kind) {
    if (kind === 'household') return cid === s.player.charId ? { kind:kind, id:cid, funds:s.player.gold } : null;
    var rid = FB.treasuryCharacterRealm(s, cid);
    return rid && rid !== 'player' && FB.treasuryCounterparty(s, rid) ?
      { kind:kind, id:rid, funds:FB.treasuryAvailable(s, rid) } : null;
  }
  function pay(s, p, cost) {
    if (!p || p.funds < cost) return false;
    if (p.kind === 'household') { s.player.gold -= cost; return true; }
    return FB.treasuryTransfer(s, p.id, null, cost);
  }
  function earned(c, d, s) {
    var r = c.religiousActivityHistory || {}, legacy = d.legacy;
    return !!r[d.milestone] || !!(legacy && ((legacy.trait && (c.traits || []).indexOf(legacy.trait) >= 0) ||
      legacy.pathId && c.religiousRanks && c.religiousRanks[legacy.pathId] >= legacy.rank ||
      c.id === s.player.charId && (s.player.travelHistory || []).some(function (h) { return h.purpose === legacy.purpose; })));
  }
  function reward(s, cid, d) {
    var c = s.chars[cid], already = earned(c, d, s);
    c.religiousActivityHistory = c.religiousActivityHistory || {};
    c.religiousActivityHistory[d.milestone] = { turn:s.turn, activityId:d.id, performed:true, rewarded:!already };
    if (already) return;
    Object.keys(d.reward.skills).forEach(function (k) { c.skills[k] = Math.max(c.skills[k] || 0, Math.min(20, (c.skills[k] || 0) + d.reward.skills[k])); });
    if (cid === s.player.charId) { s.player.piety += d.reward.piety; s.player.prestige += d.reward.prestige; }
  }
  function commonValid(d) {
    return plain(d) && typeof d.name === 'string' && keys(d.period, ['yearMin','yearMax']) &&
      Number.isInteger(d.period.yearMin) && (d.period.yearMax === null || Number.isInteger(d.period.yearMax) && d.period.yearMax >= d.period.yearMin) &&
      Array.isArray(d.openings) && d.openings.length <= 32 && d.openings.every(function (o) {
        return keys(o, ['id','revision']) && typeof o.id === 'string' && typeof o.revision === 'string';
      }) && list(d.faithIds) && list(d.affiliationIds) && list(d.roleIds) &&
      (d.institutionId === null || ident(d.institutionId));
  }
  FB.religiousActivityCatalogFaults = function (data) {
    var faults = [], activities = data.religiousActivities || {}, patrons = data.religiousPatronage || {};
    Object.keys(activities).forEach(function (id) {
      var d = activities[id];
      if (!ident(id) || !keys(d, ['name','period','openings','faithIds','affiliationIds','roleIds','institutionId','mode','purpose','siteId','payer','cost','reserve','duration','calendar','interruption','recipient','milestone','reward','legacy','service']) ||
          !commonValid(d) || ['journey','local'].indexOf(d.mode) < 0 || ['household','public'].indexOf(d.payer) < 0 ||
          !number(d.cost) || !number(d.reserve) || !Number.isInteger(d.duration) || d.duration < 0 || d.duration > 360 ||
          d.calendar !== 'any_day' || d.interruption !== 'retain_cost' || !ident(d.milestone) ||
          !keys(d.reward, ['piety','prestige','skills']) || !number(d.reward.piety) || d.reward.piety > 30 ||
          !number(d.reward.prestige) || d.reward.prestige > 10 || !plain(d.reward.skills) || Object.keys(d.reward.skills).some(function (k) {
            return FB.SKILLS.indexOf(k) < 0 || !number(d.reward.skills[k]) || d.reward.skills[k] > 2;
          }) || !['participant','institution'].some(function (v) { return d.recipient === v; }) ||
          d.mode === 'journey' && (d.payer !== 'household' || d.cost !== 0 || d.duration !== 0 || d.institutionId !== null ||
            d.reward.piety || d.reward.prestige || Object.keys(d.reward.skills).length || !data.travelPurposes[d.purpose] ||
            !(data.travelSites || []).some(function (site) { return site.id === d.siteId && site.purpose === d.purpose; })) ||
          d.mode === 'local' && (d.purpose !== null || d.siteId !== null || d.duration < 1) ||
          d.recipient === 'institution' && !d.institutionId ||
          d.service !== null && (!keys(d.service, ['fund','cost']) || !ident(d.service.fund) || !number(d.service.cost) || !d.institutionId) ||
          d.legacy !== null && (!keys(d.legacy, ['trait','pathId','rank','purpose']) ||
            d.legacy.trait !== null && !data.traits[d.legacy.trait] ||
            d.legacy.pathId !== null && (!data.religiousPaths[d.legacy.pathId] || !Number.isInteger(d.legacy.rank)))) {
        faults.push('religiousActivities.' + id); return;
      }
      if (d.faithIds.some(function (v) { return !data.religions[v]; }) ||
          d.affiliationIds.some(function (v) { return !data.religiousAffiliations[v]; })) faults.push('religiousActivities.' + id + '.eligibility');
    });
    Object.keys(patrons).forEach(function (id) {
      var d = patrons[id];
      if (!ident(id) || !keys(d, ['name','period','openings','faithIds','affiliationIds','roleIds','institutionId','payer','reserve','foundation','funds','outreach']) ||
          !commonValid(d) || !d.institutionId || ['household','public'].indexOf(d.payer) < 0 || !number(d.reserve) ||
          !plain(d.funds) || !Object.keys(d.funds).length || Object.keys(d.funds).length > 8 || Object.keys(d.funds).some(function (f) {
            var v = d.funds[f]; return !ident(f) || !keys(v, ['capacity','unitCost']) || !Number.isInteger(v.capacity) ||
              v.capacity < 1 || v.capacity > 64 || !number(v.unitCost) || v.unitCost <= 0;
          }) || !keys(d.foundation, ['startup','capital','treasury','landRequired']) ||
          !number(d.foundation.startup) || !number(d.foundation.capital) || !number(d.foundation.treasury) || d.foundation.landRequired !== true ||
          !list(d.outreach)) faults.push('religiousPatronage.' + id);
    });
    return faults;
  };
  FB.religiousActivityQuote = function (s, activityId, cid) {
    var d = FBDATA.religiousActivities[activityId], c = s.chars[cid];
    if (!d || !c || FB.religiousActivityCatalogFaults(FBDATA).length) return null;
    var p = payer(s, cid, d.payer), travel = null, h = d.institutionId && house(s, d.institutionId), reason = null;
    if (!participant(s, d, cid)) reason = 'eligibility';
    if (c.religiousActivity || Object.keys(c.religiousActivityHistory || {}).length >= 64 || earned(c, d, s)) reason = reason || 'commitment';
    if (cid !== s.player.charId) reason = reason || 'participant';
    if (cid === s.player.charId && s.player.travel) reason = reason || 'travel';
    if (d.mode === 'journey') {
      var site = (FBDATA.travelSites || []).filter(function (v) { return v.id === d.siteId; })[0];
      travel = site && FB.travelSiteSnapshot(s, site.id);
      if (cid !== s.player.charId || !travel) reason = reason || 'route';
    }
    var cost = travel ? travel.cost : d.cost;
    if (!p || p.funds - cost < d.reserve) reason = reason || 'funds';
    if (d.service && (!h || !h.activityInstitutionId || (h.restrictedFunds[d.service.fund] || 0) < d.service.cost ||
        !h.activityServices[d.service.fund] || h.activityServices[d.service.fund].unitCost !== d.service.cost)) reason = reason || 'service';
    return copy({ activityId:activityId, cid:cid, allowed:!reason, reason:reason, payer:p, cost:cost, duration:d.duration,
      recipient:d.institutionId || cid, interruption:d.interruption, travel:travel,
      facts:{ turn:s.turn, date:s.date, start:s.start, definition:d, actor:c, location:at(s, cid),
        house:h || null, institution:d.institutionId && FB.religiousInstitutionSnapshot(s, d.institutionId),
        funds:p, travel:s.player.travel || null, history:s.player.travelHistory || [],
        cooldowns:s.player.cooldowns, owner:s.owner, holder:s.holder, health:c.health } });
  };
  FB.religiousActivityApply = function (s, reviewed) {
    var q = reviewed && FB.religiousActivityQuote(s, reviewed.activityId, reviewed.cid);
    if (!q || !q.allowed || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    var d = FBDATA.religiousActivities[q.activityId], c = s.chars[q.cid];
    if (d.mode === 'journey') {
      if (!FB.travelStart(s, d.purpose, q.travel.destinationId, null)) return false;
      s.player.travel.religiousActivity = { activityId:q.activityId, cid:q.cid, milestone:d.milestone, definition:copy(d) };
      return true;
    }
    if (!pay(s, q.payer, q.cost)) return false;
    c.religiousActivity = { activityId:q.activityId, startTurn:s.turn, dueTurn:s.turn + d.duration,
      location:at(s, q.cid), institutionId:d.institutionId, paid:q.cost, definition:copy(d) };
    return true;
  };
  FB.religiousActivityFinish = function (s, cid, cancel) {
    var c = s.chars[cid], a = c && c.religiousActivity;
    if (!a) return false;
    var d = a.definition, h = d.institutionId && house(s, d.institutionId);
    var valid = !cancel && participant(s, d, cid) && at(s, cid) === a.location &&
      (cid !== s.player.charId || !s.player.travel) && (!d.service || h && h.activityInstitutionId &&
        h.activityServices[d.service.fund] && h.activityServices[d.service.fund].unitCost === d.service.cost &&
        (h.restrictedFunds[d.service.fund] || 0) >= d.service.cost);
    if (valid && s.turn < a.dueTurn) return false;
    delete c.religiousActivity;
    if (!valid) return false;
    if (d.service) {
      h.restrictedFunds[d.service.fund] -= d.service.cost;
      h.activitySpent = (h.activitySpent || 0) + d.service.cost;
    }
    d = copy(d); d.id = a.activityId; reward(s, cid, d);
    return true;
  };
  FB.religiousActivityTick = function (s) {
    /* S04 owns household/AI selection. This adapter only maintains explicit starts. */
    FB.religiousActivityFinish(s, s.player.charId, false);
    var t = s.player.travel, a = t && t.religiousActivity;
    if (a && !t.completed && !FB.religiousActivityJourneyReady(s, t)) FB.travelCancel(s);
  };
  FB.religiousActivityJourneyReady = function (s, t) {
    var a = t && t.religiousActivity;
    return !!(a && a.cid === s.player.charId && participant(s, a.definition, a.cid));
  };
  FB.religiousActivityJourneyDone = function (s, t) {
    var a = t.religiousActivity, c = a && s.chars[a.cid];
    if (!c || a.cid !== s.player.charId) return;
    c.religiousActivityHistory = c.religiousActivityHistory || {};
    if (!c.religiousActivityHistory[a.milestone]) c.religiousActivityHistory[a.milestone] = {
      activityId:a.activityId, turn:s.turn, performed:false, journeyCompleted:true, rewarded:false
    };
  };
  function land(s, g) {
    if (!g || !keys(g, ['provinceId','settlement','count']) || !Number.isInteger(g.settlement) || g.settlement < 0 ||
        !Number.isInteger(g.count) || g.count <= 0) return null;
    var count = (s.player.landPlots || []).filter(function (v) {
      return v.provinceId === g.provinceId && v.settlement === g.settlement;
    }).length;
    return count === g.count ? copy(g) : null;
  }
  FB.religiousPatronageQuote = function (s, profileId, cid, action, terms) {
    var d = FBDATA.religiousPatronage[profileId], c = s.chars[cid], t = terms || {};
    if (!d || !c || FB.religiousActivityCatalogFaults(FBDATA).length || !keys(t, ['fund','amount','land','provinceId','settlement','target','policy'])) return null;
    var ins = FB.religiousInstitutionSnapshot(s, d.institutionId), h = house(s, d.institutionId), p = payer(s, cid, d.payer);
    var reason = participant(s, d, cid) ? null : 'eligibility', g = t.land && land(s, t.land), cost = 0, project = null;
    if (s.player.travel && cid === s.player.charId) reason = reason || 'travel';
    if (['foundation','donation','outreach'].indexOf(action) < 0) reason = reason || 'action';
    if (action === 'foundation' && !keys(t, ['land']) || action === 'donation' && !keys(t, t.land ? ['land'] : ['fund','amount']) ||
        action === 'outreach' && !keys(t, ['fund','amount','provinceId','settlement','target','policy'])) reason = reason || 'terms';
    if (action === 'foundation') {
      cost = d.foundation.startup + d.foundation.capital + d.foundation.treasury;
      if (!ins || !ins.definition.abbeyId || !ins.definition.provinceId || h || (s.abbeys && s.abbeys.houses || []).length >= 12 ||
          (s.abbeys && s.abbeys.houses || []).some(function (v) { return v.provinceId === ins.definition.provinceId; }) ||
          !g || g.provinceId !== ins.definition.provinceId || cid !== s.player.charId || d.payer !== 'household') reason = reason || 'property';
    } else if (!h || h.activityInstitutionId !== d.institutionId || h.activityProfileId !== profileId) reason = reason || 'recipient';
    if (t.land && (!g || !Number.isInteger(g.count) || g.count <= 0 || cid !== s.player.charId || d.payer !== 'household' ||
        !ins || g.provinceId !== ins.definition.provinceId ||
        FB.financeCollateralPledged(s, 'land', t.land.provinceId + ':' + t.land.settlement, { readOnly:true }) ||
        s.player.manor && s.player.manor.provinceId === t.land.provinceId && s.player.manor.settlement === t.land.settlement)) reason = reason || 'property';
    if (action === 'donation' || action === 'outreach') {
      cost = t.land ? 0 : t.amount;
      if (!t.land && (!number(cost) || cost <= 0 || !d.funds[t.fund] ||
          h && (h.restrictedFunds[t.fund] || 0) + cost > d.funds[t.fund].capacity * d.funds[t.fund].unitCost)) reason = reason || 'fund';
    }
    if (action === 'outreach') {
      project = FB.communityProjectFundingSnapshot(s, t.provinceId, t.settlement);
      if (t.land || !d.funds[t.fund] || cost !== d.funds[t.fund].unitCost || !project || !project.control || project.project.target !== t.target || project.project.policy !== t.policy ||
          d.outreach.indexOf(t.policy) < 0 || project.project.target !== c.religion ||
          !ins || ins.definition.jurisdictionIds.indexOf(t.provinceId) < 0 ||
          project.project.sponsor !== (p && p.kind === 'public' ? p.id : 'player') ||
          (project.project.activitySupport && project.project.activitySupport.untilTurn > s.turn)) reason = reason || 'project';
    }
    if (!p || !number(cost) || p.funds - cost < d.reserve) reason = reason || 'funds';
    return copy({ profileId:profileId, cid:cid, action:action, terms:t, allowed:!reason, reason:reason, payer:p, cost:cost,
      recipient:d.institutionId, land:g || null, startup:action === 'foundation' ? d.foundation.startup : 0,
      upkeep:d.funds, capacity:d.funds, project:project,
      facts:{ turn:s.turn, date:s.date, start:s.start, definition:d, actor:c, location:at(s, cid), institution:ins,
        house:h, houses:s.abbeys || null, land:s.player.landPlots || [], manor:s.player.manor || null,
        finance:s.economy || null, owner:s.owner, holder:s.holder, payer:p } });
  };
  FB.religiousPatronageApply = function (s, reviewed) {
    var q = reviewed && FB.religiousPatronageQuote(s, reviewed.profileId, reviewed.cid, reviewed.action, reviewed.terms);
    if (!q || !q.allowed || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    var d = FBDATA.religiousPatronage[q.profileId], h = house(s, d.institutionId), t = q.terms;
    if (!pay(s, q.payer, q.cost)) return false;
    if (q.action === 'foundation') {
      var def = FB.localInstitutionDefinitions(s)[d.institutionId];
      h = { id:def.abbeyId, provinceId:def.provinceId, religion:def.religion, culture:def.culture,
        activityInstitutionId:d.institutionId, activityProfileId:q.profileId, activityServices:copy(d.funds),
        foundedTurn:s.turn, holderId:null, patronDyn:s.chars[q.cid].dyn || null,
        capital:d.foundation.capital, treasury:d.foundation.treasury, rents:0, plots:[], restrictedFunds:{}, activitySpent:d.foundation.startup };
      if (!s.abbeys) s.abbeys = { v:1, houses:[] };
      s.abbeys.houses.push(h);
    }
    if (q.land) {
      s.player.landPlots = s.player.landPlots.filter(function (v) { return v.provinceId !== q.land.provinceId || v.settlement !== q.land.settlement; });
      var old = h.plots.filter(function (v) { return v.provinceId === q.land.provinceId && v.settlement === q.land.settlement; })[0];
      if (old) old.count += q.land.count; else h.plots.push(copy(q.land));
    } else if (q.action === 'donation') h.restrictedFunds[t.fund] = (h.restrictedFunds[t.fund] || 0) + q.cost;
    if (q.action === 'outreach') {
      /* A prepaid service is consumed once. Population owns its one support record. */
      h.activitySpent = (h.activitySpent || 0) + q.cost;
      FB.communityProjectFund(s, t.provinceId, t.settlement, q.project.project, {
        institutionId:d.institutionId, amount:q.cost, untilTurn:s.turn + 360
      });
    }
    return true;
  };
})();
