/* Fallowborn: provincial church councils and public ruler profession.
   Optional institutions use living offices and saved community projections.
   Quotes are read-only; reviewed decisions revalidate before any payment. */
window.FB = window.FB || {};
(function () {
  'use strict';
  function own(o, key) { return Object.prototype.hasOwnProperty.call(o || {}, key); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function balance(key, fallback) {
    const v = FBDATA.balance[key];
    return v === undefined ? fallback : Number(v);
  }
  function enabled(s, id, rid) {
    return !!(s && FB.systemEnabled(s, id, { realm:rid }) &&
      FB.systemEnabled(s, 'episcopal_sees', { realm:rid }));
  }
  function ruler(s, rid) {
    return rid === 'player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s, rid);
  }
  function court(s, rid) {
    if (rid === 'player') return FB.householdMembers(s).filter(function (c) { return c && !c.dead; });
    const c = ruler(s, rid);
    if (!c) return [];
    const ids = [c.id];
    FB.spousesSnapshot(s, c).forEach(function (spouse) { ids.push(spouse.id); });
    (c.childrenIds || []).forEach(function (id) {
      const child = s.chars[id];
      if (child && !child.dead && FB.ageOf(child, s.date.year) < 18) ids.push(id);
    });
    return ids.filter(function (id, i) { return ids.indexOf(id) === i; }).map(function (id) { return s.chars[id]; });
  }
  function bishops(s, faith) {
    return FB.localInstitutionList(s, 'church').map(function (item) {
      const holder = FB.religiousOfficeSnapshot(s, item.def.officeId);
      return holder && FB.faithInFold(s, item.def.religion, faith) ?
        { institutionId:item.id, officeId:item.def.officeId, charId:holder.id, provinceId:item.def.provinceId } : null;
    }).filter(Boolean).sort(function (a, b) { return a.officeId < b.officeId ? -1 : 1; });
  }
  function share(s, pid, faith, excluded) {
    let total = 0, matching = 0;
    FB.countyCommunities(s, pid).forEach(function (row) {
      total += row.count;
      if (FB.faithInFold(s, row.religion, faith) && (!excluded || !FB.faithInFold(s, row.religion, excluded))) matching += row.count;
    });
    return total ? matching / total : 0;
  }
  function protect(s, rid, pid) {
    const g = FB.political.governingIdentity(s, rid);
    const local = FB.political.communityGovernance(s, pid);
    return !(g && g.tolerance === 'persecution') &&
      !(local && local.identity && local.realmId === rid &&
        rid === 'player' && FB.realmPolicyActive(s) && FB.realmPolicyLevelId(s, 'religious_tolerance') === 'persecution') &&
      !FB.hasModifier(s, 'persecuted_minorities', pid);
  }
  function recognize(s, officeId, rid, pid) {
    const subject = { kind:'realm', id:rid }, scope = { kind:'county', id:pid };
    const prior = FB.political.legitimacy(s, subject, scope, 'church_support').filter(function (r) {
      return r.issuer.id === officeId;
    })[0];
    if (prior) return prior.id;
    /* Replaced bishops must consent anew; an obsolete row cannot prevent
       an explicit fresh act, and never acquires its replacement's signature. */
    (s.authority && s.authority.recognitions || []).forEach(function (r) {
      if (r.status === 'active' && r.source === 'church_support' && r.issuer.id === officeId &&
          r.subject.kind === 'realm' && r.subject.id === rid && r.scope && r.scope.id === pid)
        FB.authorityRecognitionTransition(s, r.id, 'revoke');
    });
    const rec = FB.authorityRecognize(s, { source:'church_support',
      issuer:{ kind:'religious-office', id:officeId }, subject:subject, scope:scope });
    return rec && rec.id;
  }
  function rulerReason(s, rid, system) {
    const r = s && s.realms && s.realms[rid], c = r && ruler(s, rid);
    if (!enabled(s, system, rid)) return FB.T('This institution is unavailable in this campaign.');
    if (!r || !r.alive || !c || c.dead || rid === 'player' &&
        (s.player.dead || !FB.station.rulesRealm(s.player, s))) return FB.T('Only a living ruler may make this decision.');
    if (FB.ageOf(c, s.date.year) < 18) return FB.T('The ruler must be an adult.');
    if (!FB.realmHeldCounties(s, rid).length) return FB.T('The ruler must hold a settled county.');
    if (FB.isRealmAtWar(s, rid)) return FB.T('You must first make peace.');
    return '';
  }

  FB.churchCouncilQuote = function (s, rid, faith) {
    const out = { allowed:false, reason:rulerReason(s, rid, 'church_councils'), realmId:rid,
      faithId:faith, goldCost:balance('churchCouncilGold', 30),
      support:balance('churchCouncilSupport', 8), bishops:[], counties:[], turn:s.turn };
    const r = s.realms[rid], c = r && ruler(s, rid);
    out.charId = c && c.id || null;
    out.generation = r && FB.realmRulerGeneration(s, rid) || 0;
    const held = FB.realmHeldCounties(s, rid);
    const people = {};
    out.bishops = bishops(s, faith).filter(function (b) {
      if (held.indexOf(b.provinceId) < 0 || people[b.charId]) return false;
      people[b.charId] = true;
      return true;
    });
    out.counties = out.bishops.map(function (b) { return b.provinceId; }).filter(function (id, i, ids) { return ids.indexOf(id) === i; });
    const prior = s.churchCouncils && s.churchCouncils[rid];
    if (!out.reason && out.bishops.length < 2) out.reason = FB.T('A provincial council needs two living bishops of the same communion in your lands.');
    if (!out.reason && out.counties.some(function (pid) { return !protect(s, rid, pid); }))
      out.reason = FB.T('Protect worship in every participating county before convening the bishops.');
    if (!out.reason && prior && s.turn - prior.turn < balance('churchCouncilCooldown', 720))
      out.reason = FB.T('Ready in {days} days.', { days:balance('churchCouncilCooldown', 720) - (s.turn - prior.turn) });
    out.funds = rid === 'player' ? s.player.gold : FB.treasuryAvailable(s, rid);
    if (!out.reason && out.funds < out.goldCost) out.reason = FB.T('Requires {money:cost}.', { cost:out.goldCost });
    out.allowed = !out.reason;
    out.stamp = JSON.stringify(out);
    return out;
  };
  FB.conveneChurchCouncil = function (s, reviewed) {
    if (!reviewed) return null;
    const q = FB.churchCouncilQuote(s, reviewed.realmId, reviewed.faithId);
    if (!q.allowed || q.stamp !== reviewed.stamp) return null;
    if (q.realmId === 'player') s.player.gold -= q.goldCost;
    else if (!FB.treasurySpend(s, q.realmId, q.goldCost)) return null;
    const ids = [];
    q.bishops.forEach(function (b) { ids.push(recognize(s, b.officeId, q.realmId, b.provinceId)); });
    q.counties.forEach(function (pid) { FB.adjustCountySupport(s, pid, q.support); });
    const result = { realmId:q.realmId, faithId:q.faithId, charId:q.charId,
      generation:q.generation, turn:s.turn, goldCost:q.goldCost,
      bishops:copy(q.bishops), counties:q.counties.slice(), recognitionIds:ids };
    if (!s.churchCouncils) s.churchCouncils = {};
    s.churchCouncils[q.realmId] = result;
    FB.news(s, FB.msg('news.religion.provincial_council',
      '☧ The bishops of {faith} meet under the protection of {realm}; their congregations gain a hearing.',
      { faith:{ $data:'religion', id:q.faithId }, realm:FB.realmNameParam(s, q.realmId) }));
    return copy(result);
  };

  FB.rulerFaithConversionStatus = function (s, rid, target) {
    const r = s && s.realms && s.realms[rid], c = r && ruler(s, rid);
    const out = { ok:false, reason:rulerReason(s, rid, 'ruler_conversion'), rulerDecision:true,
      realmId:rid, charId:c && c.id || null, generation:r && FB.realmRulerGeneration(s, rid) || 0,
      kind:'faith', scope:'realm', targetId:target, targetValid:FB.faithAssignable(target, s),
      from:r && r.religion || c && c.religion || null, relation:null, relationMult:1,
      pietyCost:0, prestigeCost:0, goldCost:0, popularOpinion:0, foldStanding:balance('faithConversionRealmRealmStanding', -25),
      vassalStanding:balance('faithConversionVassalStanding', -35), oldFoldRealmIds:[], vassalIds:[],
      excommunicates:false, counties:[], bishops:[], lostRecognitionIds:[], householdIds:[], turn:s.turn };
    if (!out.targetValid || (FBDATA.rulerFaithTargets || []).indexOf(target) < 0)
      out.reason = out.reason || FB.T('That faith is not available for a public ruler conversion.');
    if (!out.reason && target === out.from) out.reason = FB.T('The realm already confesses that faith.');
    const prior = s.rulerFaithDecisions && s.rulerFaithDecisions.conversions && s.rulerFaithDecisions.conversions[rid];
    if (!out.reason && (prior && prior.charId === out.charId && prior.generation === out.generation ||
        rid === 'player' && s.player.realmFaithConversion && s.player.realmFaithConversion.charId === out.charId))
      out.reason = FB.T('This ruler has already led the realm to a new faith.');
    if (rid === 'player') {
      out.encountered = FB.conversionTargetEncountered(s, 'faith', target);
      if (!out.reason && !out.encountered) out.reason = FB.T('Encounter this faith before adopting it.');
      const cds = s.player.cooldowns || {};
      ['convert_faith','convert_faith:self','convert_faith:household','convert_faith:realm'].forEach(function (id) {
        const days = balance(id === 'convert_faith:self' ? 'faithConversionSelfCooldown' : 'faithConversionHouseholdCooldown', id === 'convert_faith:self' ? 730 : 1460);
        if (!out.reason && own(cds, id) && s.turn - cds[id] < days)
          out.reason = FB.T('Ready in {days} days.', { days:days - (s.turn - cds[id]) });
      });
    }
    if (out.targetValid && out.from) {
      out.relation = FB.faithRelation(s, out.from, target);
      const keys = { in_fold:'faithConversionInFoldMult', schismatic:'faithConversionSchismaticMult', foreign:'faithConversionForeignMult', hostile:'faithConversionHostileMult' };
      out.relationMult = keys[out.relation] ? balance(keys[out.relation], 1) : 1;
      if (rid === 'player') {
        out.pietyCost = Math.ceil(balance('faithConversionRealmPiety', 600) * out.relationMult);
        out.prestigeCost = Math.ceil(balance('faithConversionRealmPrestige', 400) * out.relationMult);
      } else out.goldCost = Math.ceil(balance('rulerConversionAIGold', 60) * out.relationMult);
      out.householdIds = court(s, rid).map(function (member) { return member.id; });
      if (c && out.householdIds.indexOf(c.id) < 0) out.householdIds.unshift(c.id);
      out.bishops = bishops(s, target);
      out.counties = FB.realmHeldCounties(s, rid).map(function (pid) {
        const old = share(s, pid, out.from, target), next = share(s, pid, target);
        const gain = Math.round(share(s, pid, target, out.from) * balance('rulerConversionSupportGain', 20));
        const loss = Math.round(old * balance('rulerConversionOldFaithLoss', 30));
        return { provinceId:pid, oldShare:old, targetShare:next,
          support:gain - loss, unrest:old >= balance('rulerConversionUnrestShare', 0.15),
          currentSupport:FB.countyPopularSupport(s, pid), protected:protect(s, rid, pid) };
      });
      for (const id in s.realms) {
        if (id === rid || !s.realms[id].alive) continue;
        if (FB.faithInFold(s, FB.realmReligionId(s, id), out.from) &&
            !FB.faithInFold(s, FB.realmReligionId(s, id), target)) out.oldFoldRealmIds.push(id);
        if (s.realms[id].liege === rid) out.vassalIds.push(id);
      }
      const offices = FB.religiousOffices(s);
      (s.authority && s.authority.recognitions || []).forEach(function (rec) {
        const office = offices[rec.issuer.id];
        if (rec.status === 'active' && rec.source === 'church_support' && rec.subject.kind === 'realm' &&
            rec.subject.id === rid && office && FB.faithInFold(s, office.religionId, out.from) &&
            !FB.faithInFold(s, office.religionId, target)) out.lostRecognitionIds.push(rec.id);
      });
    }
    out.funds = rid === 'player' ? { piety:s.player.piety, prestige:s.player.prestige } : { gold:FB.treasuryAvailable(s, rid) };
    if (!out.reason && rid === 'player' && out.funds.piety < out.pietyCost)
      out.reason = FB.T('Requires {needed} piety; currently {current}.', { needed:out.pietyCost, current:Math.floor(out.funds.piety) });
    if (!out.reason && rid === 'player' && out.funds.prestige < out.prestigeCost)
      out.reason = FB.T('Requires {needed} prestige; currently {current}.', { needed:out.prestigeCost, current:Math.floor(out.funds.prestige) });
    if (!out.reason && rid !== 'player' && out.funds.gold < out.goldCost)
      out.reason = FB.T('Requires {money:cost}.', { cost:out.goldCost });
    out.ok = !out.reason;
    out.stamp = JSON.stringify(out);
    return out;
  };
  FB.applyRulerFaithConversion = function (s, rid, target, reviewed) {
    const q = FB.rulerFaithConversionStatus(s, rid, target);
    if (!q.ok || reviewed && reviewed.stamp !== q.stamp) return false;
    if (rid === 'player') {
      s.player.piety -= q.pietyCost; s.player.prestige -= q.prestigeCost;
      s.player.cooldowns = s.player.cooldowns || {};
      s.player.cooldowns.convert_faith = s.turn;
      s.player.cooldowns['convert_faith:realm'] = s.turn;
      s.player.realmFaithConversion = { charId:q.charId, turn:s.turn, from:q.from, to:target };
    } else if (!FB.treasurySpend(s, rid, q.goldCost)) return false;
    /* Snapshot social regard before rebasing faith. Both the incoming and
       outgoing court retain the graph's ordinary directional prior. */
    const regards = q.oldFoldRealmIds.map(function (id) { return { id:id, value:FB.rulerRegard(s, id, rid) }; });
    q.householdIds.forEach(function (id) { s.chars[id].religion = target; });
    s.realms[rid].religion = target;
    const government = s.authority && s.authority.governments && s.authority.governments[rid];
    if (government) government.eliteFaithId = target;
    q.lostRecognitionIds.forEach(function (id) { FB.authorityRecognitionTransition(s, id, 'revoke'); });
    q.counties.forEach(function (row) {
      FB.adjustCountySupport(s, row.provinceId, row.support);
      if (row.unrest) FB.addModifier(s, 'zealot_unrest', row.provinceId, { silent:true });
      if (row.protected) q.bishops.forEach(function (b) {
        if (b.provinceId === row.provinceId || row.provinceId === s.realms[rid].capital)
          recognize(s, b.officeId, rid, row.provinceId);
      });
    });
    regards.forEach(function (row) {
      if (rid === 'player') {
        FB.adjustRulerRegard(s, row.id, rid, q.foldStanding, 'religion:public_conversion');
        return;
      }
      const delta = q.foldStanding + (FB.faithRelationBaseline(s, FB.realmReligionId(s, row.id), target) -
        FB.faithRelationBaseline(s, FB.realmReligionId(s, row.id), q.from));
      FB.adjustRulerRegard(s, row.id, rid, row.value + delta - FB.rulerRegard(s, row.id, rid), 'religion:public_conversion');
    });
    q.vassalIds.forEach(function (id) { FB.adjustRulerRegard(s, id, rid, q.vassalStanding, 'religion:public_conversion'); });
    if (!s.rulerFaithDecisions) s.rulerFaithDecisions = { conversions:{} };
    s.rulerFaithDecisions.conversions[rid] = { charId:q.charId, generation:q.generation, turn:s.turn, from:q.from, to:target };
    if (FB.clearPortraitCache) FB.clearPortraitCache();
    if (FB.invalidatePoliticsState) FB.invalidatePoliticsState();
    FB.news(s, FB.msg('news.religion.ruler_conversion',
      '☧ {name} professes {faith} as the official faith of {realm}. Congregations keep their worship, while the old court’s faithful resist.',
      { name:FB.fullName(s.chars[q.charId]), faith:{ $data:'religion', id:target }, realm:FB.realmNameParam(s, rid) }));
    return true;
  };

  FB.rulerFaithConversionEvaluation = function (s, rid, target) {
    const q = FB.rulerFaithConversionStatus(s, rid, target), c = s.realms[rid] && ruler(s, rid);
    let total = 0, next = 0, old = 0;
    q.counties.forEach(function (row) {
      const n = FB.countyCommunities(s, row.provinceId).reduce(function (sum, cohort) { return sum + cohort.count; }, 0);
      total += n; next += n * row.targetShare; old += n * row.oldShare;
    });
    const targetShare = total ? next / total : 0;
    const spouse = c && FB.spousesSnapshot(s, c).some(function (person) { return FB.faithInFold(s, person.religion, target); });
    const score = Math.round(40 * (targetShare - (total ? old / total : 0))) +
      (q.bishops.length ? 8 : 0) + (spouse ? 12 : 0) - (c && FB.hasTrait(c, 'zealous') ? 20 : 0);
    return { allowed:q.ok && q.relation !== 'in_fold' && (targetShare >= balance('rulerConversionAIMinShare', 0.35) || spouse) &&
      score >= balance('rulerConversionAIThreshold', 24), score:score, targetShare:targetShare, quote:q };
  };
  FB.religionYear = function (s) {
    if (!FB.systemAvailable(s, 'ruler_conversion')) return;
    if (s.rulerFaithDecisions && s.rulerFaithDecisions.lastAIYear === s.date.year) return;
    if (!s.rulerFaithDecisions) s.rulerFaithDecisions = { conversions:{} };
    s.rulerFaithDecisions.lastAIYear = s.date.year;
    Object.keys(s.realms).sort().forEach(function (rid) {
      if (rid === 'player' || rulerReason(s, rid, 'ruler_conversion')) return;
      const options = (FBDATA.rulerFaithTargets || []).map(function (target) {
        return FB.rulerFaithConversionEvaluation(s, rid, target);
      }).filter(function (q) { return q.allowed; }).sort(function (a, b) {
        return b.score - a.score || (a.quote.targetId < b.quote.targetId ? -1 : 1);
      });
      if (options.length && FB.rng() < balance('rulerConversionAIChance', 0.06)) {
        const best = options[0].quote;
        FB.applyRulerFaithConversion(s, rid, best.targetId, best);
      }
    });
  };

  FB.validateReligionInstitutionState = function (s) {
    function plain(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
    function fail(path) { throw new Error(FB.T('Invalid v4 save field at {path}.', { path:path })); }
    function record(r, rid) {
      return plain(r) && own(s.realms, rid) && typeof r.charId === 'string' && !!r.charId &&
        Number.isInteger(r.generation) && r.generation >= 0 && Number.isInteger(r.turn) && r.turn >= 0 && r.turn <= s.turn;
    }
    if (s.rulerFaithDecisions !== undefined) {
      const v = s.rulerFaithDecisions;
      if (!plain(v) || !plain(v.conversions) || v.lastAIYear !== undefined &&
          (!Number.isInteger(v.lastAIYear) || v.lastAIYear > s.date.year)) fail('state.rulerFaithDecisions');
      for (const rid in v.conversions) if (own(v.conversions, rid)) {
        const r = v.conversions[rid];
        if (!record(r, rid) || !FB.faithAssignable(r.from, s) || !FB.faithAssignable(r.to, s) || r.from === r.to)
          fail('state.rulerFaithDecisions.conversions.' + rid);
      }
    }
    if (s.churchCouncils !== undefined) {
      if (!plain(s.churchCouncils)) fail('state.churchCouncils');
      for (const rid in s.churchCouncils) if (own(s.churchCouncils, rid)) {
        const r = s.churchCouncils[rid];
        if (!record(r, rid) || r.realmId !== rid || !FB.faithAssignable(r.faithId, s) ||
            !Number.isFinite(r.goldCost) || r.goldCost < 0 || !Array.isArray(r.counties) || !r.counties.length ||
            r.counties.some(function (id, i) { return typeof id !== 'string' || !FB.world.byId[id] || r.counties.indexOf(id) !== i; }) ||
            !Array.isArray(r.bishops) || r.bishops.length < 2 || r.bishops.some(function (b) {
              const def = plain(b) && FBDATA.localInstitutions[b.institutionId];
              return !plain(b) || !def || def.officeId !== b.officeId || def.provinceId !== b.provinceId ||
                r.counties.indexOf(b.provinceId) < 0 || typeof b.charId !== 'string' || !b.charId;
            }) || !Array.isArray(r.recognitionIds) || r.recognitionIds.length !== r.bishops.length ||
            r.recognitionIds.some(function (id) { return typeof id !== 'string' || !id; }))
          fail('state.churchCouncils.' + rid);
      }
    }
    return true;
  };
  FB.validateReligionInstitutionsData = function () {
    const targets = FBDATA.rulerFaithTargets, errors = [];
    if (!Array.isArray(targets) || !targets.length) return [FB.T('Public ruler faith targets must be a nonempty list.')];
    targets.forEach(function (id, i) {
      if (typeof id !== 'string' || !FB.faithAssignable(id, null) || targets.indexOf(id) !== i)
        errors.push(FB.T('Invalid public ruler faith target {id}.', { id:String(id) }));
    });
    return errors;
  };
})();
