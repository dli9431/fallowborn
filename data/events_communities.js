/* Fallowborn — reusable historical community situations.
   These are queued situation definitions rather than automatic map scripts:
   callers supply the county/settlement context, and every option remains a
   bounded choice. Historical calibration draws on Nora Berend (ed.),
   Christianization and the Rise of Christian Monarchy (Cambridge, 2007),
   Miri Rubin, Cities of Strangers (Cambridge, 2020), and The Cambridge
   Economic History of Europe, vol. I, “Settlement and Colonization of
   Europe.” Sources describe long conversion processes, elite sponsorship,
   invited settlers, durable urban difference, and coercion with resistance;
   they do not prescribe a modern border or guaranteed outcome. */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(
{ id:'community_peaceful_adoption', title:'Teaching at the Hearth',
  contextValidator:'community_historical_context_valid',
  trigger:{ never:true,
    countyCommunityMixed:{ kind:'faith', minCommunities:2,
      minorityShareMin:0.10 },
    countyCommunityShare:{ kind:'faith', target:'catholic',
      min:0.10, max:0.80 } },
  text:'Neighbors have begun attending one another’s feasts and instruction. Some ask for baptism; others ask that custom be left to grow at its own pace.',
  options:[
    { label:'Welcome those who come freely.',
      desc:'A small, bounded group adopts the faith without compulsion.',
      effects:{ countyCommunityTransfer:{ kind:'faith', target:'catholic',
        amount:40, cause:'peaceful adoption' } } },
    { label:'Let each hearth decide in its own time.',
      desc:'No community changes immediately.', effects:{ piety:1 } }
  ]},

{ id:'community_elite_led_conversion', title:'Patronage From the Hall',
  contextValidator:'community_historical_context_valid',
  trigger:{ never:true,
    countyCommunityShare:{ kind:'faith', target:'catholic',
      min:0.10, max:0.70 },
    countyCommunityProject:{ kind:'faith', active:false } },
  text:'Clerks and leading households offer schools, offices, and patronage around a new religious settlement. Their reach is real, but the county will not change in a season.',
  options:[
    { label:'Sustain the settlement.',
      desc:'Begin gradual, integrative work in this county.',
      effects:{ countyCommunityProject:{ kind:'faith', target:'catholic',
        policy:'integrative', sponsor:'$owner' } } },
    { label:'Keep the hall apart from the villages.',
      desc:'Elite practice does not become a territorial project.',
      effects:{ prestige:1 } }
  ]},

{ id:'community_frontier_settlement', title:'Families at the Frontier',
  contextValidator:'community_historical_context_valid',
  trigger:{ never:true,
    countyCommunityShare:{ kind:'culture', target:'norse',
      min:0.05, max:0.80 } },
  text:'Families seek land across the frontier. A charter could move a modest community without emptying the place they leave.',
  options:[
    { label:'Grant land near home.',
      desc:'Move a bounded Norse community from the event county to your home county.',
      effects:{ communityResettlement:{ fromProvinceId:'$context',
        toProvinceId:'$home', community:{ culture:'norse' }, rate:0.05,
        cause:'frontier settlement' } } },
    { label:'Leave the frontier open.',
      desc:'No families are moved.', effects:{ prestige:1 } }
  ]},

{ id:'community_urban_minority', title:'The Strangers’ Quarter',
  contextValidator:'community_historical_context_valid',
  trigger:{ never:true,
    settlementCommunityMixed:{ kind:'culture', minCommunities:2,
      minorityShareMin:0.10, settlement:'$context' },
    settlementCommunityProject:{ kind:'culture', active:true,
      settlement:'$context' } },
  text:'Long-settled strangers keep workshops, worship, and kin in one quarter. Their ties sustain the town even as officials press for conformity.',
  options:[
    { label:'Protect the quarter’s customs.',
      desc:'Stop the local assimilation project.',
      effects:{ stopSettlementCommunityProject:{ kind:'culture',
        settlement:'$context' } } },
    { label:'Keep the present policy.',
      desc:'The minority persists while the existing project continues.',
      effects:{ prestige:1 } }
  ]},

{ id:'community_coercive_backlash', title:'Flight From the Officials',
  contextValidator:'community_historical_context_valid',
  trigger:{ never:true,
    countyCommunityProject:{ kind:'faith', active:true,
      policy:'coercive' },
    countyCommunityShare:{ kind:'faith', target:'norse_pagan',
      min:0.08, max:0.80 } },
  text:'Searches and penalties harden resistance. Some households prepare to flee rather than submit.',
  options:[
    { label:'End the enforcement.',
      desc:'Stop the county faith project before more people leave.',
      effects:{ stopCountyCommunityProject:'faith' } },
    { label:'Drive the holdouts onward.',
      desc:'A bounded Norse-pagan community is expelled into a neighboring county.',
      effects:{ communityExpulsion:{ fromProvinceId:'$context',
        toProvinceId:'$destination',
        community:{ religion:'norse_pagan' }, rate:0.04,
        cause:'coercive backlash' }, popularOpinion:-5 } }
  ]}
);
