/* Practical decisions observe existing works and their finite canonical accounts. */
(function () {
  'use strict';
  FBDATA.systems.event_works = {id:'event_works',eventReaderOwner:'works',defaultEnabled:true,
    desc:'Works account observations and canonical reviews.',modules:['production','building_operations','building_seasons','site_resources','maritime_work']};
  FBDATA.eventPacks.works_technology = {eras:['high_medieval'],yearMin:1204,yearMax:1215};
  FBDATA.eventChances.works_schedule = {base:0.5,min:0.1,max:0.85,steps:[{kind:'skill',id:'ste',factor:0.02}]};
  Array.prototype.push.apply(FBDATA.events, [
    {id:"works_input_short", pack:'works_technology', title:"An input running short",
      text:"The work account lists too little unreserved material for another batch. Buying from an existing supplier would be a separate decision, with its own price and finite stock.",
      trigger:{"state":[{"reader":"production_account","args":{"status":"inputs_short"}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true},{"slot":"counterparty","source":"context","required":true}],
      participantCards:["operator","counterparty"],
      options:[
        {"label":"Review a material purchase","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"production_exchange","args":{"operation":"buy","quantity":1},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}}
      ]
    },
    {id:"works_owned_delivery", pack:'works_technology', title:"Materials at the other store",
      text:"There is an actual owned lot at another store and a declared delivery route. Moving it would leave less there; neither store can count the same material twice.",
      trigger:{"state":[{"reader":"production_exchange","args":{"status":"available","operation":"transfer","quantity":1}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true},{"slot":"counterparty","source":"context","required":true}],
      participantCards:["operator","counterparty"],
      options:[
        {"label":"Review an owned delivery","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"production_exchange","args":{"operation":"transfer","quantity":1},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}}
      ]
    },
    {id:"works_reserve_batch", pack:'works_technology', title:"Before the next batch",
      text:"The standing works can reserve a batch from their present inputs. Processing must be paid before the original worker spends the required action days.",
      trigger:{"state":[{"reader":"production_account","args":{"status":"ready"}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true}],
      participantCards:["operator"],
      options:[
        {"label":"Review a stored batch","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"production_batch","args":{"operation":"reserve","disposition":"store"},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}}
      ]
    },
    {id:"works_processing_purse", pack:'works_technology', title:"Materials without processing money",
      text:"The inputs alone cannot pay for processing. The real payer lacks the price and protected reserves required for a new batch.",
      trigger:{"state":[{"reader":"production_account","args":{"status":"funds_short"}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true}],
      participantCards:["operator"],
      options:[
        {"label":"Review the processing blocker","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"production_batch","args":{"operation":"reserve","disposition":"store"},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}}
      ]
    },
    {id:"works_late_worker", pack:'works_technology', title:"Work still waiting",
      text:"The original worker is unavailable for local production. Travel, care, service and other employment cannot be replaced by a promise of extra hands.",
      trigger:{"state":[{"reader":"production_account","args":{"status":"labor_unavailable"}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true}],
      participantCards:["operator"],
      options:[
        {"label":"Review the work requirements","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"production_batch","args":{"operation":"reserve","disposition":"store"},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}},
        {"label":"Consider the order of the work","chance":"works_schedule","success":{"text":"You can see which commitment must be settled first. The work itself remains to be done.","effects":{}},"failure":{"text":"The schedule remains uncertain. No extra hands or supplies have arrived.","effects":{}}}
      ]
    },
    {id:"works_finished_work", pack:'works_technology', title:"The workdays are recorded",
      text:"A pending batch has all its required workdays. Finishing it would consume the reserved inputs and create only its declared output.",
      trigger:{"state":[{"reader":"production_account","args":{"status":"finish_ready"}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true}],
      participantCards:["operator"],
      options:[
        {"label":"Review batch completion","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"production_batch","args":{"operation":"finish"},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}}
      ]
    },
    {id:"works_hold_inputs", pack:'works_technology', title:"Inputs held in a pending batch",
      text:"A pending batch is holding actual inputs. Cancelling would release unused reservations while leaving the processing payment spent.",
      trigger:{"state":[{"reader":"production_account","args":{"status":"pending"}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true}],
      participantCards:["operator"],
      options:[
        {"label":"Review cancellation","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"production_batch","args":{"operation":"cancel"},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}}
      ]
    },
    {id:"works_new_recipe", pack:'works_technology', title:"Knowledge put to work",
      text:"An optional recipe now meets its knowledge and practical requirements. Discovery has supplied neither its materials nor its paid work.",
      trigger:{"state":[{"reader":"production_account","args":{"status":"technology_ready"}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true}],
      participantCards:["operator"],
      options:[
        {"label":"Review the available recipe","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"production_batch","args":{"operation":"reserve","disposition":"store","technologyOnly":true},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}}
      ]
    },
    {id:"works_seller_waiting", pack:'works_technology', title:"A buyer without funds",
      text:"The declared buyer lacks the cash and reserves for the proposed quantity. An order in the account is not payment.",
      trigger:{"state":[{"reader":"production_exchange","args":{"status":"funds_short","operation":"sell","quantity":1}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true},{"slot":"counterparty","source":"context","required":true}],
      participantCards:["operator","counterparty"],
      options:[
        {"label":"Review the buyer account","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"production_exchange","args":{"operation":"sell","quantity":1},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}}
      ]
    },
    {id:"works_buyer_ready", pack:'works_technology', title:"A funded outlet",
      text:"A declared buyer can presently pay for one actual unit. A sale would move that unit and its payment once.",
      trigger:{"state":[{"reader":"production_exchange","args":{"status":"available","operation":"sell","quantity":1}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true},{"slot":"counterparty","source":"context","required":true}],
      participantCards:["operator","counterparty"],
      options:[
        {"label":"Review a one-unit sale","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"production_exchange","args":{"operation":"sell","quantity":1},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}}
      ]
    },
    {id:'works_boat_upgrade', pack:'works_technology', title:'A further stage at the landing',
      text:'An existing enterprise can now review its next stage with completed paid material work. The discovered knowledge has supplied neither that work nor the remaining private payment.',
      trigger:{state:[{reader:'works_maritime',args:{status:'prepare_ready',target:'upgrade'}}]}, weight:2, cooldown:8,
      participants:[{slot:'operator',source:'context',required:true}], participantCards:['operator'],
      options:[
        {label:'Review the next-stage invoice',desc:'Review the actual existing enterprise, technology, material contribution and remaining payment.',
          require:{state:[{reader:'works_payer',args:{minimum:0}}]},
          review:{type:'maritime_operation',args:{operation:'prepare',target:'upgrade'},refusalOption:1}},
        {label:'Leave the account unchanged',text:'The existing enterprise and materials retain their present terms.',effects:{}}
      ]
    },
    {id:"works_dry_cistern", pack:'works_technology', title:"A dry cistern",
      text:"The receiving store contains no water. Its walls cannot provide service; only a lawful connected allocation can fill or serve it.",
      trigger:{"state":[{"reader":"works_water","args":{"status":"dry"}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true}],
      participantCards:["operator"],
      options:[
        {"label":"Review the connected water work","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"building_operation","args":{},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}}
      ]
    },
    {id:"works_water_route", pack:'works_technology', title:"Filling the store",
      text:"A standing storage work has a currently usable connected route. Paid transfer would retain actual received water and give no service benefit.",
      trigger:{"state":[{"reader":"works_water","args":{"status":"ready","mode":"store"}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true}],
      participantCards:["operator"],
      options:[
        {"label":"Review paid storage","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"building_operation","args":{"mode":"store"},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}}
      ]
    },
    {id:"works_service_due", pack:'works_technology', title:"Funding the next service",
      text:"The water work can fund its next finite service. Its original payer must cover local work and the exact upkeep term.",
      trigger:{"state":[{"reader":"works_water","args":{"status":"ready","mode":"use"}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true}],
      participantCards:["operator"],
      options:[
        {"label":"Review paid water service","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"building_operation","args":{"mode":"use"},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}}
      ]
    },
    {id:"works_shared_demand", pack:'works_technology', title:"The neighboring works",
      text:"Another facility has already funded the shared local service demand. A second name for the work cannot make another allocation useful during that term.",
      trigger:{"state":[{"reader":"works_water","args":{"status":"demand_busy"}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true}],
      participantCards:["operator"],
      options:[
        {"label":"Review the occupied demand","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"building_operation","args":{"when":"demand_busy"},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}}
      ]
    },
    {id:"works_water_reserved", pack:'works_technology', title:"Water already promised",
      text:"Current water reservations leave less available for other work. They belong to the actual source account and cannot be counted as spare water.",
      trigger:{"state":[{"reader":"works_resource","args":{"unit":"water","status":"reserved"}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true}],
      participantCards:["operator"],
      options:[
        {"label":"Review the water requirements","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"building_operation","args":{},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}}
      ]
    },
    {id:"works_pasture_open", pack:'works_technology', title:"The seasonal ground",
      text:"The local season and actual grazing capacity permit a bounded operating window. Opening it would use its declared places without creating a herd, harvest or worker.",
      trigger:{"state":[{"reader":"works_season","args":{"status":"open_ready","resourceUnit":"grazing"}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true}],
      participantCards:["operator"],
      options:[
        {"label":"Review the pasture window","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"seasonal_operation","args":{"operation":"open","resourceUnit":"grazing"},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}}
      ]
    },
    {id:"works_pasture_care", pack:'works_technology', title:"Care has not arrived",
      text:"A seasonal facility requiring local care lacks its original available caretaker. The operating account cannot hire a replacement merely by opening the window.",
      trigger:{"state":[{"reader":"works_season","args":{"status":"care_unavailable","resourceUnit":"grazing"}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true}],
      participantCards:["operator"],
      options:[
        {"label":"Review the care blocker","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"seasonal_operation","args":{"operation":"open","resourceUnit":"grazing"},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}},
        {"label":"Consider the order of the work","chance":"works_schedule","success":{"text":"You can see which commitment must be settled first. The work itself remains to be done.","effects":{}},"failure":{"text":"The schedule remains uncertain. No extra hands or supplies have arrived.","effects":{}}}
      ]
    },
    {id:"works_drying_window", pack:'works_technology', title:"A window for fish drying",
      text:"The actual drying station has a permitted local weather window. A term supplies no fish: only existing catch and paid processing can furnish dried stock.",
      trigger:{"state":[{"reader":"works_season","args":{"status":"open_ready","profileId":"fish_drying_cool"}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true}],
      participantCards:["operator"],
      options:[
        {"label":"Review the drying window","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"seasonal_operation","args":{"operation":"open","profileId":"fish_drying_cool"},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}}
      ]
    },
    {id:"works_drying_stock", pack:'works_technology', title:"A use for the dried stock",
      text:"A drying station has enough actual preserved stock for its declared local allocation. Allocating it would consume that stock once and retain only the finite protection term.",
      trigger:{"state":[{"reader":"works_season","args":{"status":"allocate_ready","profileId":"fish_drying_cool"}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true}],
      participantCards:["operator"],
      options:[
        {"label":"Review the stock allocation","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"seasonal_operation","args":{"operation":"allocate","profileId":"fish_drying_cool"},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}}
      ]
    },
    {id:"works_boat_invoice", pack:'works_technology', title:"Paid work at the landing",
      text:"Completed paid material work can contribute to an ordinary private enterprise invoice. Reserving it would create neither a boat nor an enterprise.",
      trigger:{"state":[{"reader":"works_maritime","args":{"status":"prepare_ready"}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true}],
      participantCards:["operator"],
      options:[
        {"label":"Review a material reservation","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"maritime_operation","args":{"operation":"prepare"},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}}
      ]
    },
    {id:"works_mill_now", pack:'works_technology', title:"The knowledge and the site",
      text:"A milling construction choice meets its current knowledge and site requirements. The actual construction payment, property limits and upkeep still apply.",
      trigger:{"state":[{"reader":"works_construction","args":{"status":"ready","buildingId":"mill","technologyOnly":true}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true}],
      participantCards:["operator"],
      options:[
        {"label":"Review construction at the site","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"works_construction","args":{"buildingId":"mill","technologyOnly":true},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}}
      ]
    },
    {id:"works_boat_complete", pack:'works_technology', title:"The remaining invoice",
      text:"An original boat-work invoice can presently complete. Only its reserved paid materials, lawful launching place and remaining private payment can settle it.",
      trigger:{"state":[{"reader":"works_maritime","args":{"status":"complete_ready"}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true}],
      participantCards:["operator"],
      options:[
        {"label":"Review invoice completion","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"maritime_operation","args":{"operation":"complete"},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}}
      ]
    },
    {id:"works_boat_release", pack:'works_technology', title:"Material tied to an invoice",
      text:"A pending maritime invoice holds completed material work. Cancelling releases those materials; earlier processing costs remain spent.",
      trigger:{"state":[{"reader":"works_maritime","args":{"status":"pending"}}]}, weight:2, cooldown:8,
      participants:[{"slot":"operator","source":"context","required":true}],
      participantCards:["operator"],
      options:[
        {"label":"Review invoice cancellation","desc":"Review the current terms and blockers before confirming. Cancel spends nothing.","require":{"state":[{"reader":"works_payer","args":{"minimum":0}}]},"review":{"type":"maritime_operation","args":{"operation":"cancel"},"refusalOption":1}},
        {"label":"Leave the account unchanged","text":"The existing property, reservations and payments remain as they were.","effects":{}}
      ]
    }
  ]);
})();
