window.FBDATA = window.FBDATA || {};

FBDATA.householdTracks_baghdad_800 = {
  baghdad_copyist_track_800:{ id:'baghdad_copyist_track_800', type:'household_track',
    title:'Among Baghdad’s Books',
    intro:'A small copying order offers paid work, careful comparison and a choice about future patronage.',
    homeProvinceId:'baghdad', continuity:'protagonist', interruptedStage:'interrupted', initialStage:'household',
    requirements:{ provinces:['baghdad'], realms:['abbasid'] },
    jobs:{
      first_copy:{ payerRealmId:'abbasid', provinceId:'baghdad', days:3, fee:6,
        completionGold:6, settlementGold:0, expiresDays:10, yearMin:800, yearMax:802 },
      later_copy:{ payerRealmId:'abbasid', provinceId:'baghdad', days:1, fee:2,
        completionGold:2, settlementGold:0, expiresDays:7, yearMin:800, yearMax:802 }
    },
    stages:{
      household:{ name:'A household among books',
        text:'Arabic texts pass through many hands in Baghdad. Your invented household begins with modest means and an apprentice’s career. A small order may offer work without an academy appointment or a famous teacher.',
        choices:[
          { id:'keep_copying', label:'Keep copying as a livelihood', detail:'Select ordinary scholarly work and review a local order. Choosing work pays nothing by itself.', operation:{ kind:'set_focus', focusId:'scholarly_work' }, next:'offer' },
          { id:'seek_study', label:'Give attention to ordinary study', detail:'Close the opening story. Choose study and pursue training through the usual household decisions.', operation:{ kind:'record_decision' }, next:'study_intention' },
          { id:'decline_story', label:'Continue without the opening story', detail:'Keep your family, purse and current career without taking a commission.', operation:{ kind:'record_decision' }, next:'declined' }
        ], transitions:[] },
      offer:{ name:'A small copying order',
        text:'An unnamed buyer for the caliphal court seeks a copy of an unspecified Arabic text. The full fee must be reserved before work starts. Accepting uses the first of three action days; checking and delivery each use another. The order expires ten days after acceptance.',
        choices:[
          { id:'accept_order', label:'Review the three-day copying order', detail:'Reserve {money:6} from the living court and work the first day. Completing all three days pays {money:6}. An interruption pays only completed work and returns the unearned balance.', operation:{ kind:'start_job', jobId:'first_copy' }, next:'checking' },
          { id:'practice_first', label:'Practise comparison before accepting', detail:'Review a separate practice day before deciding whether to take the order. No contract or fee is created yet.', operation:{ kind:'record_decision' }, next:'practice' },
          { id:'decline_order', label:'Remain independent', detail:'Decline without a fee, fine or obligation. Ordinary work remains available.', operation:{ kind:'record_decision' }, next:'independent' }
        ], transitions:[] },
      practice:{ name:'Comparing a practice copy',
        text:'An uncommissioned copy gives you something to compare. This optional day earns no fee or qualification. Ordinary study and access to teachers remain separate choices.',
        choices:[
          { id:'compare_practice', label:'Spend a day comparing the copy', detail:'Use one action day, replacing Daily Focus, then reconsider the order. No money or skill credit is granted.', operation:{ kind:'spend_day' }, next:'offer' },
          { id:'skip_practice', label:'Return to the offer', detail:'Spend no day and review the same unaccepted order.', operation:{ kind:'record_decision' }, next:'offer' }
        ], transitions:[] },
      checking:{ name:'Checking the exemplar',
        text:'The first copying day is recorded and the fee is reserved. Spend the second day comparing your copy with the exemplar. The text and its discrepancy are fictional; the task assumes no unearned foreign-language qualification.',
        choices:[{ id:'compare_copy', label:'Work the checking day', detail:'Use one action day on the accepted order. Payment waits for the delivery day; unfinished work keeps its interruption terms.', operation:{ kind:'work_job', jobId:'first_copy' }, next:'delivery' }], transitions:[] },
      delivery:{ name:'Delivery and payment',
        text:'Comparison is complete. A final working day finishes and delivers the copy, provided the original living payer still governs locally and the contract has not expired.',
        choices:[{ id:'deliver_copy', label:'Complete the delivery day', detail:'Use the third action day and collect the reserved {money:6} once. This earns no separate focus wage, scholarly license or court office.', operation:{ kind:'work_job', jobId:'first_copy' }, next:'patronage' }], transitions:[] },
      patronage:{ name:'Patronage or independence',
        text:'The first order is settled. Another short order may be available, but the household can instead pursue ordinary study or independent work.',
        choices:[
          { id:'seek_another', label:'Ask about one further order', detail:'Review a new one-day order. Its payer must reserve a separate fee; the first order cannot pay again.', operation:{ kind:'record_decision' }, next:'second_offer' },
          { id:'pursue_study', label:'Pursue ordinary study', detail:'Close the story and use the usual training and study choices. No teacher, admission or qualification is granted.', operation:{ kind:'record_decision' }, next:'study_intention' },
          { id:'work_independently', label:'Keep an independent livelihood', detail:'Close the story with your earned fee. Choose future work through ordinary play.', operation:{ kind:'record_decision' }, next:'independent' }
        ], transitions:[] },
      second_offer:{ name:'One further order',
        text:'The same court may fund a shorter copying order. This is one additional contract, with its own reserved fee and seven-day expiry.',
        choices:[
          { id:'accept_later', label:'Review one more paid day', detail:'Reserve {money:2}, work one action day and collect that fee once. This creates no continuing office or recurring story wage.', operation:{ kind:'start_job', jobId:'later_copy' }, next:'continued' },
          { id:'decline_later', label:'Keep future work independent', detail:'Decline the further order without changing the fee already earned.', operation:{ kind:'record_decision' }, next:'independent' }
        ], transitions:[] },
      study_intention:{ name:'Study remains an ordinary choice', text:'Your household continues. Choose study, training and eligible teachers through ordinary play; the opening grants no qualification.', terminal:true, choices:[], transitions:[] },
      declined:{ name:'Your own household story', text:'The optional opening is closed. Your family, occupation and future choices continue.', terminal:true, choices:[], transitions:[] },
      independent:{ name:'An independent copying household', text:'The household carries on with its existing career, identity and earned money. Future orders need their own ordinary terms.', terminal:true, choices:[], transitions:[] },
      continued:{ name:'Two orders completed', text:'Both reserved fees have been earned. These opening orders are closed; future work belongs to ordinary household decisions.', terminal:true, choices:[], transitions:[] },
      unavailable:{ name:'No funded order', text:'A funded opening offer is unavailable. No fee or penalty is created; your ordinary livelihood remains.', terminal:true, choices:[], transitions:[] },
      closed_order:{ name:'The order has closed', text:'The unfinished order has ended under its recorded terms. Completed work earns its agreed fraction; the unearned balance returns to the payer.', terminal:true, choices:[], transitions:[] },
      remote:{ name:'Beyond the local desk', text:'You have left this local opportunity. Any accepted order settles completed work and returns its unearned balance. Your relatives move only through ordinary household decisions.', terminal:true, choices:[], transitions:[] },
      changed_court:{ name:'The payer has changed', text:'The original living payer no longer governs this opportunity. An accepted order keeps its earned-work and refund terms; no new patron is invented.', terminal:true, choices:[], transitions:[] },
      window_closed:{ name:'The opening orders have ended', text:'The local opening window has passed. Existing work settles under its recorded terms, with no late fine or automatic scholarly promotion.', terminal:true, choices:[], transitions:[] },
      interrupted:{ name:'A personal plan interrupted', text:'This copyist’s unfinished plan does not pass to an heir. Existing work settles its earned pay and refunds once; the continuing household keeps its ordinary choices.', terminal:true, choices:[], transitions:[] }
    }
  }
};

(function () {
  'use strict';
  var def = FBDATA.householdTracks_baghdad_800.baghdad_copyist_track_800;
  var local = { all:[{ kind:'home', provinceId:'baghdad' }, { kind:'present', provinceId:'baghdad' }, { not:{ kind:'travelling' } }] };
  function route(when, next) { return { when:when, next:next }; }
  Object.keys(def.stages).forEach(function (id) {
    if (def.stages[id].terminal) return;
    def.stages[id].transitions = [
      route({ not:local }, 'remote'),
      route({ not:{ kind:'job_patron', jobId:'first_copy' } }, 'changed_court'),
      route({ kind:'year', min:803, max:10000 }, 'window_closed')
    ];
  });
  ['checking','delivery'].forEach(function (id) {
    def.stages[id].transitions.push(route({ kind:'job_state', jobId:'first_copy', states:['cancelled','expired'] }, 'closed_order'));
  });
  def.stages.offer.transitions.push(route({ not:{ kind:'job_available', jobId:'first_copy' } }, 'unavailable'));
  def.stages.second_offer.transitions.push(route({ not:{ kind:'job_available', jobId:'later_copy' } }, 'independent'));
  Object.assign(FBDATA.storyInstances, FBDATA.householdTracks_baghdad_800);
})();
