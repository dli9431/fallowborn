/* Personal records do not exercise the following's public mandate. */
window.FBDATA = window.FBDATA || {};

FBDATA.householdTracks_koten_1241 = {
  koten_safety_1241:{ id:'koten_safety_1241', type:'household_track',
    title:'Koten: personal choices under guard',
    intro:'Consider your own circumstances, the separate following and plans that still require lawful consent. Recording a priority makes no public decision.',
    homeProvinceId:'szekesfehervar', continuity:'protagonist', interruptedStage:'interrupted', initialStage:'circumstances',
    requirements:{ provinces:['szekesfehervar'] },
    stages:{
      circumstances:{ name:'A separate personal party', text:'At opening you are under protective guard at Obuda, a disclosed Buda/Pest location within the broad county. The following’s households and field host retain their separate location records. Review current guard records for any later change.',
        choices:[
          { id:'review_position', label:'Consider your present position', detail:'Record a personal review without changing guard, access or command.', operation:{ kind:'record_decision' }, next:'private_needs' },
          { id:'postpone', label:'Postpone a personal plan', detail:'Conclude this review without a promise of safety or release.', operation:{ kind:'record_decision' }, next:'deferred' }
        ], transitions:[] },
      private_needs:{ name:'Your own resources', text:'Your private purse belongs to your personal livelihood. The following’s stores, fighters and public account retain their separate owners. A personal priority spends none of them.',
        choices:[
          { id:'keep_private_resources', label:'Keep private resources available', detail:'Record an intention without a purchase, public transfer or grant.', operation:{ kind:'record_decision' }, next:'hosting' },
          { id:'leave_plans_open', label:'Leave plans open', detail:'Conclude without changing resources or obligations.', operation:{ kind:'record_decision' }, next:'deferred' }
        ], transitions:[] },
      hosting:{ name:'The host’s actual authority', text:'Hosting and protective guard have separate finite terms. Only a lawful host review can release the guarded party. Recording your preference neither renews an agreement nor commits the host to protection.',
        choices:[
          { id:'consider_hosting', label:'Keep the host’s terms in view', detail:'Record a private priority. Use current public controls for any actual host decision.', operation:{ kind:'record_decision' }, next:'following' },
          { id:'accept_present_position', label:'Make no new request', detail:'Conclude with the actual public arrangements unchanged.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      following:{ name:'People in separate camps', text:'The following’s civilian camps, reserves and field host have their own locations and finite provisions. Your personal presence does not carry those people, renew their access or make their households your relatives.',
        choices:[
          { id:'consider_following', label:'Consider the separate households', detail:'Record attention without moving a camp, spending its food or assuming command.', operation:{ kind:'record_decision' }, next:'onward' },
          { id:'finish_here', label:'Keep present personal plans', detail:'Conclude the review with no relocation or public commitment.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      onward:{ name:'Later movement remains a separate decision', text:'Any personal departure requires actual release and an eligible paid journey. Command additionally requires the living mandate and real reach to the following. A personal review promises no route, refuge or whole-following move.',
        choices:[
          { id:'keep_options_open', label:'Keep later options open', detail:'Complete the private review. Ordinary controls retain all movement, consent and cost requirements.', operation:{ kind:'record_decision' }, next:'reviewed' },
          { id:'remain_here', label:'Make no travel plan', detail:'Conclude without departing, releasing guard or moving the following.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      stayed:{ name:'Present personal arrangements', text:'This review has ended. The actual guard, agreements, livelihood and public mandate continue under their ordinary rules.', terminal:true, choices:[], transitions:[] },
      deferred:{ name:'A personal plan left open', text:'You postponed this opening review. Nothing here extends protection, releases guard or changes the following’s resources.', terminal:true, choices:[], transitions:[] },
      reviewed:{ name:'The personal review is complete', text:'Your priorities are recorded. Later public or personal actions still need their current authority, consent, resources and presence.', terminal:true, choices:[], transitions:[] },
      elsewhere:{ name:'Beyond the opening review', text:'You are no longer present for this local review. It claims no accompanying family, relocated following or new home.', terminal:true, choices:[], transitions:[] },
      interrupted:{ name:'The original personal review ended', text:'Death or protagonist succession ended the unfinished review. The next protagonist receives no inherited release or effective command from these decisions.', terminal:true, choices:[], transitions:[] }
    }
  }
};
(function () {
  'use strict';
  var d=FBDATA.householdTracks_koten_1241.koten_safety_1241;
  ['circumstances','private_needs','hosting','following','onward'].forEach(function (id) {
    d.stages[id].transitions=[{when:{not:{kind:'present',provinceId:'szekesfehervar'}},next:'elsewhere'}];
  });
  Object.assign(FBDATA.storyInstances,FBDATA.householdTracks_koten_1241);
})();
