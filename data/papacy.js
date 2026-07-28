/* Fallowborn — the Catholic Papacy.
   Pure definitions only: js/papacy.js owns saved state and simulation. */
window.FBDATA = window.FBDATA || {};

(function () {
  'use strict';

  FBDATA.papacy = {
    targetCollege:12,
    hardCap:18,
    annualAppointments:2,
    cardinalRequirements:{
      age:35,
      learning:14,
      piety:250,
      prestige:150,
      papalOpinion:25,
      petitionGold:25,
      refusalCooldownDays:720
    },
    authority:{
      startByBookmark:{ '867':65, '1066':55 },
      bands:[
        { min:0, max:24, id:'disputed', name:'Disputed' },
        { min:25, max:49, id:'contested', name:'Contested' },
        { min:50, max:74, id:'established', name:'Established' },
        { min:75, max:100, id:'commanding', name:'Commanding' }
      ],
      gates:{ sanctions:25, investiture:25, arbitrarySanction:50, greatHolyWar:50, council:55 },
      acceptedInvestiture:3,
      obeyedSanction:2,
      reunification:5,
      defiedCommand:-5,
      arbitrarySanction:-12,
      lostRome:-15,
      lostDecisiveWar:-15,
      repeatedNepotism:-5
    },
    elections:[
      {
        id:'roman_assent',
        from:null,
        through:1058,
        name:'Roman election with outside assent',
        threshold:'majority',
        shortlist:'roman',
        outsideAssent:true,
        vacancyDays:0,
        enclosed:false
      },
      {
        id:'cardinal_shortlist',
        from:1059,
        through:1178,
        name:'Cardinal-bishop shortlist',
        threshold:'majority',
        shortlist:'bishops',
        outsideAssent:false,
        vacancyDays:0,
        enclosed:false
      },
      {
        id:'two_thirds',
        from:1179,
        through:1273,
        name:'Equal cardinal suffrage',
        threshold:'twoThirds',
        shortlist:'all',
        outsideAssent:false,
        vacancyDays:0,
        enclosed:false
      },
      {
        id:'conclave',
        from:1274,
        through:null,
        name:'Enclosed conclave',
        threshold:'twoThirds',
        shortlist:'all',
        outsideAssent:false,
        vacancyDays:10,
        enclosed:true
      }
    ],
    cardinalOrders:[
      { id:'bishop', name:'Cardinal Bishop' },
      { id:'priest', name:'Cardinal Priest' },
      { id:'deacon', name:'Cardinal Deacon' }
    ],
    romanTitles:[
      'Albano',
      'Frascati',
      'Ostia',
      'Palestrina',
      'Porto',
      'Sabina',
      'Santa Cecilia',
      'Santa Prassede',
      'Santa Sabina',
      'San Crisogono',
      'San Lorenzo in Damaso',
      'San Marco',
      'Santa Maria in Cosmedin',
      'Santa Maria in Trastevere',
      'Santi Apostoli',
      'Santi Nereo e Achilleo',
      'San Nicola in Carcere',
      'Sant’Eustachio'
    ],
    blocs:[
      { id:'reform', name:'Reform' },
      { id:'curial', name:'Curial' },
      { id:'monastic', name:'Monastic' }
    ],
    tactics:[
      {
        id:'negotiate',
        name:'Private negotiation',
        desc:'Work upon one elector through trust, friendship, and practical argument.',
        target:'elector'
      },
      {
        id:'doctrine',
        name:'Doctrinal appeal',
        desc:'Appeal to the commitments of your own church party.',
        target:'none'
      },
      {
        id:'benefice',
        name:'Promise a benefice',
        desc:'Offer future patronage. The saved obligation will cost authority if you win.',
        target:'elector'
      },
      {
        id:'backing',
        name:'Invoke secular backing',
        desc:'Bring a sovereign patron’s weight into the election. Enclosure ends this tactic.',
        target:'none',
        closedFrom:1274
      },
      {
        id:'withdraw',
        name:'Withdraw and endorse',
        desc:'Leave the contest and direct your supporters toward another candidate.',
        target:'candidate'
      }
    ],
    regnalNames:[
      'John', 'Benedict', 'Gregory', 'Leo', 'Stephen', 'Nicholas',
      'Adrian', 'Alexander', 'Clement', 'Innocent', 'Urban',
      'Paschal', 'Eugene', 'Victor', 'Lucius'
    ],
    regnalSeeds:{
      '867':{
        John:8, Benedict:3, Gregory:4, Leo:4, Stephen:5, Nicholas:1,
        Adrian:1, Alexander:0, Clement:2, Innocent:1, Urban:1,
        Paschal:1, Eugene:2, Victor:2, Lucius:1
      },
      '1066':{
        John:19, Benedict:9, Gregory:6, Leo:9, Stephen:9, Nicholas:2,
        Adrian:1, Alexander:2, Clement:2, Innocent:2, Urban:1,
        Paschal:1, Eugene:2, Victor:2, Lucius:2
      }
    },
    investiture:{
      reformFrom:1075,
      concordatFrom:1122,
      policies:{
        lay:{
          name:'Lay investiture',
          desc:'The sovereign names bishops.',
          tax:0.05,
          strength:0.05,
          piety:-1
        },
        canonical:{
          name:'Canonical investiture',
          desc:'Cathedral and Papal authority name bishops.',
          tax:-0.05,
          strength:-0.05,
          piety:2
        },
        concordat:{
          name:'Concordat',
          desc:'The church elects while the sovereign retains a temporal role.',
          tax:0,
          strength:0,
          piety:1
        }
      }
    },
    excommunication:{
      justifiedPiety:100,
      arbitraryPiety:300,
      cooldownDays:720,
      realmStrength:-0.10,
      catholicOpinion:-25,
      arbitraryCatholicOpinion:-20
    },
    schism:{
      firstBallot:9,
      maximumAuthority:30,
      leaderShare:1 / 3,
      aiCrisisChance:0.25,
      switchPiety:150,
      switchPrestige:100,
      switchCooldownDays:1800,
      councilAfterDays:3600,
      successorCardinals:3,
      successorSupporters:2,
      overwhelmingShare:0.75,
      patronStipend:5
    },
    balance:{
      cardinalPietyYield:3.5,
      popeRomanRevenue:18,
      popeLegationGold:25,
      popeLegationAuthority:1,
      recognitionBargainGold:25,
      recognitionBargainAuthorityCost:2,
      compromiseAfterBallots:6,
      forceAfterBallots:12,
      consistoryOpinionLoss:10,
      beneficeAuthorityCost:2
    }
  };
})();
