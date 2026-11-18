/* Local household decisions observe the current county holder. */
FB.bookmarkSources.eventPack('data/events_711.js',function (FBDATA) {
  'use strict';
  FBDATA.eventPacks = FBDATA.eventPacks || {};
  FBDATA.eventPacks.dated_711 = { bookmarkIds:['711'], eras:['early_medieval'], yearMin:711, yearMax:731 };
  FBDATA.eventChances = FBDATA.eventChances || {};
  FBDATA.eventChances.dated_711_household_ste = {"base":0.5,"min":0.1,"max":0.85,"steps":[{"kind":"skill","id":"ste","factor":0.02},{"kind":"flag","id":"household_prepared_711","add":0.15}]};
  FBDATA.eventChances.dated_711_household_dip = {"base":0.5,"min":0.1,"max":0.85,"steps":[{"kind":"skill","id":"dip","factor":0.02},{"kind":"flag","id":"household_prepared_711","add":0.15}]};
  Array.prototype.push.apply(FBDATA.events, [
    { id:'toledo_shutter_711', pack:'dated_711', title:'A Shutter Before Dusk',
      text:'The workshop shutter rattles at dusk. Your household must still see to small repairs under the present local court.',
      trigger:{countyIds:['toledo'], state:[{reader:'county_holder_government', args:{formId:'elective_monarchy'}}]}, weight:3, once:true,
      options:[
        { label:'Mend it before supper',
          effects:{health:1},
          text:'For now, the household carries on.' },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'toledo_tools_711', pack:'dated_711', title:'Tools on the Bench',
      text:'The household tools lie ready in Toledo. Sorting your account now could help when the next awkward dealing comes along.',
      trigger:{countyIds:['toledo'], state:[{reader:'county_holder_government', args:{formId:'elective_monarchy'}}]}, weight:3, once:true,
      options:[
        { label:'Prepare the household account for {money:1}',
          desc:'Pay once to prepare. Later household account and advice choices in this period gain up to 15 percentage points of success chance, capped at 85%.',
          require:{goldMin:1, notFlags:['household_prepared_711']},
          effects:{gold:-1, setFlag:'household_prepared_711'},
          text:'Your preparations are ready for later dealings.' },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'toledo_promises_711', pack:'dated_711', title:'A Customer Wants a Promise',
      text:'A customer wants a promise about future work. A clear household account could help you explain what you can actually offer.',
      trigger:{countyIds:['toledo'], state:[{reader:'county_holder_government', args:{formId:'elective_monarchy'}}]}, weight:3, once:true,
      options:[
        { label:'Prepare the household account for {money:1}',
          desc:'Pay once to prepare. Later household account and advice choices in this period gain up to 15 percentage points of success chance, capped at 85%.',
          require:{goldMin:1, notFlags:['household_prepared_711']},
          effects:{gold:-1, setFlag:'household_prepared_711'},
          text:'Your preparations are ready for later dealings.' },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'toledo_lamp_711', pack:'dated_711', title:'The Household Lamp',
      text:'Work in Toledo has run into the evening. There is still a place for the household lamp and familiar practice beside the unfinished tools.',
      trigger:{countyIds:['toledo'], state:[{reader:'county_holder_government', args:{formId:'elective_monarchy'}}]}, weight:3, once:true,
      options:[
        { label:'Keep a quiet evening',
          effects:{piety:2},
          text:'For now, the household carries on.' },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'toledo_friend_news_711', pack:'dated_711', title:'Two Accounts of the Strait',
      text:'{friend} brings a second account of the roads beyond Toledo. Neither of you can tell from street talk what the rival courts will do next.',
      trigger:{countyIds:['toledo'], state:[{reader:'county_holder_government', args:{formId:'elective_monarchy'}}]}, weight:3, once:true,
      participants:[{slot:'friend', source:'role', role:'friend', required:true}],
      options:[
        { label:'Thank {friend} for the advice',
          effects:{opinion:{role:'friend', amt:3}},
          text:'For now, the household carries on.' },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'toledo_measures_711', pack:'dated_711', title:'A Measure of Grain',
      text:'A household purchase in Toledo prompts an argument over the measure. You can try to settle the account without claiming a royal hearing.',
      trigger:{countyIds:['toledo'], state:[{reader:'county_holder_government', args:{formId:'elective_monarchy'}}]}, weight:3, once:true,
      options:[
        { label:'Compare the measures calmly',
          chance:'dated_711_household_ste',
          success:{text:'You find a clear answer without promising more than you know.', effects:{prestige:2}},
          failure:{text:'The matter stays uncertain. You leave it there.', effects:{}} },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'toledo_water_711', pack:'dated_711', title:'Water at the Door',
      text:'The water vessels by your door need filling. Whatever the rival courts may do, the household still needs its ordinary supplies.',
      trigger:{countyIds:['toledo'], state:[{reader:'county_holder_government', args:{formId:'elective_monarchy'}}]}, weight:3, once:true,
      options:[
        { label:'Spend {money:1} on household help',
          effects:{gold:-1, health:2},
          text:'For now, the household carries on.',
          require:{goldMin:1} },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'toledo_threshold_711', pack:'dated_711', title:'At the Threshold',
      text:'The threshold needs cleaning and the tools need setting in order. Familiar household preparations can be useful under the current local authority.',
      trigger:{countyIds:['toledo'], state:[{reader:'county_holder_government', args:{formId:'elective_monarchy'}}]}, weight:3, once:true,
      options:[
        { label:'Prepare the household account for {money:1}',
          desc:'Pay once to prepare. Later household account and advice choices in this period gain up to 15 percentage points of success chance, capped at 85%.',
          require:{goldMin:1, notFlags:['household_prepared_711']},
          effects:{gold:-1, setFlag:'household_prepared_711'},
          text:'Your preparations are ready for later dealings.' },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'tangier_cord_711', pack:'dated_711', title:'A Cord Around the Bundle',
      text:'A bundle lies open in Tangier. Checking its contents against your household account creates no service obligation or hired passage.',
      trigger:{countyIds:['tangier'], state:[{reader:'county_holder_government', args:{formId:'territorial'}}]}, weight:3, once:true,
      options:[
        { label:'Prepare the household account for {money:1}',
          desc:'Pay once to prepare. Later household account and advice choices in this period gain up to 15 percentage points of success chance, capped at 85%.',
          require:{goldMin:1, notFlags:['household_prepared_711']},
          effects:{gold:-1, setFlag:'household_prepared_711'},
          text:'Your preparations are ready for later dealings.' },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'tangier_home_711', pack:'dated_711', title:'Work on This Shore',
      text:'There is work to consider on this shore. A clear list of household commitments may be more useful than another rumour from across the water.',
      trigger:{countyIds:['tangier'], state:[{reader:'county_holder_government', args:{formId:'territorial'}}]}, weight:3, once:true,
      options:[
        { label:'Prepare the household account for {money:1}',
          desc:'Pay once to prepare. Later household account and advice choices in this period gain up to 15 percentage points of success chance, capped at 85%.',
          require:{goldMin:1, notFlags:['household_prepared_711']},
          effects:{gold:-1, setFlag:'household_prepared_711'},
          text:'Your preparations are ready for later dealings.' },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'tangier_wind_711', pack:'dated_711', title:'Listening at the Waterfront',
      text:'At the waterfront in Tangier you hear guesses about the passage. No boat here has been hired for you, but careful questions may sort useful advice from boast.',
      trigger:{countyIds:['tangier'], state:[{reader:'county_holder_government', args:{formId:'territorial'}}]}, weight:3, once:true,
      options:[
        { label:'Ask careful questions',
          chance:'dated_711_household_dip',
          success:{text:'You find a clear answer without promising more than you know.', effects:{prestige:2}},
          failure:{text:'The matter stays uncertain. You leave it there.', effects:{}} },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'malaga_hearth_711', pack:'dated_711', title:'A Visitor by the Hearth',
      text:'You are in Malaga under its present local authority. An evening near a hearth offers a little comfort without moving your family or acquiring a home.',
      trigger:{countyIds:['malaga'], state:[{reader:'county_holder_government', args:{formId:'elective_monarchy'}}]}, weight:3, once:true,
      options:[
        { label:'Pay {money:1} for a quiet meal',
          effects:{gold:-1, health:2},
          text:'For now, the household carries on.',
          require:{goldMin:1} },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] }
  ]);
});
