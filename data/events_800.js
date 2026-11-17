/* Local household decisions observe the current county holder. */
FB.bookmarkSources.eventPack('data/events_800.js',function (FBDATA) {
  'use strict';
  FBDATA.eventPacks = FBDATA.eventPacks || {};
  FBDATA.eventPacks.dated_800 = { eras:['early_medieval'], yearMin:800, yearMax:820 };
  FBDATA.eventChances = FBDATA.eventChances || {};
  FBDATA.eventChances.dated_800_household_ste = {"base":0.5,"min":0.1,"max":0.85,"steps":[{"kind":"skill","id":"ste","factor":0.02},{"kind":"flag","id":"household_prepared_800","add":0.15}]};
  FBDATA.eventChances.dated_800_household_dip = {"base":0.5,"min":0.1,"max":0.85,"steps":[{"kind":"skill","id":"dip","factor":0.02},{"kind":"flag","id":"household_prepared_800","add":0.15}]};
  Array.prototype.push.apply(FBDATA.events, [
    { id:'aachen_report_800', pack:'dated_800', title:'News and Household Accounts',
      text:'A report of the coronation in Rome reaches Aachen. You can set your household account in order while the neighbours debate titles and distant courts.',
      trigger:{countyIds:['aachen'], state:[{reader:'county_holder_government', args:{formId:'territorial'}}]}, weight:3, once:true,
      options:[
        { label:'Prepare the household account for {money:1}',
          desc:'Pay once to prepare. Later household account and advice choices in this period gain up to 15 percentage points of success chance, capped at 85%.',
          require:{goldMin:1, notFlags:['household_prepared_800']},
          effects:{gold:-1, setFlag:'household_prepared_800'},
          text:'Your preparations are ready for later dealings.' },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'aachen_rope_800', pack:'dated_800', title:'The Frayed Rope',
      text:'A frayed rope needs attention. Grand titles have not made the everyday load any lighter for your household near Aachen.',
      trigger:{countyIds:['aachen'], state:[{reader:'county_holder_government', args:{formId:'territorial'}}]}, weight:3, once:true,
      options:[
        { label:'Put the rope in order',
          effects:{health:1},
          text:'For now, the household carries on.' },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'aachen_offer_800', pack:'dated_800', title:'Before Accepting the Load',
      text:'A neighbour asks how you would reckon a short delivery. You compare the proposed load with the work waiting at home; no contract has yet been made.',
      trigger:{countyIds:['aachen'], state:[{reader:'county_holder_government', args:{formId:'territorial'}}]}, weight:3, once:true,
      options:[
        { label:'Think through the household account',
          chance:'dated_800_household_ste',
          success:{text:'You find a clear answer without promising more than you know.', effects:{prestige:2}},
          failure:{text:'The matter stays uncertain. You leave it there.', effects:{}} },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'aachen_boots_800', pack:'dated_800', title:'Mud on the Boots',
      text:'At the end of an ordinary day, cleaning your boots is easier than untangling every account. There is still supper to think about.',
      trigger:{countyIds:['aachen'], state:[{reader:'county_holder_government', args:{formId:'territorial'}}]}, weight:3, once:true,
      options:[
        { label:'Spend {money:1} on a warm meal',
          effects:{gold:-1, health:2},
          text:'For now, the household carries on.',
          require:{goldMin:1} },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'aachen_balance_800', pack:'dated_800', title:'Entries in the Account',
      text:'A household account has become untidy. Sorting your own entries could help with later dealings, without asserting that anyone owes you a reserved fee.',
      trigger:{countyIds:['aachen'], state:[{reader:'county_holder_government', args:{formId:'territorial'}}]}, weight:3, once:true,
      options:[
        { label:'Prepare the household account for {money:1}',
          desc:'Pay once to prepare. Later household account and advice choices in this period gain up to 15 percentage points of success chance, capped at 85%.',
          require:{goldMin:1, notFlags:['household_prepared_800']},
          effects:{gold:-1, setFlag:'household_prepared_800'},
          text:'Your preparations are ready for later dealings.' },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'aachen_friend_800', pack:'dated_800', title:'A Friend Beside the Fence',
      text:'{friend} stops beside the fence while you turn back to household work. For once the conversation is about neither a fee nor an imperial title.',
      trigger:{countyIds:['aachen'], state:[{reader:'county_holder_government', args:{formId:'territorial'}}]}, weight:3, once:true,
      participants:[{slot:'friend', source:'role', role:'friend', required:true}],
      options:[
        { label:'Make time for {friend}',
          effects:{opinion:{role:'friend', amt:3}},
          text:'For now, the household carries on.' },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'aachen_questions_800', pack:'dated_800', title:'Questions Before the Explanation',
      text:'Local discussion turns to duties and complaint channels. You rehearse a plain question, without claiming that a lawful summons has been issued to you.',
      trigger:{countyIds:['aachen'], state:[{reader:'county_holder_government', args:{formId:'territorial'}}]}, weight:3, once:true,
      options:[
        { label:'Find a plain way to ask',
          chance:'dated_800_household_dip',
          success:{text:'You find a clear answer without promising more than you know.', effects:{prestige:2}},
          failure:{text:'The matter stays uncertain. You leave it there.', effects:{}} },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'aachen_supply_800', pack:'dated_800', title:'A Load You Can Leave',
      text:'A bundle needs checking before it is offered for delivery. Preparing your household list creates neither a military duty nor exemption from one.',
      trigger:{countyIds:['aachen'], state:[{reader:'county_holder_government', args:{formId:'territorial'}}]}, weight:3, once:true,
      options:[
        { label:'Prepare the household account for {money:1}',
          desc:'Pay once to prepare. Later household account and advice choices in this period gain up to 15 percentage points of success chance, capped at 85%.',
          require:{goldMin:1, notFlags:['household_prepared_800']},
          effects:{gold:-1, setFlag:'household_prepared_800'},
          text:'Your preparations are ready for later dealings.' },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'aachen_seasons_800', pack:'dated_800', title:'The Farm Beyond the Opening',
      text:'The next season will bring its own work. You can put current household arrangements in order without binding every future choice.',
      trigger:{countyIds:['aachen'], state:[{reader:'county_holder_government', args:{formId:'territorial'}}]}, weight:3, once:true,
      options:[
        { label:'Prepare the household account for {money:1}',
          desc:'Pay once to prepare. Later household account and advice choices in this period gain up to 15 percentage points of success chance, capped at 85%.',
          require:{goldMin:1, notFlags:['household_prepared_800']},
          effects:{gold:-1, setFlag:'household_prepared_800'},
          text:'Your preparations are ready for later dealings.' },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'baghdad_bundle_800', pack:'dated_800', title:'A Bundle of Pages',
      text:'A bundle of pages lies on a desk in Baghdad. Sorting your own household account alongside it promises neither a copying commission nor a scholarly qualification.',
      trigger:{countyIds:['baghdad'], state:[{reader:'county_holder_government', args:{formId:'administrative_monarchy'}}]}, weight:3, once:true,
      options:[
        { label:'Prepare the household account for {money:1}',
          desc:'Pay once to prepare. Later household account and advice choices in this period gain up to 15 percentage points of success chance, capped at 85%.',
          require:{goldMin:1, notFlags:['household_prepared_800']},
          effects:{gold:-1, setFlag:'household_prepared_800'},
          text:'Your preparations are ready for later dealings.' },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'baghdad_margin_800', pack:'dated_800', title:'Space in the Margin',
      text:'An uncommissioned page lies open in Baghdad. You pause over the space in its margin before clearing the desk and resting your eyes.',
      trigger:{countyIds:['baghdad'], state:[{reader:'county_holder_government', args:{formId:'administrative_monarchy'}}]}, weight:3, once:true,
      options:[
        { label:'Clear the desk and rest your eyes',
          effects:{health:1},
          text:'For now, the household carries on.' },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] },
    { id:'baghdad_purse_800', pack:'dated_800', title:'Counting the Purse',
      text:'In Baghdad you count the money actually in your purse. Keeping a clear household account is a small source of satisfaction; the next order still needs a willing payer.',
      trigger:{countyIds:['baghdad'], state:[{reader:'county_holder_government', args:{formId:'administrative_monarchy'}}]}, weight:3, once:true,
      options:[
        { label:'Take satisfaction in completed work',
          effects:{prestige:2},
          text:'For now, the household carries on.' },
        { label:'Leave this for now',
          text:'You keep your present plans.',
          effects:{} }
      ] }
  ]);
});
