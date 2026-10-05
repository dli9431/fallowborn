/* Nepos pursues a living claim. Restoration requires an actual campaign
   award; neither recognition nor a historical date transfers Italy. */
(function () {
  'use strict';
  var ID = 'nepos_track_476', X = FB.story476, R = FB.startRealmId;
  function quote(s, t, id) {
    var w = X.world(s), ref = X.person(t.claimantId), owner = s.owner.ravenna;
    var senate = X.alive(s, w.senatorId) && FB.political.permission(s,
      X.person(w.senatorId), 'civic_agreement', { provinceId:'roma' }).allowed;
    var east = FB.political.actor(s, X.actor(R(s, 'byzantium')));
    var claim = FB.political.legitimacy(s, ref, null, 'imperial_commission').filter(function (row) {
      return row.scope && row.scope.kind === 'realm' &&
        [R(s, 'italy'),'player'].indexOf(row.scope.id) >= 0;
    });
    var facts = { phase:t.phase, claimant:t.claimantId, player:s.player.charId,
      dead:!X.alive(s, t.claimantId) || !!s.player.dead, turn:s.turn,
      owner:owner, holder:s.holder.ravenna, senate:!!senate,
      senateId:w.senatorId, east:east && east.characterId,
      easternGeneration:FB.realmRulerGeneration(s, R(s, 'byzantium')),
      playerGeneration:FB.realmRulerGeneration(s, 'player'),
      at:s.player.provinceId, travel:!!s.player.travel,
      recognition:claim.map(function (row) { return row.id; }),
      appointments:s.authority.appointments, wars:[FB.isRealmAtWar(s, 'player'), FB.isRealmAtWar(s, owner)] };
    var live = !facts.dead && facts.player === t.claimantId &&
      ['complete','interrupted'].indexOf(t.phase) < 0;
    var allowed = live && (id === 'keep_dalmatia' ||
      id === 'seek_recognition' && (t.phase === 'opening' || claim.length === 0) && !!east && senate ||
      id === 'restore_by_campaign' && t.phase === 'claim' && claim.length > 0 &&
        owner && owner !== 'player' && !facts.wars[0] && !facts.wars[1] ||
      id === 'confirm_restoration' && ['claim','campaign'].indexOf(t.phase) >= 0 &&
        owner === 'player' && !facts.travel && claim.length > 0);
    return { id:id, allowed:!!allowed, reason:'western_claim', facts:facts, stamp:JSON.stringify(facts) };
  }
  function apply(s, t, id, reviewed) {
    var q = quote(s, t, id), w = X.world(s), ref = X.person(t.claimantId);
    if (!q.allowed || !reviewed || reviewed.id !== id || q.stamp !== reviewed.stamp) return false;
    if (id === 'keep_dalmatia') { t.phase = 'complete'; t.result = 'dalmatia'; t.outcomeTurn = s.turn; }
    else if (id === 'seek_recognition') {
      var east = X.recognizeOrExisting(s, 'imperial_commission', X.actor(R(s, 'byzantium')),
        ref, X.actor(s.realms[R(s, 'italy')] && s.realms[R(s, 'italy')].alive ? R(s, 'italy') : 'player'));
      var senate = X.recognizeOrExisting(s, 'civic_acceptance', { kind:'county', id:'roma' },
        ref, { kind:'county', id:'roma' });
      if (!east || !senate) return false;
      t.recognitionId = east.id; t.senateRecognitionId = senate.id;
      if (t.phase !== 'campaign') t.phase = 'claim';
      w.westernOfficeResolved = 'nepos';
      X.syncWestOffice(s);
      FB.news(s, FB.msg('news.476.nepos_player_claim',
        '📜 Nepos pursues the western claim with eastern recognition and Roman civic support. Dalmatia and Italy remain separate.', {}));
    } else if (id === 'restore_by_campaign') {
      var war = FB.registerOrdinaryWar(s, 'player', { enemy:s.owner.ravenna, target:'ravenna',
        legacy:false, casus:{ type:'border', target:'ravenna' }, objectives:[{ type:'border', target:'ravenna' }] });
      if (!war) return false;
      t.warId = war.id; t.phase = 'campaign';
    } else if (id === 'confirm_restoration') {
      var rec = X.recognizeOrExisting(s, 'imperial_commission', X.actor(R(s, 'byzantium')),
        ref, X.actor('player'));
      var office = rec && X.appointment(s, 'imperial_office', 'player', ref, X.actor('player'), rec.id);
      if (!office) return false;
      t.officeId = office.id; t.phase = 'complete'; t.result = 'restored'; t.outcomeTurn = s.turn;
      w.restoredClaimantId = t.claimantId; w.restoredCourtId = 'player';
      w.restoredOfficeId = office.id; w.westernOfficeResolved = 'restored';
      X.syncWestOffice(s);
      FB.news(s, FB.msg('news.476.nepos_player_restored',
        '🏛 Nepos confirms a restored western mandate after actually securing Ravenna. The office itself grants no additional land.', {}));
    }
    return true;
  }
  FB.stories.register({ id:ID, kind:'track', requires:['western_court_476','western_office_476'],
    init:function (s) { return { phase:'opening', result:null, claimantId:s.player.charId,
      recognitionId:null, senateRecognitionId:null, warId:null, officeId:null, outcomeTurn:null }; },
    title:function () { return FB.T('Nepos’s western claim'); },
    intro:function () { return FB.T('Review a living claim, then decide whether to pursue Ravenna through ordinary war. Eastern recognition and Roman civic support create no territorial award.'); },
    status:function (s, t) {
      var names = { opening:FB.T('Dalmatia and a contested office'), claim:FB.T('Recognition without Italy'),
        campaign:FB.T('Restoration depends on the armies'), complete:FB.T('The Dalmatian household continues'),
        interrupted:FB.T('The claimant’s opportunity ended') };
      return { phase:t.phase, name:t.result === 'restored' ? FB.T('Western mandate restored') : names[t.phase],
        lines:[FB.T('Review Offices & Legitimacy for current issuers and effective mandates.')] };
    },
    choices:function (s, t) {
      if (['complete','interrupted'].indexOf(t.phase) >= 0) return [];
      var out = [{ id:'keep_dalmatia', label:FB.T('Continue ruling Dalmatia'),
        detail:FB.T('Finish this opening without payment, a campaign or a new office. Existing claims and territory remain subject to ordinary rules.') }];
      if (t.phase === 'opening') out.unshift({ id:'seek_recognition', label:FB.T('Pursue western recognition'),
        detail:FB.T('Seek current eastern recognition and Roman civic support for the western claim. A living eastern ruler and an effective Roman civic delegate are required. No payment or territorial transfer occurs.') });
      else {
        out.unshift({ id:'seek_recognition', label:FB.T('Renew western recognition'),
          detail:FB.T('If the former mandate has lapsed, seek recognition from the current eastern court and the Roman civic delegate. This creates no territorial award and costs no payment.') });
        out.unshift({ id:'confirm_restoration', label:FB.T('Confirm the restored western mandate'),
          detail:FB.T('Requires actual possession of Ravenna and living recognition. Creates an imperial appointment in your own court, with no additional land or fiscal power.') });
        if (t.phase === 'claim') out.unshift({ id:'restore_by_campaign', label:FB.T('Campaign for Ravenna'),
          detail:FB.T('Declare an ordinary war against Ravenna’s actual owner. Your armies must win the objective; military costs and risks follow the normal campaign rules.') });
      }
      return out;
    },
    quote:quote, apply:apply,
    blocker:function () { return FB.T('The original living claimant needs the current eastern ruler and Roman civic delegate for recognition. Restoration also requires actual possession of Ravenna; a campaign requires peaceful courts.'); },
    day:function (s, t) {
      if (['complete','interrupted'].indexOf(t.phase) >= 0) return;
      if (!X.alive(s, t.claimantId) || s.player.charId !== t.claimantId) {
        t.phase = 'interrupted'; t.result = 'interrupted'; t.outcomeTurn = s.turn;
      } else if (t.phase === 'campaign' && !FB.ordinaryWarById(s, t.warId) && s.owner.ravenna !== 'player') {
        t.phase = 'claim'; t.warId = null;
      }
    },
    validate:function (t) {
      var valid = ['opening','claim','campaign','complete','interrupted'].indexOf(t.phase) >= 0 &&
        [null,'dalmatia','restored','interrupted'].indexOf(t.result) >= 0 && typeof t.claimantId === 'string';
      ['recognitionId','senateRecognitionId','warId','officeId'].forEach(function (key) {
        if (t[key] !== null && (typeof t[key] !== 'string' || !t[key])) valid = false;
      });
      if (t.outcomeTurn !== null && (!Number.isInteger(t.outcomeTurn) || t.outcomeTurn < 0) ||
          ['complete','interrupted'].indexOf(t.phase) >= 0 && (!t.result || t.outcomeTurn === null) ||
          ['complete','interrupted'].indexOf(t.phase) < 0 && (t.result !== null || t.outcomeTurn !== null) ||
          t.phase === 'campaign' && !t.warId ||
          t.result === 'restored' && !t.officeId ||
          ['claim','campaign'].indexOf(t.phase) >= 0 && (!t.recognitionId || !t.senateRecognitionId)) valid = false;
      if (!valid) throw new Error(FB.T('Invalid v4 save field at {path}.', { path:'state.stories.' + ID }));
    }
  });
})();
