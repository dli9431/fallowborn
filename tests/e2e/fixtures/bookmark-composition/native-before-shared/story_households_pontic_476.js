/* A farming household's choices follow the actual civilian camp. */
window.FBDATA = window.FBDATA || {};

FBDATA.householdTracks_pontic_476 = {
  pontic_household_track_476:{ id:'pontic_household_track_476', type:'household_track',
    title:'A Farm beside the Following',
    intro:'Your farm lies near Cherson. Work with the nearby camp if its people can pay, or keep your labor at home. Neither choice obliges you to follow its court.',
    homeProvinceId:'cherson', continuity:'household', initialStage:'opening',
    requirements:{ provinces:['cherson'], realms:['pontic_following_476'] },
    stages:{
      opening:{ name:'A camp near the fields', text:'The civilian following is near the farm. Its people need food and lawful access; your household needs its own labor. You hold no authority over their supplies or agreements.',
        choices:[
          { id:'seek_work', label:'Ask about paid camp work', detail:'Review one actual service payment before agreeing. Asking pays nothing and grants no membership.', operation:{ kind:'record_decision' }, next:'work_offer' },
          { id:'keep_farming', label:'Keep today’s labor on the farm', detail:'Retain your time and property without paying a levy or losing standing.', operation:{ kind:'record_decision' }, next:'supplies' }
        ], transitions:[] },
      work_offer:{ name:'One paid service', text:'An available worker aged sixteen or older can take one service today. The coalition must have the food and treasury funds. You may return to the farm if any requirement fails.',
        choices:[
          { id:'work', label:'Accept one paid service', detail:'Receive the ordinary payment from the coalition treasury; its camp consumes one food unit. A second payment today is unavailable.', operation:{ kind:'mobile_work', realmId:'pontic_following_476' }, next:'supplies' },
          { id:'decline', label:'Return to ordinary household work', detail:'No camp payment, food consumption or work commitment occurs.', operation:{ kind:'record_decision' }, next:'supplies' }
        ], transitions:[] },
      supplies:{ name:'Stores and lawful access', text:'These are the camp’s actual stocks and access terms. A market is no promise of free food. Buying provisions and negotiating pasture belong to the coalition and the lawful outside court.',
        choices:[
          { id:'another_service', label:'Offer another eligible day’s service', detail:'Use the same ordinary work gate. A payment already received today, missing food or an empty treasury blocks acceptance.', operation:{ kind:'mobile_work', realmId:'pontic_following_476' }, next:'waiting' },
          { id:'watch', label:'Keep the farm and leave future work open', detail:'Record an intention without joining the following, reserving wages or creating provisions.', operation:{ kind:'record_decision' }, next:'waiting' },
          { id:'finish', label:'Keep the household independent', detail:'End this connection without moving anyone, forfeiting the farm or ending ordinary work options.', operation:{ kind:'record_decision' }, next:'rooted_household' }
        ], transitions:[] },
      scarce:{ name:'The stores are running low', text:'Current camp food is below the following’s ordinary thirty-day threshold. This is a live shortage, not a promised famine at Cherson. Your work cannot create food or negotiate access.',
        choices:[
          { id:'work', label:'Offer an eligible paid service', detail:'The ordinary treasury and one-food-unit requirement still apply. Scarcity grants no exception.', operation:{ kind:'mobile_work', realmId:'pontic_following_476' }, next:'waiting' },
          { id:'watch', label:'Keep your labor available at home', detail:'Leave any later work optional and do not donate food, pay tribute or join the following.', operation:{ kind:'record_decision' }, next:'waiting' },
          { id:'finish', label:'End the camp connection', detail:'Keep the household’s existing home, identity and property.', operation:{ kind:'record_decision' }, next:'rooted_household' }
        ], transitions:[] },
      waiting:{ name:'Farm and camp', text:'The farm remains your household’s home. Paid work has not made you a member or moved named relatives. Membership, if wanted, has its own age, local consent and counted-population review in Mobile coalition.',
        choices:[
          { id:'finish', label:'Keep the farm as your priority', detail:'Close the household story without a further transaction. Ordinary paid service remains available independently.', operation:{ kind:'record_decision' }, next:'rooted_household' }
        ], transitions:[] },
      stationary:{ name:'The camp has stayed', text:'A first campaign season has passed without a civilian-court departure from Cherson. You need not wait for an invented migration to finish this household decision.',
        choices:[
          { id:'farm', label:'Continue as an independent farming household', detail:'Retain your existing home and property. No new payment or population transfer occurs.', operation:{ kind:'record_decision' }, next:'rooted_household' },
          { id:'local_work', label:'Leave ordinary local work open', detail:'Finish this story while retaining the ordinary Mobile coalition work option and its live requirements. No wage is reserved or paid now.', operation:{ kind:'record_decision' }, next:'continued_local' }
        ], transitions:[] },
      departure:{ name:'The civilian camp is moving', text:'The following’s civilian court has moved away from Cherson or begun an actual move. A field host marching alone would not bring this decision. Your farm is not forfeited.',
        choices:[
          { id:'stay', label:'Keep the existing household home', detail:'Close the connection without travel, a transfer of property or a promise of safety.', operation:{ kind:'record_decision' }, next:'rooted_household' },
          { id:'seek_camp', label:'Consider work near the new camp', detail:'Review its actual destination. Choosing this plan starts no journey and moves no relatives.', operation:{ kind:'record_decision' }, next:'road_review' }
        ], transitions:[] },
      road_review:{ name:'Review the road to the camp', text:'The civilian camp must be stationary at an ordinary reachable court destination before a new journey can begin. It may move again. No route, job or safe arrival is promised.',
        choices:[
          { id:'go', label:'Go ahead alone to seek camp work', detail:'Use an ordinary Paid service journey to the current court. Pay its actual route price; named relatives and permanent holdings stay at home.', operation:{ kind:'travel_mobile', realmId:'pontic_following_476', purposeId:'service' }, next:'journey' },
          { id:'stop', label:'Abandon the pursuit', detail:'Close the story without a new journey or a property transfer.', operation:{ kind:'record_decision' }, next:'ended_service' }
        ], transitions:[] },
      journey:{ name:'Seeking the civilian camp', text:'Your existing journey owns the route and its risks. Work is available only at the actual active camp. If it moves again, you may turn back or end the pursuit without moving relatives.',
        choices:[
          { id:'turn_back', label:'Review the ordinary return home', detail:'Use the existing journey’s turn-back or return rules. A minimum stay may apply; this does not certify arrival home.', operation:{ kind:'return_home' }, next:'returning' },
          { id:'stop', label:'End the camp pursuit', detail:'End only this story. Your existing journey remains under its ordinary travel controls.', operation:{ kind:'record_decision' }, next:'ended_service' }
        ], transitions:[] },
      camp_work:{ name:'At the actual camp', text:'You are physically at the active civilian camp. Your permanent home and named relatives have not been resettled by arriving. A member carried with the court also uses these same work rules.',
        choices:[
          { id:'work', label:'Take an eligible paid service here', detail:'Commit one ordinary work payment from the real treasury with one food unit consumed. This grants no land or membership.', operation:{ kind:'mobile_work', realmId:'pontic_following_476' }, next:'road_worker' },
          { id:'return', label:'Review the ordinary return home', detail:'Use the existing personal journey, when one exists, and retain its minimum-stay requirement. Coalition membership has its separate leave rules.', operation:{ kind:'return_home' }, next:'returning' },
          { id:'finish', label:'End this connection here', detail:'No person, property or population is moved. Ordinary travel and coalition controls remain available.', operation:{ kind:'record_decision' }, next:'ended_service' }
        ], transitions:[] },
      lost_contact:{ name:'The camp is elsewhere', text:'The following has moved again or you are no longer at its camp. There is no compulsory pursuit and no remote camp payment.',
        choices:[
          { id:'return', label:'Review return on your existing journey', detail:'Use ordinary turn-back or return requirements. This starts no second journey.', operation:{ kind:'return_home' }, next:'returning' },
          { id:'finish', label:'End the pursuit', detail:'Leave the current journey, household home and any membership to their ordinary owners.', operation:{ kind:'record_decision' }, next:'ended_service' }
        ], transitions:[] },
      returning:{ name:'Returning toward home', text:'The ordinary journey is bringing the protagonist back. Completion waits for actual presence at Cherson after the journey ends; the story never sets a position.', choices:[], transitions:[] },
      rooted_household:{ name:'The farm remains your priority', text:'The household’s existing home, identity and property remain under ordinary rules. You made no new membership, migration or political commitment through this decision.', terminal:true, choices:[], transitions:[] },
      continued_local:{ name:'Local work remains optional', text:'The household story is complete. Any later camp service needs its own current ordinary review, actual presence, food and treasury funds.', terminal:true, choices:[], transitions:[] },
      road_worker:{ name:'Paid work at the living camp', text:'The ordinary local work transaction paid once at the actual camp. It moved no named relatives, transferred no farm and guaranteed no future work.', terminal:true, choices:[], transitions:[] },
      returned_household:{ name:'Back at the household home', text:'The protagonist actually returned to Cherson after the ordinary journey ended. This grants no property, new payment or protection.', terminal:true, choices:[], transitions:[] },
      ended_service:{ name:'The connection has ended', text:'This household connection is closed. The following may have settled, dispersed or become unavailable, or you chose to leave its work behind. No camp, stock, person or payment is recreated.', terminal:true, choices:[], transitions:[] }
    }
  }
};

