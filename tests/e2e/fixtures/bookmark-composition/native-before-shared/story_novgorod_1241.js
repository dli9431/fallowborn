/* Local decisions consume only the ordinary household and work contracts. */
window.FBDATA = window.FBDATA || {};

FBDATA.householdTracks_novgorod_1241 = {
  novgorod_household_track_1241:{ id:'novgorod_household_track_1241', type:'household_track',
    title:'A living in Novgorod',
    intro:'Customers, neighbours and uncertain western news leave a local household with choices of its own.',
    homeProvinceId:'novgorod', continuity:'protagonist', interruptedStage:'interrupted', initialStage:'household',
    requirements:{ provinces:['novgorod'] },
    stages:{
      household:{ name:'At the household table', text:'Your livelihood begins with the household and the work you can find in Novgorod. Before making plans, consider what the next customer might need.',
        choices:[
          { id:'take_stock', label:'Take stock of the household', detail:'Consider ordinary craft work with the resources you already have.', operation:{ kind:'record_decision' }, next:'customers' },
          { id:'plan_work', label:'Put craft work first', detail:'Review work at the bench before making other plans.', operation:{ kind:'record_decision' }, next:'customers' }
        ], transitions:[] },
      customers:{ name:'Keep the bench working', text:'Repairs and small orders could support the household. Work at the bench follows the ordinary craft livelihood.',
        choices:[
          { id:'work_bench', label:'Work the bench', detail:'Select ordinary craft work. Payment follows only when the work actually earns money.', operation:{ kind:'set_focus', focusId:'craft_work' }, next:'working' },
          { id:'postpone_work', label:'Leave work for later', detail:'Continue with your present focus and no claimed craft earnings.', operation:{ kind:'record_decision' }, next:'frontier' }
        ], transitions:[] },
      working:{ name:'Hands at the bench', text:'You have chosen craft work. The household is waiting for its first actual earnings here.',
        afterWork:{ focusId:'craft_work', provinceId:'novgorod', next:'frontier' },
        choices:[{ id:'reconsider_work', label:'Reconsider before the work pays', detail:'Continue with your plans without recording paid work.', operation:{ kind:'record_decision' }, next:'frontier' }], transitions:[] },
      frontier:{ name:'News from the western roads', text:'Earlier reports spoke of fighting and pressure on the western frontier. They do not tell you what is happening beside your own home today. You can weigh the uncertainty or keep to household affairs.',
        choices:[
          { id:'weigh_reports', label:'Treat the reports cautiously', detail:'Record your response to the earlier news without assuming a new local attack.', operation:{ kind:'record_decision' }, next:'public_affairs' },
          { id:'keep_to_work', label:'Keep to ordinary affairs', detail:'Leave the uncertain reports aside and consider the household’s next step.', operation:{ kind:'record_decision' }, next:'public_affairs' }
        ], transitions:[] },
      public_affairs:{ name:'The city and its prince', text:'Novgorod’s public affairs reach beyond your bench. Your household can consider its own priorities while the city’s officeholders make their decisions.',
        choices:[
          { id:'consider_authority', label:'Consider your household’s priorities', detail:'Record a personal preference without taking a public office or deciding who governs.', operation:{ kind:'record_decision' }, next:'neighbours' },
          { id:'leave_public_business', label:'Leave public business to its holders', detail:'Continue local life without intervening in the city’s government.', operation:{ kind:'record_decision' }, next:'neighbours' }
        ], transitions:[] },
      neighbours:{ name:'Customers and neighbours', text:'Neighbours and passing customers have concerns of their own. You can put your next ordinary work toward craft orders or leave your current livelihood unchanged.',
        choices:[
          { id:'seek_customers', label:'Seek ordinary craft customers', detail:'Select craft work for later earnings without a promised patron or public contract.', operation:{ kind:'set_focus', focusId:'craft_work' }, next:'roads' },
          { id:'keep_arrangements', label:'Keep your present arrangements', detail:'Continue without buying property or joining an institution.', operation:{ kind:'record_decision' }, next:'roads' }
        ], transitions:[] },
      roads:{ name:'A road for another day', text:'A personal journey would need its own destination, route and price. For now, you can keep your home in Novgorod or leave the question of travelling until later.',
        choices:[
          { id:'stay', label:'Keep the household in Novgorod', detail:'Choose local life with your current home and ordinary work options.', operation:{ kind:'record_decision' }, next:'present_life' },
          { id:'postpone_journey', label:'Leave a journey for later', detail:'Set the idea aside without paying a fare or moving anyone.', operation:{ kind:'record_decision' }, next:'present_life' }
        ], transitions:[] },
      present_life:{ name:'The next ordinary day', text:'Your household’s work and obligations continue under the present arrangements. You can return to craft work or carry on with the livelihood you have chosen.',
        choices:[
          { id:'continue_craft', label:'Continue ordinary craft work', detail:'Select craft work for future days without receiving an extra story payment.', operation:{ kind:'set_focus', focusId:'craft_work' }, next:'future' },
          { id:'continue_life', label:'Continue with present plans', detail:'Keep your current focus and review the end of this opening.', operation:{ kind:'record_decision' }, next:'future' }
        ], transitions:[] },
      future:{ name:'An ordinary future', text:'You have considered work, neighbours and the uncertainty beyond the city. The household’s next chapter will follow the choices you make in ordinary life.',
        choices:[
          { id:'finish', label:'Continue life in Novgorod', detail:'Close this personal opening with your decisions and actual earnings retained.', operation:{ kind:'record_decision' }, next:'concluded' }
        ], transitions:[] },
      concluded:{ name:'Life in Novgorod continues', text:'You kept your home in Novgorod. The household’s work, worship and future fortunes continue through ordinary play.', terminal:true, choices:[], transitions:[] },
      remote:{ name:'A different course', text:'You left this local plan before it finished. Your completed decisions and actual earnings remain; life continues at your present location.', terminal:true, choices:[], transitions:[] },
      postponed:{ name:'Plans left for later', text:'A year has passed since this opening. Your decisions and actual earnings remain, while unfinished plans give way to ordinary life.', terminal:true, choices:[], transitions:[] },
      interrupted:{ name:'The personal plan ended', text:'Death or succession ended this protagonist’s unfinished plan. The next generation makes its own decisions.', terminal:true, choices:[], transitions:[] }
    }
  }
};

