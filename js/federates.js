/* General federate negotiation and moving courts. Government strategies
   select behavior; stories supply historical parties and opportunities. */
(function () {
  'use strict';
  var Q = FB.political;
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function rows(s) { return s.authority && s.authority.migrations || []; }
  function migration(s, id) {
    for (var row of rows(s)) if (row.id === id) return row;
    return null;
  }
  function host(s, id) {
    for (var army of s.armies || []) if (army.id === id) return army;
    return null;
  }
  function live(s, rid) { return !!(s.realms[rid] && s.realms[rid].alive); }
  function ongoing(row) {
    return ['encamped','service','marching','arrived'].indexOf(row.status) >= 0;
  }
  function mobile(s, rid) {
    var form = FB.governments.forRealm(s, rid);
    return !!(form && form.use.territory.movingCourt);
  }
  function noticeParams(s, row) {
    return { realm:FB.realmNameParam(s, row.realmId),
      patron:FB.realmNameParam(s, row.patronRealmId),
      province:FB.world.byId[row.target].name };
  }

  /* Pure term expansion. Explicit parties/scopes are never filled from the
     player or a bookmark. Terms are copied into the accepted commitment. */
  Q.contractTerms = function (s, templateId, parties) {
    var def = (FBDATA.federateContractTerms || {})[templateId];
    if (!def || !parties) return null;
    var terms = Object.assign({}, copy(parties), { templateId:templateId });
    if (terms.payPerSeason === undefined) terms.payPerSeason = def.payPerSeason;
    if (terms.initialPay === undefined) terms.initialPay = def.initialPay || 0;
    if (terms.endTurn === undefined) terms.endTurn = s.turn + def.durationDays;
    return Q.contractQuote(s, terms).allowed ? terms : null;
  };
  FB.authorityOfferContractTemplate = function (s, templateId, parties) {
    var terms = Q.contractTerms(s, templateId, parties);
    return terms ? FB.authorityOfferContract(s, terms) : null;
  };

  Q.contractRenegotiationQuote = function (s, id, changes) {
    var row = Q.contract(s, id);
    if (!row || ['active','expired','breached'].indexOf(row.status) < 0 || !changes ||
        !Number.isInteger(changes.endTurn) ||
        changes.endTurn <= Math.max(s.turn, row.endTurn)) return null;
    var pay = changes.payPerSeason === undefined ? row.payPerSeason : changes.payPerSeason;
    var candidate = Object.assign({}, row, { payPerSeason:pay, endTurn:changes.endTurn,
      settlementAwards:row.settlementAwards.filter(function (award) { return !award.fulfilled; }),
      settlementCountyIds:row.settlementCountyIds.filter(function (pid) {
        return (row.fulfilledCountyIds || []).indexOf(pid) < 0;
      }) });
    if (!Q.contractQuote(s, candidate).allowed) return null;
    return { contractId:id, endTurn:changes.endTurn, payPerSeason:pay,
      patronGeneration:FB.realmRulerGeneration(s, row.patronRealmId),
      federateGeneration:FB.realmRulerGeneration(s, row.federateRealmId),
      signature:JSON.stringify(row) };
  };
  FB.authorityRenegotiateContract = function (s, id, rid, changes, reviewed) {
    var quote = Q.contractRenegotiationQuote(s, id, changes);
    var row = s.authority && s.authority.contracts.find(function (item) { return item.id === id; });
    if (!quote || !reviewed || JSON.stringify(quote) !== JSON.stringify(reviewed) ||
        !row || rid !== row.patronRealmId && rid !== row.federateRealmId ||
        !FB.authorityContractTransition(s, id, 'renew', rid, quote.endTurn)) return false;
    row.payPerSeason = quote.payPerSeason;
    return true;
  };

  function playerRules(s, rid) {
    return rid === 'player' || FB.realmIdForRulerCharacter(s, s.chars[s.player.charId]) === rid;
  }
  function ai(s, rid, row) {
    if (playerRules(s, rid) || !live(s, rid)) return false;
    var due = row.payPerSeason + (row.initialPaidTurn === undefined ? row.initialPay || 0 : 0);
    if (rid === row.patronRealmId && due && FB.treasuryAvailable(s, rid) < due) return false;
    return FB.authorityConsentContract(s, row.id, rid);
  }
  function propose(s, row) {
    if (!ongoing(row) || row.choice || row.contractId || playerRules(s, row.realmId) ||
        playerRules(s, row.patronRealmId)) return false;
    var choice = s.owner[row.target] === row.patronRealmId &&
      FB.settlementCountyHolder(s, row.target) === row.patronRealmId ? 'land' : 'service';
    return FB.federateRequest(s, row.id, choice);
  }
  FB.governments.register('ai', 'federate_contracts', { consentContract:ai, proposeMigration:propose });
  FB.governments.register('ai', 'roman_offices', {
    consentContract:ai, proposeMigration:propose, offices:FB.officeCourtAI
  });
  FB.governments.strategy('territory', 'non_territorial').movingCourt = true;
  FB.federateSupplyContracts = function (s) {
    return (s.authority && s.authority.contracts || []).filter(function (row) {
      return row.hostId && Q.contract(s, row.id).effective;
    }).map(function (row) { return [row.id, row.hostId, row.patronRealmId, row.federateRealmId]; });
  };
  FB.federateSupplyHostKey = function (s, army) {
    return (s.authority && s.authority.contracts || []).some(function (row) {
      return row.hostId === army.id && row.federateRealmId === army.realm && Q.contract(s, row.id).effective;
    }) ? army.id : null;
  };
  var friendly = FB.armyFriendlyProvince;
  FB.armyFriendlyProvince = function (s, army, pid, relations) {
    if (friendly(s, army, pid, relations)) return true;
    if (!army || !s.owner[pid]) return false;
    for (var row of s.authority && s.authority.contracts || []) {
      if (row.hostId !== army.id || row.federateRealmId !== army.realm ||
          s.owner[pid] !== FB.topRealm(s, row.patronRealmId)) continue;
      var deal = Q.contract(s, row.id);
      if (deal.effective && !FB.armiesHostile(s, army, { realm:s.owner[pid] })) return true;
    }
    return false;
  };

  FB.federateNegotiateContract = function (s, id) {
    var row = Q.contract(s, id);
    if (!row || !row.templateId) return false;
    if (row.effective) return true;
    if (row.status !== 'offered') return false;
    for (var rid of [row.patronRealmId, row.federateRealmId]) {
      var form = FB.governments.forRealm(s, rid);
      if (form && typeof form.use.ai.consentContract === 'function')
        form.use.ai.consentContract(s, rid, row);
    }
    var current = Q.contract(s, id);
    return !!(current && current.effective);
  };
  FB.federateContractSeason = function (s) {
    for (var moving of rows(s)) {
      var government = FB.governments.forRealm(s, moving.realmId);
      if (government && typeof government.use.ai.proposeMigration === 'function')
        government.use.ai.proposeMigration(s, moving);
    }
    for (var row of s.authority && s.authority.contracts || []) {
      var def = (FBDATA.federateContractTerms || {})[row.templateId];
      if (!def) continue;
      if (row.status === 'offered') { FB.federateNegotiateContract(s, row.id); continue; }
      if (!def.autoRenew || row.status === 'breached' ||
          row.status === 'expired' && row.transitionReason !== 'ruler_succession' &&
            row.transitionReason !== 'term_ended' ||
          row.status === 'active' && row.endTurn - s.turn > def.renewWindowDays) continue;
      if (playerRules(s, row.patronRealmId) || playerRules(s, row.federateRealmId) ||
          row.payPerSeason && FB.treasuryAvailable(s, row.patronRealmId) < row.payPerSeason) continue;
      var changes = { endTurn:Math.max(row.endTurn + 1, s.turn + def.durationDays),
        payPerSeason:def.payPerSeason };
      var quote = Q.contractRenegotiationQuote(s, row.id, changes);
      if (quote && FB.authorityRenegotiateContract(s, row.id, row.patronRealmId, changes, quote))
        FB.federateNegotiateContract(s, row.id);
    }
  };

  Q.movingPolity = function (s, id) {
    var row = migration(s, id);
    return row ? copy(row) : null;
  };
  Q.movingPolities = function (s, rid) {
    return rows(s).filter(function (row) { return row.realmId === rid; }).map(copy);
  };
  function court(s, row, army) {
    var ruler = FB.realmRulerCharacterSnapshot(s, row.realmId);
    if (ruler && row.courtIds.indexOf(ruler.id) < 0) row.courtIds.push(ruler.id);
    for (var cid of row.courtIds) {
      var c = s.chars[cid];
      if (c && !c.dead) c.homeProvinceId = army.at;
    }
    if (s.realms[row.realmId].capital !== army.at) {
      s.realms[row.realmId].capital = army.at;
      FB.invalidateRealmCache();
      if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    }
    row.at = army.at;
  }
  FB.federateReferencesCharacter = function (s, cid) {
    return rows(s).some(function (row) { return ongoing(row) && row.courtIds.indexOf(cid) >= 0; });
  };
  FB.federateHostStanding = function (s, army) {
    var row = army && migration(s, army.migrationId);
    return !!(row && ongoing(row) && row.endTurn > s.turn &&
      row.hostId === army.id && row.realmId === army.realm && live(s, row.realmId));
  };
  FB.federateHostTravelling = function (s, army) {
    var row = army && migration(s, army.migrationId);
    return !!(row && ongoing(row) && row.hostId === army.id &&
      (row.status === 'encamped' || row.status === 'service' ||
        row.status === 'arrived' || row.choice !== 'force' || !FB.ordinaryWarById(s, row.warId)));
  };

  /* Begin once, with an ordinary existing or newly authored host. There
     can be only one moving court per polity and per host. */
  FB.federateBeginMigration = function (s, spec) {
    if (!spec || !live(s, spec.realmId) || !live(s, spec.patronRealmId) ||
        spec.realmId === spec.patronRealmId || !mobile(s, spec.realmId) ||
        FB.realmTerritory(s, spec.realmId).length ||
        !FB.world.byId[spec.origin] || !s.owner[spec.origin] ||
        !FB.world.byId[spec.target] || !s.owner[spec.target] ||
        typeof spec.hostId !== 'string' || !spec.hostId ||
        !Number.isInteger(spec.endTurn) || spec.endTurn <= s.turn ||
        !FBDATA.governmentForms[spec.settlementForm] ||
        FB.governments.resolve(spec.settlementForm).use.territory.movingCourt ||
        rows(s).some(function (row) { return ongoing(row) &&
          (row.realmId === spec.realmId || row.hostId === spec.hostId); })) return null;
    var army = host(s, spec.hostId);
    if (army && (army.realm !== spec.realmId || army.migrationId || army.men <= 0)) return null;
    if (!army && (!Number.isInteger(spec.men) || spec.men <= 0 || !spec.units ||
        Object.keys(spec.units).some(function (id) {
          return !FBDATA.unitClasses[id] || !Number.isInteger(spec.units[id]) || spec.units[id] < 0;
        }) || Object.keys(spec.units).reduce(function (n, id) { return n + spec.units[id]; }, 0) !== spec.men))
      return null;
    FB.ensureRealmCourt(s, spec.realmId);
    var ruler = FB.realmRulerCharacterSnapshot(s, spec.realmId);
    if (!ruler) return null;
    if (!army) {
      army = { id:spec.hostId, realm:spec.realmId, at:spec.origin, from:spec.origin,
        men:spec.men, size:spec.men, units:copy(spec.units), supply:100,
        path:[], goal:null, moveLeft:0, warId:null };
      s.armies.push(army);
    }
    var courtIds = [ruler.id].concat(ruler.spouseId || [], ruler.childrenIds || []);
    courtIds = courtIds.filter(function (id, i) { return s.chars[id] && courtIds.indexOf(id) === i; });
    var id = FB.authorityNextId(s, 'migration-'), a = s.authority;
    var row = { id:id,
      realmId:spec.realmId, patronRealmId:spec.patronRealmId, hostId:army.id,
      origin:army.at, at:army.at, target:spec.target, settlementForm:spec.settlementForm,
      status:'encamped', choice:null, startTurn:s.turn, endTurn:spec.endTurn,
      courtIds:courtIds, contractId:null, warId:null, session:null };
    if (!Array.isArray(a.migrations)) a.migrations = [];
    a.migrations.push(row); army.migrationId = row.id;
    s.realms[row.realmId].nonTerritorial = true;
    court(s, row, army);
    return copy(row);
  };

  /* Land requests need a consenting owner. Service binds only the exact
     host. Force creates an ordinary objective war and never awards land. */
  FB.federateRequest = function (s, id, choice, templateId, recognitionId) {
    var row = migration(s, id), army = row && host(s, row.hostId);
    if (!row || !ongoing(row) || !army || army.men <= 0 || !mobile(s, row.realmId) ||
        army.realm !== row.realmId || row.endTurn <= s.turn ||
        !live(s, row.patronRealmId) || ['land','service','force'].indexOf(choice) < 0 ||
        row.choice || FB.isRealmAtWar(s, row.realmId)) return false;
    if (choice === 'force') {
      var enemy = s.owner[row.target];
      if (!live(s, enemy) || enemy === row.realmId || enemy === 'player' ||
          FB.isRealmAtWar(s, enemy)) return false;
      var war = FB.registerOrdinaryWar(s, row.realmId, { enemy:enemy,
        target:row.target, legacy:false, casus:{ type:'border', target:row.target },
        objectives:[{ target:row.target, type:'border' }] });
      if (!war) return false;
      var prior = row.contractId && Q.contract(s, row.contractId);
      if (prior && prior.patronRealmId === enemy)
        FB.authorityContractTransition(s, prior.id, 'breach', row.realmId);
      row.warId = war.id; row.choice = choice; row.status = 'marching';
      army.warId = war.id;
      FB.orderArmy(s, army, row.target);
      FB.news(s, FB.msg('news.federate.force',
        '⚔ {realm} marches with its court to contest {province}. The campaign must win before settlement.',
        noticeParams(s, row)));
      return true;
    }
    if (choice === 'land' && (s.owner[row.target] !== row.patronRealmId ||
        FB.settlementCountyHolder(s, row.target) !== row.patronRealmId)) return false;
    var offered = FB.authorityOfferContractTemplate(s, templateId || 'paid_service', {
      patronRealmId:row.patronRealmId, federateRealmId:row.realmId, hostId:army.id,
      recognitionId:recognitionId || null,
      settlementCountyIds:choice === 'land' ? [row.target] : [] });
    if (!offered) return false;
    row.contractId = offered.id; row.choice = choice;
    FB.federateNegotiateContract(s, offered.id);
    var deal = Q.contract(s, offered.id);
    row.status = deal.effective ? choice === 'service' ? 'service' : 'marching' : 'encamped';
    if (deal.effective && choice === 'land') FB.orderArmy(s, army, row.target);
    FB.news(s, FB.msg('news.federate.request',
      '📜 {realm} requests land or paid service from {patron}. Both courts must consent to the exact terms.',
      noticeParams(s, row)));
    return true;
  };

  Q.federateSettlementQuote = function (s, id) {
    var row = migration(s, id), army = row && host(s, row.hostId);
    if (!row || !ongoing(row) || row.endTurn <= s.turn || !army || army.men <= 0 ||
        !mobile(s, row.realmId) || FB.governments.problems(row.settlementForm).length ||
        FB.governments.resolve(row.settlementForm).use.territory.movingCourt ||
        !live(s, row.realmId) || army.realm !== row.realmId || army.at !== row.target ||
        army.moveLeft > 0 || FB.isRealmAtWar(s, row.realmId)) return null;
    var deal = row.contractId && Q.contract(s, row.contractId);
    var awarded = row.choice === 'land' && deal && deal.effective &&
      deal.settlementCountyIds.indexOf(row.target) >= 0 &&
      s.owner[row.target] === row.patronRealmId &&
      FB.settlementCountyHolder(s, row.target) === row.patronRealmId;
    if (!awarded && (s.owner[row.target] !== row.realmId ||
        FB.settlementCountyHolder(s, row.target) !== row.realmId)) return null;
    return { migrationId:id, realmId:row.realmId, provinceId:row.target,
      owner:s.owner[row.target], holder:s.holder[row.target],
      rulerGeneration:FB.realmRulerGeneration(s, row.realmId),
      patronGeneration:FB.realmRulerGeneration(s, row.patronRealmId),
      signature:JSON.stringify([row, army, deal || null]) };
  };
  FB.federateResolveSettlement = function (s, id, reviewed) {
    var quote = Q.federateSettlementQuote(s, id), row = migration(s, id);
    if (!quote || !reviewed || JSON.stringify(quote) !== JSON.stringify(reviewed)) return false;
    if (!row.session) row.session = FB.settlement.create({ kind:'federate_migration',
      seats:[row.patronRealmId, row.realmId],
      assets:[{ id:row.target, kind:'county', land:true }],
      claims:[{ asset:row.target, claimant:row.realmId,
        beneficiary:{ kind:'realm', id:row.realmId },
        basis:{ contribution:1, vow:1, occupation:1, right:1, support:1, office:1 } }] });
    while (row.session.status === 'open')
      if (!FB.settlement.act(s, row.session, 'acquiesce')) return false;
    if (!row.session.awards.some(function (award) {
      return award.asset === row.target && award.claimant === row.realmId;
    })) return false;
    if (s.owner[row.target] !== row.realmId) FB.transferProvince(s, row.target, row.realmId);
    s.holder[row.target] = row.realmId;
    FB.authoritySetGovernment(s, row.realmId, row.settlementForm);
    s.realms[row.realmId].nonTerritorial = false;
    s.realms[row.realmId].capital = row.target;
    row.status = 'settled'; row.settledTurn = s.turn;
    delete host(s, row.hostId).migrationId;
    if (row.contractId) {
      var deal = s.authority.contracts.find(function (item) { return item.id === row.contractId; });
      if (deal) {
        if (deal.settlementCountyIds.indexOf(row.target) >= 0)
          deal.fulfilledCountyIds = (deal.fulfilledCountyIds || []).concat(row.target);
        deal.status = 'expired'; deal.changedTurn = s.turn; deal.transitionReason = 'settled';
      }
    }
    FB.invalidateRealmCache();
    FB.news(s, FB.msg('news.federate.settled',
      '🏛 {realm} settles at {province} through a claims session. Its court now governs a territorial {term:holding}.',
      noticeParams(s, row)));
    return true;
  };

  FB.federateDeclineContract = function (s, id) {
    var row = migration(s, id), army = row && host(s, row.hostId);
    if (!row || !ongoing(row) || !army ||
        army.realm !== row.realmId || row.endTurn <= s.turn ||
        ['land','service'].indexOf(row.choice) < 0) return false;
    var deal = row.contractId && Q.contract(s, row.contractId);
    if (deal && ['active','offered'].indexOf(deal.status) >= 0)
      FB.authorityContractTransition(s, deal.id, 'breach', row.realmId);
    row.choice = null; row.status = 'encamped';
    army.path = []; army.goal = null; army.moveLeft = 0;
    return true;
  };

  function fail(s, row, reason) {
    row.status = 'failed'; row.failureReason = reason; row.changedTurn = s.turn;
    var army = host(s, row.hostId);
    if (army) delete army.migrationId;
    if (row.contractId) FB.authorityContractTransition(s, row.contractId, 'breach', row.realmId);
    if (!FB.realmTerritory(s, row.realmId).length && live(s, row.realmId))
      FB.markRealmDead(s, row.realmId);
    /* Expiry or extinction retires all remaining banners of a landless
       polity. A destroyed host is never recreated by the story. */
    if (!live(s, row.realmId)) s.armies = s.armies.filter(function (a) { return a.realm !== row.realmId; });
    FB.news(s, FB.msg('news.federate.failed',
      '🏳 {realm}’s moving court cannot complete its settlement at {province}. Its migration has ended.',
      noticeParams(s, row)));
  }
  FB.federateDay = function (s) {
    for (var row of rows(s)) {
      if (!ongoing(row)) continue;
      var army = host(s, row.hostId);
      if (!live(s, row.realmId) || !army || army.men <= 0 || army.realm !== row.realmId ||
          !mobile(s, row.realmId) || row.endTurn <= s.turn) {
        fail(s, row, row.endTurn <= s.turn ? 'term_ended' : 'host_or_polity_lost'); continue;
      }
      court(s, row, army);
      if (row.choice === 'force' && !FB.ordinaryWarById(s, row.warId) &&
          s.owner[row.target] !== row.realmId) { fail(s, row, 'campaign_lost'); continue; }
      if (row.choice === 'force' && !FB.ordinaryWarById(s, row.warId) &&
          army.at !== row.target && !army.moveLeft && !army.path.length)
        FB.orderArmy(s, army, row.target);
      if (row.choice === 'land' || row.choice === 'service') {
        var deal = row.contractId && Q.contract(s, row.contractId);
        if (!deal || !deal.effective) {
          row.status = 'encamped';
          army.path = []; army.goal = null; army.moveLeft = 0;
          continue;
        }
        row.status = row.choice === 'service' ? 'service' : 'marching';
        if (row.choice === 'land' && army.at !== row.target && !army.moveLeft && !army.path.length)
          FB.orderArmy(s, army, row.target);
      }
      if (row.choice && army.at === row.target && !army.moveLeft) {
        var quote = Q.federateSettlementQuote(s, row.id);
        if (quote) FB.federateResolveSettlement(s, row.id, quote);
      }
    }
  };
  /* Commitments can lapse before today's movement. Reconcile them before
     army orders as well as after the resulting marches and battles. */
  FB.federatePrepareDay = function (s) {
    for (var row of rows(s)) {
      if (!ongoing(row)) continue;
      var army = host(s, row.hostId);
      if (!live(s, row.realmId) || !army || army.realm !== row.realmId ||
          army.men <= 0 || row.endTurn <= s.turn || !mobile(s, row.realmId)) {
        fail(s, row, row.endTurn <= s.turn ? 'term_ended' : 'host_or_polity_lost'); continue;
      }
      var deal = row.contractId && Q.contract(s, row.contractId);
      if ((row.choice === 'land' || row.choice === 'service') && (!deal || !deal.effective)) {
        row.status = 'encamped'; army.path = []; army.goal = null; army.moveLeft = 0;
      }
    }
  };
  var territory = FB.governments.strategy('territory', 'non_territorial');
  territory.beginMigration = FB.federateBeginMigration;
  territory.court = Q.movingPolities;

  FB.validateFederateData = function () {
    var errors = [], terms = FBDATA.federateContractTerms || {};
    for (var id in terms) if (own(terms, id)) {
      var def = terms[id];
      if (!def || !Number.isFinite(def.payPerSeason) || def.payPerSeason < 0 ||
          def.initialPay !== undefined && (!Number.isFinite(def.initialPay) || def.initialPay < 0) ||
          !Number.isInteger(def.durationDays) || def.durationDays <= 0 ||
          !Number.isInteger(def.renewWindowDays) || def.renewWindowDays < 0 ||
          def.renewWindowDays >= def.durationDays || typeof def.autoRenew !== 'boolean' ||
          ['host','none'].indexOf(def.service) < 0 || ['optional','conquest','none'].indexOf(def.land) < 0 ||
          ['optional','required','none'].indexOf(def.recognition) < 0)
        errors.push(FB.T('Invalid federate contract terms {id}.', { id:id }));
    }
    var chains = FBDATA.federateMigrations || {};
    for (var key in chains) if (own(chains, key)) {
      var chain = chains[key];
      if (!chain || !terms[chain.templateId] || !FBDATA.governmentForms[chain.settlementForm] ||
          !Number.isInteger(chain.firstYear) || !Number.isInteger(chain.lastYear) ||
          chain.lastYear < chain.firstYear || !Number.isInteger(chain.durationDays) || chain.durationDays <= 0 ||
          ['realmId','patronRealmId','hostId','origin','target'].some(function (field) {
            return typeof chain[field] !== 'string' || !chain[field];
          }) || chain.realmId === chain.patronRealmId || !Number.isInteger(chain.men) || chain.men <= 0 ||
          !chain.units || Object.keys(chain.units).some(function (unit) {
            return !FBDATA.unitClasses[unit] || !Number.isInteger(chain.units[unit]) || chain.units[unit] < 0;
          }) || Object.keys(chain.units).reduce(function (n, unit) { return n + chain.units[unit]; }, 0) !== chain.men)
        errors.push(FB.T('Invalid federate migration {id}.', { id:key }));
    }
    return errors;
  };
})();
