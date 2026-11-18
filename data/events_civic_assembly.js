/* Civic, assembly and operating-law decisions over existing public records. */
(function () {
  'use strict';
  FBDATA.eventPacks = FBDATA.eventPacks || {};
  FBDATA.eventPacks.civic_assembly = { eras:['high_medieval'], yearMin:1204, yearMax:1215 };
  FBDATA.eventChances = FBDATA.eventChances || {};
  FBDATA.eventChances.civic_household_heard = {base:0.5,min:0.2,max:0.8,steps:[{kind:'skill',id:'dip',factor:0.02}]};
  FBDATA.events.push(
    { id:'civic_stall_permission', pack:'civic_assembly', title:'The stall account',
      trigger:{state:[{reader:'owned_enterprise_law',args:{definitionId:'london_stall_license'}}]},
      weight:1, cooldown:12,
      text:'The operating law reaches your stall in London. Before putting more household money into trade, you can review whether permission is covered by an exemption, a transition or a paid term.',
      options:[
        {label:'Review payment for the first affected stall.',
          desc:'Confirm the actual private charge and public payee. Exempt or already covered trade may owe nothing; cancel keeps this decision open.',
          review:{type:'industry_operation',args:{definitionId:'london_stall_license',action:'pay',bindEnterprise:true},refusalOption:1}},
        {label:'Leave the account unchanged.',desc:'No payment or permission change.',effects:{}},
        {label:'Review pausing the first affected stall.',
          desc:'No permission payment. Production stops; ownership and existing worker wages remain. Cancel changes nothing.',
          review:{type:'industry_operation',args:{definitionId:'london_stall_license',action:'pause',bindEnterprise:true},refusalOption:1}},
        {label:'Review lawful operation of the first affected stall.',
          desc:'Resume only if current permission and court restrictions allow it. This review buys no permission and cancel changes nothing.',
          review:{type:'industry_operation',args:{definitionId:'london_stall_license',action:'resume',bindEnterprise:true},refusalOption:1}}
      ]},
    { id:'civic_guild_permission', pack:'civic_assembly', title:'Workshop permission',
      trigger:{state:[{reader:'owned_enterprise_law',args:{definitionId:'london_guild_license'}}]},
      weight:1, cooldown:12,
      text:'The workshop permission law applies to your property in London. Guild privilege and paid permission are different grounds for lawful work; neither should be assumed from possession of the tools.',
      options:[
        {label:'Review payment for the first affected workshop.',
          desc:'Check exemptions and the actual private charge before confirming. Payment grants no guild rank or office. Cancel keeps this decision open.',
          review:{type:'industry_operation',args:{definitionId:'london_guild_license',action:'pay',bindEnterprise:true},refusalOption:1}},
        {label:'Make no payment now.',desc:'Permission and guild membership remain unchanged.',effects:{}},
        {label:'Review pausing the first affected workshop.',
          desc:'Stop production without paying for permission. Retain ownership and existing worker wages; cancel changes nothing.',
          review:{type:'industry_operation',args:{definitionId:'london_guild_license',action:'pause',bindEnterprise:true},refusalOption:1}}
      ]},
    { id:'civic_levy_permission', pack:'civic_assembly', title:'The market levy account',
      trigger:{state:[{reader:'owned_enterprise_law',args:{definitionId:'london_market_levy'}}]},
      weight:1, cooldown:12,
      text:'The market levy applies to your stall in London. The present account depends on the enacted terms and your own exemptions.',
      options:[
        {label:'Review payment for the first affected stall.',
          desc:'Check the current charge and original public recipient before committing private money. This payment casts no ballot; cancel changes nothing.',
          review:{type:'industry_operation',args:{definitionId:'london_market_levy',action:'pay',bindEnterprise:true},refusalOption:1}},
        {label:'Leave the levy account for now.',desc:'No payment, ballot or change of law.',effects:{}}
      ]},
    { id:'civic_monopoly_pause', pack:'civic_assembly', title:'Work within the privilege',
      trigger:{state:[{reader:'owned_enterprise_law',args:{definitionId:'london_guild_exclusive'}}]},
      weight:1, cooldown:12,
      text:'An exclusive workshop law applies to your property in London. Its guild exemption may protect qualified work, but ownership alone supplies no exemption. You can stop production while considering your position.',
      options:[
        {label:'Review pausing the first affected workshop.',
          desc:'Pause without surrendering property or acquiring guild membership. Existing worker wages remain; cancel changes nothing.',
          review:{type:'industry_operation',args:{definitionId:'london_guild_exclusive',action:'pause',bindEnterprise:true},refusalOption:1}},
        {label:'Leave the workshop as it stands.',desc:'No change to permission, production or guild rank.',effects:{}}
      ]},
    { id:'civic_restriction_close', pack:'civic_assembly', title:'A shuttered trade',
      trigger:{state:[{reader:'owned_enterprise_law',args:{definitionId:'london_market_restriction'}}]},
      weight:1, cooldown:12,
      text:'The market restriction applies to your stall in London. You consider closing its operation rather than committing more to the business. Closing the trade does not sell the property or decide any accusation.',
      options:[
        {label:'Review closing the first affected stall.',
          desc:'Stop its operation, retaining ownership and existing worker obligations. No sale, conviction or repeal; cancel changes nothing.',
          review:{type:'industry_operation',args:{definitionId:'london_market_restriction',action:'close',bindEnterprise:true},refusalOption:1}},
        {label:'Retain the present operating choice.',desc:'No payment, closure or legal judgment.',effects:{}}
      ]}
  );
  Array.prototype.push.apply(FBDATA.events, [
  {
    "id": "civic_admission",
    "pack": "civic_assembly",
    "title": "Before the civic roll",
    "text": "You are qualified to ask for admission to the local civic constituency. Admission would bind no office, inheritance or public property.",
    "trigger": {
      "state": [
        {
          "reader": "civic_constituency",
          "args": {
            "kind": "civic",
            "status": "admission"
          }
        }
      ]
    },
    "weight": 1,
    "cooldown": 12,
    "participants": [
      {
        "slot": "principal",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "principal"
    ],
    "options": [
      {
        "label": "Review admission",
        "desc": "Current civic assent and qualifications decide admission. No payment or office grant; cancel changes nothing.",
        "review": {
          "type": "civic_office",
          "args": {
            "action": "admit"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision open",
        "desc": "No payment or public decision.",
        "effects": {}
      }
    ]
  },
  {
    "id": "civic_nomination",
    "pack": "civic_assembly",
    "title": "A place on the nomination list",
    "text": "An existing civic office has an open selection. Your qualification permits a nomination to be considered; election remains a separate decision.",
    "trigger": {
      "state": [
        {
          "reader": "civic_constituency",
          "args": {
            "kind": "civic",
            "status": "nomination"
          }
        }
      ]
    },
    "weight": 1,
    "cooldown": 12,
    "participants": [
      {
        "slot": "principal",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "principal"
    ],
    "options": [
      {
        "label": "Review my nomination",
        "desc": "The declared nomination fee comes from your private purse. This grants no office; cancel spends nothing.",
        "review": {
          "type": "civic_office",
          "args": {
            "action": "nominate"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision open",
        "desc": "No payment or public decision.",
        "effects": {}
      }
    ]
  },
  {
    "id": "civic_term_ending",
    "pack": "civic_assembly",
    "title": "The end of a civic term",
    "text": "Your current civic term has no more than thirty days remaining. You may retain the mandate until its ordinary deadline or review resignation.",
    "trigger": {
      "state": [
        {
          "reader": "civic_constituency",
          "args": {
            "kind": "civic",
            "status": "term_ending"
          }
        }
      ]
    },
    "weight": 1,
    "cooldown": 12,
    "participants": [
      {
        "slot": "principal",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "principal"
    ],
    "options": [
      {
        "label": "Review resignation",
        "desc": "End your own mandate without changing household property or public commitments. Cancel retains the term.",
        "review": {
          "type": "civic_office",
          "args": {
            "action": "resign"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision open",
        "desc": "No payment or public decision.",
        "effects": {}
      }
    ]
  },
  {
    "id": "civic_collective_dues",
    "pack": "civic_assembly",
    "title": "An extraordinary public account",
    "text": "Your public office does not make the treasury a household purse. A small temporary due can be considered only with the institution’s present assent.",
    "trigger": {
      "state": [
        {
          "reader": "civic_constituency",
          "args": {
            "kind": "civic",
            "status": "incumbent"
          }
        }
      ]
    },
    "weight": 1,
    "cooldown": 12,
    "participants": [
      {
        "slot": "principal",
        "source": "context",
        "required": true
      },
      {
        "slot": "counterparty",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "principal",
      "counterparty"
    ],
    "options": [
      {
        "label": "Review temporary dues",
        "desc": "Review 2 of public dues over 90 days and current assent. No private payment; cancel changes nothing.",
        "review": {
          "type": "civic_budget",
          "args": {
            "operation": "extraordinary_tax",
            "amount": 2,
            "duration": 90
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision open",
        "desc": "No payment or public decision.",
        "effects": {}
      }
    ]
  },
  {
    "id": "civic_public_borrowing",
    "pack": "civic_assembly",
    "title": "Borrowing in the institution’s name",
    "text": "A public loan would commit the institution beyond the present office holder. The review must identify a willing outside lender with actual public funds.",
    "trigger": {
      "state": [
        {
          "reader": "civic_constituency",
          "args": {
            "kind": "civic",
            "status": "incumbent"
          }
        }
      ]
    },
    "weight": 1,
    "cooldown": 12,
    "participants": [
      {
        "slot": "principal",
        "source": "context",
        "required": true
      },
      {
        "slot": "counterparty",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "principal",
      "counterparty"
    ],
    "options": [
      {
        "label": "Review public borrowing",
        "desc": "Receive 10 into the public treasury and owe 11 after 180 days, only with both parties’ assent. Your private purse pays nothing; cancel changes nothing.",
        "review": {
          "type": "civic_budget",
          "args": {
            "operation": "pledge",
            "amount": 10,
            "interest": 0.1,
            "duration": 180
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision open",
        "desc": "No payment or public decision.",
        "effects": {}
      }
    ]
  },
  {
    "id": "civic_public_repayment",
    "pack": "civic_assembly",
    "title": "A public repayment falls due",
    "text": "An existing institutional debt has reached its repayment date. The office may review payment from the public account to the original lender.",
    "trigger": {
      "state": [
        {
          "reader": "civic_constituency",
          "args": {
            "kind": "civic",
            "status": "debt_due"
          }
        }
      ]
    },
    "weight": 1,
    "cooldown": 12,
    "participants": [
      {
        "slot": "principal",
        "source": "context",
        "required": true
      },
      {
        "slot": "counterparty",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "principal",
      "counterparty"
    ],
    "options": [
      {
        "label": "Review the existing public debt",
        "desc": "Pay the actual outstanding balance from public funds while retaining the reserve. Cancel leaves the debt unchanged.",
        "review": {
          "type": "civic_budget",
          "args": {
            "operation": "repay"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision open",
        "desc": "No payment or public decision.",
        "effects": {}
      }
    ]
  },
  {
    "id": "assembly_nomination",
    "pack": "civic_assembly",
    "title": "A nomination before the households",
    "text": "The community has an open selection and you meet its declared local qualifications. Seeking nomination does not make the public holder your private estate.",
    "trigger": {
      "state": [
        {
          "reader": "civic_constituency",
          "args": {
            "kind": "assembly",
            "status": "nomination"
          }
        }
      ]
    },
    "weight": 1,
    "cooldown": 12,
    "participants": [
      {
        "slot": "principal",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "principal"
    ],
    "options": [
      {
        "label": "Review my nomination",
        "desc": "Pay only the declared private nomination fee. Recognition and selection remain separate; cancel spends nothing.",
        "review": {
          "type": "assembly_mandate",
          "args": {
            "action": "nominate"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision open",
        "desc": "No payment or public decision.",
        "effects": {}
      }
    ]
  },
  {
    "id": "assembly_term_ending",
    "pack": "civic_assembly",
    "title": "The delegate’s remaining days",
    "text": "Your current representative mandate has no more than thirty days left. The community keeps its public rights and commitments when the term ends.",
    "trigger": {
      "state": [
        {
          "reader": "civic_constituency",
          "args": {
            "kind": "assembly",
            "status": "term_ending"
          }
        }
      ]
    },
    "weight": 1,
    "cooldown": 12,
    "participants": [
      {
        "slot": "principal",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "principal"
    ],
    "options": [
      {
        "label": "Review resignation",
        "desc": "End your own mandate and open the canonical replacement selection. Your household property stays with its owner; cancel changes nothing.",
        "review": {
          "type": "assembly_mandate",
          "args": {
            "action": "resign"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision open",
        "desc": "No payment or public decision.",
        "effects": {}
      }
    ]
  },
  {
    "id": "assembly_collective_assent",
    "pack": "civic_assembly",
    "title": "A decision needing assent",
    "text": "You hold the community’s current mandate. A temporary extraordinary due needs the existing represented interests to assent to exact terms before the public action can proceed.",
    "trigger": {
      "state": [
        {
          "reader": "civic_constituency",
          "args": {
            "kind": "assembly",
            "status": "incumbent"
          }
        }
      ]
    },
    "weight": 1,
    "cooldown": 12,
    "participants": [
      {
        "slot": "principal",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "principal"
    ],
    "options": [
      {
        "label": "Review collective assent",
        "desc": "Seek approval for 2 of dues over 90 days. Confirmation records approval only and collects nothing; refusal and cancel spend nothing.",
        "review": {
          "type": "assembly_mandate",
          "args": {
            "action": "assent",
            "amount": 2,
            "duration": 90
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision open",
        "desc": "No payment or public decision.",
        "effects": {}
      }
    ]
  },
  {
    "id": "assembly_household_voice",
    "pack": "civic_assembly",
    "title": "Households at the meeting place",
    "text": "The local constituency speaks through its existing interests. Hearing their concerns does not add your household to a new office or turn common land into private property.",
    "trigger": {
      "state": [
        {
          "reader": "civic_constituency",
          "args": {
            "kind": "assembly",
            "status": "present"
          }
        }
      ]
    },
    "weight": 1,
    "cooldown": 12,
    "options": [
      {
        "label": "Listen and go home",
        "effects": {}
      },
      {
        "label": "Discuss household concerns",
        "chance": "civic_household_heard",
        "success": {
          "text": "Your account is heard, without conferring a seat.",
          "effects": {
            "popularOpinion": 1
          }
        },
        "failure": {
          "text": "No common view emerges. Membership remains as it was.",
          "effects": {}
        }
      }
    ]
  },
  {
    "id": "civic_town_hearing",
    "pack": "civic_assembly",
    "title": "Before the council",
    "text": "The declared London market levy can be put to the existing council hearing. Opening a hearing reserves its session; it does not enact a levy.",
    "trigger": {
      "state": [
        {
          "reader": "industry_hearing",
          "args": {
            "definitionId": "london_market_levy",
            "consumer": "town",
            "status": "available"
          }
        }
      ]
    },
    "weight": 1,
    "cooldown": 12,
    "options": [
      {
        "label": "Review opening the hearing",
        "desc": "No payment or deed day. Opening spends the existing annual session; cancel preserves it.",
        "review": {
          "type": "industry_hearing",
          "args": {
            "definitionId": "london_market_levy",
            "consumer": "town",
            "action": "begin"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision open",
        "desc": "No payment or public decision.",
        "effects": {}
      }
    ]
  },
  {
    "id": "civic_town_trade_ballot",
    "pack": "civic_assembly",
    "title": "A levy proposed against your trade",
    "text": "A pending London hearing concerns the same trade as your existing household stall. Exposure gives you an interest, but a ballot still requires your own current seat.",
    "trigger": {
      "state": [
        {
          "reader": "industry_hearing",
          "args": {
            "definitionId": "london_market_levy",
            "consumer": "town",
            "status": "affected_proposal"
          }
        }
      ]
    },
    "weight": 1,
    "cooldown": 12,
    "options": [
      {
        "label": "Review opposing the proposal",
        "desc": "Cast only your own current ballot. No payment, enactment or repeal; cancel changes nothing.",
        "review": {
          "type": "industry_hearing",
          "args": {
            "definitionId": "london_market_levy",
            "consumer": "town",
            "action": "ballot",
            "posture": "oppose"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision open",
        "desc": "No payment or public decision.",
        "effects": {}
      },
      {
        "label": "Review abstention",
        "desc": "Record abstention for your own current seat. Cancel changes nothing.",
        "review": {
          "type": "industry_hearing",
          "args": {
            "definitionId": "london_market_levy",
            "consumer": "town",
            "action": "ballot",
            "posture": "abstain"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Review withdrawing my proposal",
        "desc": "Only the original living proposer may withdraw. The spent annual session is retained; cancel changes nothing.",
        "review": {
          "type": "industry_hearing",
          "args": {
            "definitionId": "london_market_levy",
            "consumer": "town",
            "action": "withdraw"
          },
          "refusalOption": 1
        }
      }
    ]
  },
  {
    "id": "civic_estates_hearing",
    "pack": "civic_assembly",
    "title": "Before the Estates",
    "text": "The declared London market levy can be put to the existing Estates hearing. Opening a hearing reserves its session; it does not enact a levy.",
    "trigger": {
      "state": [
        {
          "reader": "industry_hearing",
          "args": {
            "definitionId": "london_market_levy",
            "consumer": "estates",
            "status": "available"
          }
        }
      ]
    },
    "weight": 1,
    "cooldown": 12,
    "options": [
      {
        "label": "Review opening the hearing",
        "desc": "No payment or deed day. Opening spends the existing annual session; cancel preserves it.",
        "review": {
          "type": "industry_hearing",
          "args": {
            "definitionId": "london_market_levy",
            "consumer": "estates",
            "action": "begin"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision open",
        "desc": "No payment or public decision.",
        "effects": {}
      }
    ]
  },
  {
    "id": "civic_estates_trade_ballot",
    "pack": "civic_assembly",
    "title": "A levy proposed against your trade",
    "text": "A pending London hearing concerns the same trade as your existing household stall. Exposure gives you an interest, but a ballot still requires your own current seat.",
    "trigger": {
      "state": [
        {
          "reader": "industry_hearing",
          "args": {
            "definitionId": "london_market_levy",
            "consumer": "estates",
            "status": "affected_proposal"
          }
        }
      ]
    },
    "weight": 1,
    "cooldown": 12,
    "options": [
      {
        "label": "Review opposing the proposal",
        "desc": "Cast only your own current ballot. No payment, enactment or repeal; cancel changes nothing.",
        "review": {
          "type": "industry_hearing",
          "args": {
            "definitionId": "london_market_levy",
            "consumer": "estates",
            "action": "ballot",
            "posture": "oppose"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision open",
        "desc": "No payment or public decision.",
        "effects": {}
      },
      {
        "label": "Review abstention",
        "desc": "Record abstention for your own current seat. Cancel changes nothing.",
        "review": {
          "type": "industry_hearing",
          "args": {
            "definitionId": "london_market_levy",
            "consumer": "estates",
            "action": "ballot",
            "posture": "abstain"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Review withdrawing my proposal",
        "desc": "Only the original living proposer may withdraw. The spent annual session is retained; cancel changes nothing.",
        "review": {
          "type": "industry_hearing",
          "args": {
            "definitionId": "london_market_levy",
            "consumer": "estates",
            "action": "withdraw"
          },
          "refusalOption": 1
        }
      }
    ]
  },
  {
    "id": "civic_license_deadline",
    "pack": "civic_assembly",
    "title": "A permission deadline approaches",
    "text": "A current stall permission or transition under the London stall law ends within thirty days. Check the actual remaining coverage before putting more household money into trade.",
    "trigger": {
      "state": [
        {
          "reader": "industry_business",
          "args": {
            "definitionId": "london_stall_license",
            "status": "deadline"
          }
        }
      ]
    },
    "weight": 1,
    "cooldown": 12,
    "options": [
      {
        "label": "Review the stall account",
        "desc": "Review the actual private payment and existing coverage. This review does not extend a paid permit early; cancel spends nothing.",
        "review": {
          "type": "industry_operation",
          "args": {
            "definitionId": "london_stall_license",
            "action": "pay",
            "bindEnterprise": true
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision open",
        "desc": "No payment or public decision.",
        "effects": {}
      }
    ]
  },
  {
    "id": "civic_exemption_request",
    "pack": "civic_assembly",
    "title": "A request for temporary relief",
    "text": "The original court can consider one temporary exemption for your affected stall under the existing London law. A request promises neither a grant nor repeal.",
    "trigger": {
      "state": [
        {
          "reader": "industry_business",
          "args": {
            "definitionId": "london_stall_license",
            "status": "relief"
          }
        }
      ]
    },
    "weight": 1,
    "cooldown": 12,
    "participants": [
      {
        "slot": "operator",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "operator"
    ],
    "options": [
      {
        "label": "Review an exemption request",
        "desc": "No payment. The review discloses chance and duration; refusal spends this business’s request. Cancel preserves it.",
        "review": {
          "type": "industry_relief",
          "args": {
            "definitionId": "london_stall_license"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision open",
        "desc": "No payment or public decision.",
        "effects": {}
      }
    ]
  },
  {
    "id": "civic_trade_complaint",
    "pack": "civic_assembly",
    "title": "The recorded trading complaint",
    "text": "Actual unauthorized output from your stall has already produced a material-evidence complaint under the applicable London restriction. You may answer through the existing court procedure.",
    "trigger": {
      "state": [
        {
          "reader": "industry_enforcement",
          "args": {
            "definitionId": "london_market_restriction",
            "audience": "self"
          }
        }
      ]
    },
    "weight": 1,
    "cooldown": 12,
    "participants": [
      {
        "slot": "operator",
        "source": "context",
        "required": true
      },
      {
        "slot": "principal",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "operator",
      "principal"
    ],
    "options": [
      {
        "label": "Review answering the complaint",
        "desc": "Request the ordinary arrest demand and hearing. No conviction, payment or new allegation; cancel changes nothing.",
        "review": {
          "type": "industry_enforcement",
          "args": {
            "definitionId": "london_market_restriction",
            "audience": "self"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision open",
        "desc": "No payment or public decision.",
        "effects": {}
      }
    ]
  },
  {
    "id": "civic_competing_operator",
    "pack": "civic_assembly",
    "title": "Another operator’s recorded output",
    "text": "Another living operator has a retained material-evidence complaint under the applicable London workshop permission. You hold its competent jurisdiction. The record concerns actual past output, not an assumed competing business.",
    "trigger": {
      "state": [
        {
          "reader": "industry_enforcement",
          "args": {
            "definitionId": "london_guild_license",
            "audience": "other"
          }
        }
      ]
    },
    "weight": 1,
    "cooldown": 12,
    "participants": [
      {
        "slot": "operator",
        "source": "context",
        "required": true
      },
      {
        "slot": "principal",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "operator",
      "principal"
    ],
    "options": [
      {
        "label": "Review enforcement of the existing complaint",
        "desc": "Review the actual operator, authority and ordinary arrest procedure. A hearing must decide the case; cancel creates no allegation or judgment.",
        "review": {
          "type": "industry_enforcement",
          "args": {
            "definitionId": "london_guild_license",
            "audience": "other"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision open",
        "desc": "No payment or public decision.",
        "effects": {}
      }
    ]
  }
]);
  FBDATA.events.push({
  "id": "assembly_representative_choice",
  "pack": "civic_assembly",
  "title": "Keeping a public mandate",
  "text": "You hold the current community mandate. You may continue serving or review leaving the office through the existing replacement procedure. Public commitments belong to the community.",
  "trigger": {
    "state": [
      {
        "reader": "civic_constituency",
        "args": {
          "kind": "assembly",
          "status": "incumbent"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 12,
  "participants": [
    {
      "slot": "principal",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "principal"
  ],
  "options": [
    {
      "label": "Review resignation",
      "desc": "End only your own mandate and open a replacement selection. Your household and the public accounts retain their property; cancel changes nothing.",
      "review": {
        "type": "assembly_mandate",
        "args": {
          "action": "resign"
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Continue serving",
      "effects": {}
    }
  ]
});
  FBDATA.eventSubscriptions = FBDATA.eventSubscriptions || {};
  FBDATA.eventSubscriptions.civic_stall_permission = [{hook:'law_enacted',require:{state:[{reader:'owned_enterprise_law',args:{definitionId:'london_stall_license'}}]}}];
  FBDATA.eventSubscriptions.civic_guild_permission = [{hook:'law_enacted',require:{state:[{reader:'owned_enterprise_law',args:{definitionId:'london_guild_license'}}]}}];
  FBDATA.eventSubscriptions.civic_levy_permission = [{hook:'law_enacted',require:{state:[{reader:'owned_enterprise_law',args:{definitionId:'london_market_levy'}}]}}];
  FBDATA.eventSubscriptions.civic_monopoly_pause = [{hook:'law_enacted',require:{state:[{reader:'owned_enterprise_law',args:{definitionId:'london_guild_exclusive'}}]}}];
  FBDATA.eventSubscriptions.civic_restriction_close = [{hook:'law_enacted',require:{state:[{reader:'owned_enterprise_law',args:{definitionId:'london_market_restriction'}}]}}];
})();
