/* Local household choices leave the court's wars and succession independent. */
window.FBDATA = window.FBDATA || {};

FBDATA.householdTracks_800 = {
  aachen_household_track_800:{ id:'aachen_household_track_800', type:'household_track',
    title:'At the Palace Gates',
    intro:'Your family farms near the palace. News, voluntary work and a disputed account offer choices without promising royal favor.',
    homeProvinceId:'aachen', continuity:'household', initialStage:'news',
    requirements:{ provinces:['aachen'], realms:['carolingian_800'] },
    jobs:{
      palace_delivery:{ payerRealmId:'carolingian_800', provinceId:'aachen', days:3, fee:4,
        completionGold:2, settlementGold:1, expiresDays:30, yearMin:801, yearMax:801 },
      supply_delivery:{ payerRealmId:'carolingian_800', provinceId:'aachen', days:1, fee:2,
        completionGold:2, settlementGold:0, expiresDays:10, yearMin:802, yearMax:802 }
    },
    stages:{
      news:{ name:'A report from Rome',
        text:'Word of the coronation in Rome reaches your household. The emperor need not be here for people to discuss his new title. A report offers no private audience or special protection.',
        choices:[
          { id:'hear_report', label:'Hear the report', detail:'Follow the news and consider local work when an offer opens. No coin or title changes hands.', operation:{ kind:'record_decision' }, next:'await_work' },
          { id:'farm_first', label:'Return to the farm', detail:'Keep farming. The voluntary work offer remains available during its local window.', operation:{ kind:'record_decision' }, next:'await_work' }
        ], transitions:[] },
      await_work:{ name:'Farm work continues', text:'The next local work window is in 801. Ordinary farming remains available while you wait.', choices:[], transitions:[] },
      offer:{ name:'A short palace delivery',
        text:'An unnamed intermediary offers a small delivery and maintenance job. These are private work terms, with no claim about a particular unfinished chapel wall or customary duty.',
        choices:[
          { id:'accept_delivery', label:'Review the three-day job', detail:'Four gold must be reserved from the living court. Work the first action day now; two further shifts finish the job. Two gold will be disputed.', operation:{ kind:'start_job', jobId:'palace_delivery' }, next:'working' },
          { id:'decline_delivery', label:'Keep the time for farming', detail:'Decline voluntary work without a fine, payment or new obligation.', operation:{ kind:'record_decision' }, next:'await_instructions' }
        ], transitions:[] },
      working:{ name:'Completing the delivery',
        text:'The agreed fee is held for this job. Each completed shift fills a real action day, replacing Daily Focus. No ordinary farm earnings are granted by the story.',
        choices:[{ id:'work_shift', label:'Work the next shift', detail:'Spend one action day on the accepted job. Only completed work earns payment.', operation:{ kind:'work_job', jobId:'palace_delivery' }, next:'working' }], transitions:[] },
      account:{ name:'A disputed account',
        text:'The job is complete and the undisputed two gold have been paid. A fictional disagreement holds the other two gold in the same reserved account. A hearing can recover only that balance.',
        choices:[
          { id:'take_settlement', label:'Take one more gold now', detail:'Accept one gold from the disputed balance. The other gold returns to the payer; this account closes.', operation:{ kind:'settle_job', jobId:'palace_delivery', resolution:'settlement' }, next:'await_instructions' },
          { id:'seek_hearing', label:'Spend a day seeking the balance', detail:'Use one action day for a local hearing and recover the two gold still reserved. No royal audience, office or compensation beyond the fee is promised.', operation:{ kind:'settle_job', jobId:'palace_delivery', resolution:'hearing' }, next:'await_instructions' },
          { id:'abandon_balance', label:'Abandon the remaining claim', detail:'Keep the two gold already earned. Return the disputed balance to its payer and resume ordinary life.', operation:{ kind:'settle_job', jobId:'palace_delivery', resolution:'waive' }, next:'await_instructions' }
        ], transitions:[] },
      await_instructions:{ name:'Back to household life', text:'Work and family life continue. A later local explanation may become available in 802; it creates no summons or tax.', choices:[], transitions:[] },
      instructions:{ name:'An explanation of imperial instructions',
        text:'In 802, local discussion turns to fidelity, complaints and the duties of those who actually owe service. Your free farm alone establishes no particular military liability.',
        choices:[
          { id:'hear_instructions', label:'Spend a day hearing the explanation', detail:'Ask about ordinary complaint channels and assessment. This neither discharges a duty nor purchases exemption.', operation:{ kind:'spend_day' }, next:'supply' },
          { id:'keep_working', label:'Return to daily work', detail:'Decline this optional explanation. This is no refusal of a lawful oath or actual summons.', operation:{ kind:'record_decision' }, next:'supply' }
        ], transitions:[] },
      supply:{ name:'A voluntary supply offer',
        text:'A living local buyer may fund a small paid supply delivery. Any real military duty still belongs to its ordinary service review. Voluntary work buys no exemption and joins no distant campaign.',
        choices:[
          { id:'supply_work', label:'Review one paid supply day', detail:'Work one action day for two gold reserved from the current original court. If no funded offer is available, this opportunity closes without a penalty.', operation:{ kind:'start_job', jobId:'supply_delivery' }, next:'conclusion' },
          { id:'keep_farming', label:'Keep farming', detail:'Leave the voluntary offer without payment or penalty. Existing duties remain governed by ordinary play.', operation:{ kind:'record_decision' }, next:'conclusion' }
        ], transitions:[] },
      conclusion:{ name:'The household looks ahead', text:'These opening opportunities are ending. Your profession, property and future work remain subject to ordinary household decisions.',
        choices:[
          { id:'seek_work_again', label:'Keep an eye out for ordinary work', detail:'Record an intention. Future employment needs its own ordinary offer; no opening fee can be collected again.', operation:{ kind:'record_decision' }, next:'work_intention' },
          { id:'return_to_farm', label:'Give attention to the farm', detail:'Close these decisions without locking the household into a profession.', operation:{ kind:'record_decision' }, next:'farm_intention' },
          { id:'close_opening', label:'Close the opening story', detail:'Continue the family campaign without a grant, office or compulsory new duty.', operation:{ kind:'record_decision' }, next:'finished' }
        ], transitions:[] },
      work_intention:{ name:'Work remains an ordinary choice', text:'Your intention is recorded. It grants neither recurring palace wages nor hereditary office.', terminal:true, choices:[], transitions:[] },
      farm_intention:{ name:'Attention returns to the farm', text:'Your household carries on. Other professions and opportunities remain available through ordinary play.', terminal:true, choices:[], transitions:[] },
      finished:{ name:'The opening decisions are complete', text:'The household continues without special immunity or a predetermined future.', terminal:true, choices:[], transitions:[] },
      remote:{ name:'Life beyond the palace gates', text:'This opportunity has become remote. Any funded contract keeps its actual earned payment and refund terms; no local hearing or family relocation is invented.', terminal:true, choices:[], transitions:[] },
      changed_court:{ name:'The court has changed', text:'The original payer no longer governs this opportunity. Its outstanding contract follows its reserved account; later work belongs to ordinary systems.', terminal:true, choices:[], transitions:[] },
      window_closed:{ name:'The opening window has passed', text:'The local 800-802 opportunities have ended. Earned work and existing property remain recorded; the story imposes no late fine or historical summons.', terminal:true, choices:[], transitions:[] }
    }
  }
};