FBDATA.openingProfiles_novgorod_1241 = {
  opening_novgorod_1241:{ id:'opening_novgorod_1241', type:'opening_profile',
    title:'The household’s first goals', intro:'Optional goals for ordinary work, a private reserve and a considered household future.',
    scenarioIds:['novgorod_household_1241'], provinceIds:['novgorod'], requires:['novgorod_household_track_1241'],
    goals:[
      { id:'craft_income', name:'Earn from craft work', text:'Earn {money:5} through actual ordinary craft work after the opening.', criterion:{ kind:'earnings', amount:5, focusIds:['craft_work'] } },
      { id:'household_reserve', name:'Keep a private reserve', text:'Hold {money:25} in the private purse as a free household.', criterion:{ kind:'reserve', amount:25 } },
      { id:'household_future', name:'Consider the household’s future', text:'Complete the local household opening and choose to continue life in Novgorod.', criterion:{ kind:'household_phase', storyId:'novgorod_household_track_1241', phases:['concluded'] } }
    ], contacts:[] }
};

(function () {
  'use strict';
  var def = FBDATA.householdTracks_novgorod_1241.novgorod_household_track_1241;
  var local = { all:[{ kind:'home', provinceId:'novgorod' }, { kind:'present', provinceId:'novgorod' }] };
  ['household','customers','working','frontier','public_affairs','neighbours','roads','present_life','future'].forEach(function (id) {
    def.stages[id].transitions = [
      { when:{ not:local }, next:'remote' },
      { when:{ kind:'elapsed', minDays:360, sinceCampaign:true }, next:'postponed' }
    ];
  });
  Object.assign(FBDATA.storyInstances, FBDATA.householdTracks_novgorod_1241, FBDATA.openingProfiles_novgorod_1241);
})();
