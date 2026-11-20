FB.bookmarkSources.stage({"source":"data/story_baghdad_commissions_800.js","bookmarks":["800"],"catalogs":[],"shared":[]}, function (FBDATA) {
  'use strict';
  FBDATA.householdTracks_baghdad_commissions_800 = {
    baghdad_copyist_track_800:{
      jobs:{ extended_copy:{ payerRealmId:'abbasid', provinceId:'baghdad', patronJobId:'first_copy', days:4, fee:12,
        completionGold:8, settlementGold:2, expiresDays:14, yearMin:800, yearMax:802 } },
      stages:{
        offer:{ text:'An unnamed buyer for the caliphal court seeks a copy of an Arabic text. Choose the three-day order with its full fee guaranteed on delivery, or the four-day commission with part of the fee disputed after delivery. Either offer requires the full fee in reserve and starts with one action day. These are fictional terms for Baghdad in 800–802.',
          choices:[{ id:'accept_extended_copy', label:'Review the four-day copying commission',
            detail:'Reserve {money:12} for four action days. Delivery pays {money:8} and leaves {money:4} in dispute. Settle immediately for {money:2}, spend another action day at a local hearing to collect {money:4}, or waive the balance. The contract expires after fourteen days or at the end of 802, whichever comes first.',
            operation:{ kind:'start_job', jobId:'extended_copy' }, next:'extended_copying' }] },
        extended_copying:{ name:'Copying the longer text',
          text:'The first day is recorded. Use another action day to finish the copy before comparison.',
          choices:[{ id:'finish_extended_copy', label:'Finish copying the text', detail:'Use the second action day. The full fee remains in reserve.',
            operation:{ kind:'work_job', jobId:'extended_copy' }, next:'extended_checking' }], transitions:[] },
        extended_checking:{ name:'Comparing the longer copy',
          text:'Compare the pages with the exemplar before the final delivery.',
          choices:[{ id:'compare_extended_copy', label:'Compare the pages', detail:'Use the third action day. The full fee remains in reserve.',
            operation:{ kind:'work_job', jobId:'extended_copy' }, next:'extended_delivery' }], transitions:[] },
        extended_delivery:{ name:'Delivering the longer copy',
          text:'Delivery earns the guaranteed share. The buyer disputes the charge for the corrected pages.',
          choices:[{ id:'deliver_extended_copy', label:'Deliver the completed copy', detail:'Use the fourth action day and collect {money:8}. The disputed {money:4} stays in reserve.',
            operation:{ kind:'work_job', jobId:'extended_copy' }, next:'extended_account' }], transitions:[] },
        extended_account:{ name:'The disputed copying fee',
          text:'The guaranteed share is yours. The remaining fee is still in reserve under the original terms.',
          choices:[
            { id:'settle_extended_copy', label:'Accept the smaller settlement', detail:'Collect {money:2} now and return {money:2} to the payer. This uses no action day.',
              operation:{ kind:'settle_job', jobId:'extended_copy', resolution:'settlement' }, next:'patronage' },
            { id:'hear_extended_copy', label:'Spend a day at a local hearing', detail:'Use one action day to recover the remaining {money:4} from the reserved fee.',
              operation:{ kind:'settle_job', jobId:'extended_copy', resolution:'hearing' }, next:'patronage' },
            { id:'waive_extended_copy', label:'Waive the disputed fee', detail:'Return the reserved {money:4} to the payer and keep the {money:8} already received. This uses no action day.',
              operation:{ kind:'settle_job', jobId:'extended_copy', resolution:'waive' }, next:'patronage' }
          ], transitions:[] },
        extended_closed:{ name:'The copying account has closed',
          text:'You completed the longer commission. The remaining reserved fee has been paid under its interruption terms.',
          terminal:true, choices:[], transitions:[] }
      }
    }
  };

  var additions = FBDATA.householdTracks_baghdad_commissions_800.baghdad_copyist_track_800;
  var base = FBDATA.storyInstances.baghdad_copyist_track_800;
  var offer = base.stages.offer;
  var offerTransitions = offer.transitions.filter(function (route) { return route.next !== 'unavailable'; });
  offerTransitions.push({ when:{ not:{ any:[{ kind:'job_available', jobId:'first_copy' },
    { kind:'job_available', jobId:'extended_copy' }] } }, next:'unavailable' });
  var stages = Object.assign({}, base.stages, additions.stages, {
    offer:Object.assign({}, offer, additions.stages.offer, {
      choices:offer.choices.slice(0, 1).concat(additions.stages.offer.choices, offer.choices.slice(1)),
      transitions:offerTransitions
    })
  });
  var closed = { kind:'job_state', jobId:'extended_copy', states:['cancelled','expired'] };
  ['extended_copying','extended_checking','extended_delivery'].forEach(function (id) {
    stages[id] = Object.assign({}, stages[id], {
      transitions:base.stages.practice.transitions.concat({ when:closed, next:'closed_order' })
    });
  });
  // Once delivered, reconciliation pays the whole reserved entitlement if a review is interrupted.
  stages.extended_account = Object.assign({}, stages.extended_account, {
    transitions:[{ when:closed, next:'extended_closed' }]
  });
  FBDATA.storyInstances[base.id] = Object.assign({}, base, {
    jobs:Object.assign({}, base.jobs, additions.jobs), stages:stages
  });
});