(function () {
  'use strict';
  var def = FBDATA.householdTracks_800.aachen_household_track_800;
  var local = { all:[{ kind:'home', provinceId:'aachen' }, { kind:'present', provinceId:'aachen' }] };
  function route(when, next) { return { when:when, next:next }; }
  function year(min, max) { return { kind:'year', min:min, max:max }; }
  function job(states) { return { kind:'job_state', jobId:'palace_delivery', states:states }; }
  Object.keys(def.stages).forEach(function (id) {
    if (def.stages[id].terminal) return;
    def.stages[id].transitions = [route({ not:local }, 'remote'),
      route({ not:{ kind:'job_patron', jobId:'palace_delivery' } }, 'changed_court'),
      route(year(803, 10000), 'window_closed')];
  });
  def.stages.news.transitions.push(route(year(802, 802), 'instructions'));
  def.stages.await_work.transitions.push(route(year(802, 802), 'instructions'), route(year(801, 801), 'offer'));
  def.stages.offer.transitions.push(route(year(802, 802), 'instructions'));
  def.stages.working.transitions.push(route(job(['disputed']), 'account'), route(job(['cancelled','expired']), 'await_instructions'));
  def.stages.account.transitions.push(route(job(['cancelled','expired']), 'await_instructions'));
  def.stages.await_instructions.transitions.push(route(year(802, 802), 'instructions'));
  def.stages.supply.transitions.push(route({ not:{ kind:'job_available', jobId:'supply_delivery' } }, 'conclusion'));
  Object.assign(FBDATA.storyInstances, FBDATA.householdTracks_800);
  FBDATA.startScenarios.forEach(function (scenario) {
    if (scenario.id !== 'aachen_household_800') return;
    scenario.tracks = (scenario.tracks || []).concat([def.id]);
    scenario.trackLocations = Object.assign({}, scenario.trackLocations);
    scenario.trackLocations[def.id] = ['aachen'];
  });
})();