(function () {
  'use strict';
  var def = FBDATA.householdTracks_pontic_476.pontic_household_track_476;
  function mobile(condition, provinceId) {
    var p = { kind:'mobile_state', realmId:'pontic_following_476', condition:condition };
    if (provinceId) p.provinceId = provinceId;
    return p;
  }
  function route(when, next) { return { when:when, next:next }; }
  var gone = route({ not:mobile('active') }, 'ended_service');
  var moved = route({ any:[{ not:mobile('camp', 'cherson') },mobile('moving')] }, 'departure');
  var firstSeason = route({ kind:'elapsed', minDays:90, sinceCampaign:true }, 'stationary');
  ['opening','work_offer','supplies','scarce','waiting'].forEach(function (id) {
    def.stages[id].transitions = [gone,moved,firstSeason];
  });
  def.stages.supplies.transitions.push(route(mobile('scarce'), 'scarce'));
  def.stages.stationary.transitions = [gone,moved];
  def.stages.departure.transitions = [gone];
  def.stages.road_review.transitions = [gone,
    route({ all:[mobile('present'),{ not:mobile('moving') }] }, 'camp_work')];
  def.stages.journey.transitions = [gone,
    route({ all:[mobile('present'),{ not:mobile('moving') }] }, 'camp_work'),
    route({ not:{ kind:'travelling' } }, 'ended_service'),
    route({ kind:'elapsed', minDays:90 }, 'lost_contact')];
  def.stages.camp_work.transitions = [gone,
    route({ any:[{ not:mobile('present') },mobile('moving')] }, 'lost_contact')];
  def.stages.lost_contact.transitions = [gone,
    route({ all:[mobile('present'),{ not:mobile('moving') }] }, 'camp_work')];
  def.stages.returning.transitions = [
    route({ all:[{ not:{ kind:'travelling' } },{ kind:'home', provinceId:'cherson' },{ kind:'present', provinceId:'cherson' }] }, 'returned_household'),
    route({ not:{ kind:'travelling' } }, 'ended_service')
  ];
  Object.assign(FBDATA.storyInstances, FBDATA.householdTracks_pontic_476);
  FBDATA.startScenarios.forEach(function (scenario) {
    if (scenario.id !== 'mobile_household_476') return;
    scenario.tracks = (scenario.tracks || []).concat([def.id]);
    scenario.trackLocations = Object.assign({}, scenario.trackLocations);
    scenario.trackLocations[def.id] = ['cherson'];
  });
})();
