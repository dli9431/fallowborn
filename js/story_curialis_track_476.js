/* The civic household opening uses the shared story review and real local
   authority. Its mandate stays separate from land and the federate bargain. */
(function () {
  'use strict';
  var TRACK = 'curialis_track_476', X = FB.story476;
  function quote(s, t, id) {
    var w = X.world(s), me = s.chars[s.player.charId];
    var rule = FB.station.promotion(s.player, s), cost = rule && rule.cost;
    var elevation = FB.standingElevationStatus(s, null, null, true);
    var ref = X.person(s.player.charId), offices = FB.political.offices(s, ref);
    var occupied = (s.authority.appointments || []).filter(function (row) {
      return row.officeId === 'judicial_vicar' && row.institutionId === 'italy' &&
        row.scope.kind === 'county' && row.scope.id === 'ravenna' &&
        FB.political.offices(s, row.holder).some(function (o) {
          return o.ref.appointmentId === row.id && o.status === 'active';
        });
    }).map(function (row) { return row.id; });
    var facts = { phase:t.phase, charId:me && me.id, dead:!me || !!me.dead,
      province:s.player.provinceId, travel:!!s.player.travel, tier:s.player.tier,
      context:FB.station.context(s.player, s),
      rule:rule,
      elevation:elevation && elevation.stamp, occupied:occupied,
      owner:s.owner.ravenna, holder:s.holder.ravenna,
      generation:FB.realmRulerGeneration(s, 'italy'),
      court:!!FB.political.actor(s, X.actor('italy')),
      religion:me && me.religion,
      delegate:w && X.alive(s, w.civicDelegateId),
      bishop:w && X.alive(s, w.bishopId),
      majority:FB.countyReligionShare(s, 'ravenna', 'nicene'),
      gold:s.player.gold, prestige:s.player.prestige,
      offices:offices.map(function (o) { return [o.ref.appointmentId, o.status]; }) };
    var allowed = t.phase === 'opening' && !facts.dead &&
      (id === 'keep_household' || id === 'serve_council' && FB.station.isGentry(s.player, s) &&
        facts.province === 'ravenna' && !facts.travel && facts.owner === 'italy' &&
        facts.holder === 'italy' && facts.court && facts.delegate && facts.bishop && facts.religion === 'nicene' &&
        facts.majority >= 0.5 && !occupied.length && elevation && elevation.ready &&
        cost && facts.gold >= 10 + cost.gold &&
        facts.prestige >= Math.max(30, cost.prestige) && s.player.piety >= cost.piety);
    return { id:id, allowed:!!allowed, reason:'civic_opening', facts:facts, stamp:JSON.stringify(facts) };
  }
  function apply(s, t, id, reviewed) {
    var q = quote(s, t, id);
    if (!q.allowed || !reviewed || q.stamp !== reviewed.stamp) return false;
    if (id === 'serve_council') {
      var ref = X.person(s.player.charId), at = { kind:'county', id:'ravenna' };
      var rec = X.recognizeOrExisting(s, 'civic_acceptance', at, ref, at);
      if (!rec) return false;
      var office = X.appointment(s, 'judicial_vicar', 'italy', ref, at, rec.id);
      if (!office) return false;
      var elevation = FB.standingElevationStatus(s);
      if (!elevation || !elevation.ready || !FB.claimRankElevation(s,
        FB.rankElevationContext(s, elevation), { combinedResult:true })) return false;
      s.player.gold -= 10;
      t.officeId = office.id;
      t.result = 'civic_mandate';
      FB.news(s, FB.msg('news.476.curial_mandate',
        '🏛 Your civic household accepts Ravenna’s local judicial mandate. Land and revenue stay with their existing holders.', {}));
    } else t.result = 'household';
    t.phase = 'complete'; t.outcomeTurn = s.turn;
    return true;
  }
  FB.stories.register({ id:TRACK, kind:'track', requires:['western_court_476'],
    init:function () { return { phase:'opening', result:null, officeId:null, outcomeTurn:null }; },
    title:function () { return FB.T('A civic household, 476'); },
    intro:function () { return FB.T('Council service can raise personal standing. The court’s mandate supplies local Peace; it leaves land, revenue and host command separate.'); },
    status:function (s, t) {
      return { phase:t.phase, name:t.phase === 'opening' ? FB.T('Ravenna needs civic service') : FB.T('The civic household continues'),
        lines:t.officeId ? [FB.political.offices(s, X.person(s.player.charId)).some(function (o) {
          return o.ref.appointmentId === t.officeId && o.status === 'active';
        }) ? FB.T('Your local judicial mandate is effective.') : FB.T('The former mandate has lapsed; standing grants no judicial power by itself.')] : [] };
    },
    choices:function (s, t) { return t.phase !== 'opening' ? [] : [
      { id:'serve_council', label:FB.T('Accept the civic mandate'), detail:FB.T('Register the mandate, fund station recognition and receive Ravenna’s local judicial appointment. A living western court, delegate and bishop and a Nicene majority are required.') },
      { id:'keep_household', label:FB.T('Keep the household outside the dispute'), detail:FB.T('Continue in curial work without payment, promotion or an appointment. Your family remains playable.') }
    ]; },
    quote:quote, apply:apply,
    review:function (s, t, id) {
      if (id !== 'serve_council') return [];
      var rule = FB.station.promotion(s.player, s), cost = rule && rule.cost;
      return cost ? [FB.T('Registration and recognition: {money:amount}, {prestige} prestige and {piety} piety. The mandate grants local Peace and the next station, with no county, revenue or host command.',
        { amount:10 + cost.gold, prestige:cost.prestige, piety:cost.piety })] : [];
    },
    blocker:function (s) {
      var rule = FB.station.promotion(s.player, s), cost = rule && rule.cost;
      return FB.T('An adult curialis at Ravenna needs an available judicial mandate, a living court, civic delegate and bishop, Nicene support, {money:amount} and {prestige} prestige before payment.',
        { amount:10 + (cost ? cost.gold : 0), prestige:Math.max(30, cost ? cost.prestige : 0) });
    },
    validate:function (t) {
      if (['opening','complete'].indexOf(t.phase) < 0 ||
          [null,'civic_mandate','household'].indexOf(t.result) < 0 ||
          t.officeId !== null && typeof t.officeId !== 'string' ||
          t.outcomeTurn !== null && (!Number.isInteger(t.outcomeTurn) || t.outcomeTurn < 0))
        throw new Error(FB.T('Invalid v4 save field at {path}.', { path:'state.stories.' + TRACK }));
    }
  });
})();
