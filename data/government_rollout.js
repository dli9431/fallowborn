/* Dated constitutions for fresh campaigns. Retained worlds and saved profiles
   are never rewritten. See docs/research/government-rollout.md for evidence,
   approximation boundaries and explicitly unresolved consumers. */
(function () {
  'use strict';
  FBDATA.governmentAdministrationProfiles = {
    umayyad_711:{ name:'Umayyad public administration (711)',
      offices:['public_governor','public_fiscal_officer','public_commander'],
      governor:'public_governor', fiscal:'public_fiscal_officer', commander:'public_commander',
      appointmentCost:5, termDays:720, confirmation:'continues',
      finance:{ kind:'salary', share:0.15, salary:6, serviceShare:0, remittance:1 },
      accession:{ mode:'designation', minimumAge:16, allowMinor:true, officeCandidates:false, threshold:0.5,
        interests:[{ id:'provincial', role:'governor', weight:2 },{ id:'army', role:'commander', weight:1 }] } },
    byzantine_711:{ name:'Eastern Roman public administration (711)',
      offices:['byzantine_strategos','byzantine_logothete','byzantine_commander'],
      governor:'byzantine_strategos', fiscal:'byzantine_logothete', commander:'byzantine_commander',
      appointmentCost:5, termDays:720, confirmation:'reaffirm',
      finance:{ kind:'salary', share:0.10, salary:4, serviceShare:0.5, remittance:1 },
      accession:{ mode:'recognition', minimumAge:16, allowMinor:false, officeCandidates:true, threshold:0.5,
        interests:[{ id:'civil', role:'fiscal', weight:1 },{ id:'provincial', role:'governor', weight:2 },
          { id:'army', role:'commander', weight:1 }] } },
    byzantine_867:{ name:'Byzantine public administration (867)',
      offices:['byzantine_strategos','byzantine_logothete','byzantine_commander'],
      governor:'byzantine_strategos', fiscal:'byzantine_logothete', commander:'byzantine_commander',
      appointmentCost:5, termDays:720, confirmation:'reaffirm',
      finance:{ kind:'salary', share:0.10, salary:4, serviceShare:0.5, remittance:1 },
      accession:{ mode:'recognition', minimumAge:16, allowMinor:false, officeCandidates:true, threshold:0.5,
        interests:[{ id:'fiscal', role:'fiscal', weight:1 },{ id:'army', role:'commander', weight:2 }] } },
    abbasid_867:{ name:'Abbasid public administration (867)',
      offices:['abbasid_wali','abbasid_amil','abbasid_commander'],
      governor:'abbasid_wali', fiscal:'abbasid_amil', commander:'abbasid_commander',
      appointmentCost:5, termDays:720, confirmation:'continues',
      finance:{ kind:'salary', share:0.15, salary:6, serviceShare:0, remittance:1 },
      accession:{ mode:'recognition', minimumAge:16, allowMinor:true, officeCandidates:false, threshold:0.5,
        interests:[{ id:'fiscal', role:'fiscal', weight:1 },{ id:'army', role:'commander', weight:2 }] } },
    byzantine_1066:{ name:'Byzantine public administration (1066)',
      offices:['public_governor','byzantine_logothete','byzantine_commander'],
      governor:'public_governor', fiscal:'byzantine_logothete', commander:'byzantine_commander',
      appointmentCost:5, termDays:720, confirmation:'reaffirm',
      finance:{ kind:'salary', share:0.10, salary:4, serviceShare:0.25, remittance:1 },
      accession:{ mode:'recognition', minimumAge:16, allowMinor:false, officeCandidates:true, threshold:0.5,
        interests:[{ id:'civil', role:'fiscal', weight:2 },{ id:'provincial', role:'governor', weight:1 },
          { id:'army', role:'commander', weight:2 }] } }
  };
  Object.assign(FBDATA.administrationProfiles, FBDATA.governmentAdministrationProfiles);

  /* Election law remains exclusively in FBDATA.papacy. These policies bind
     actual temporal territory to its result, never elect another pope. */
  FBDATA.governmentEcclesiasticalProfiles = {
    papal_temporal_800:{ name:'Papal temporal government (800)', source:'papal_election',
      chapter:false, layRecognition:false, appointmentCost:0, recognitionCost:0,
      reserve:5, revenueRate:1, levyRate:1,
      interim:['revenue','peace','defence'], reserved:['grant','extraordinary_tax','pledge'],
      powers:['ban','peace','revenue'] },
    papal_temporal_867:{ name:'Papal temporal government (867)', source:'papal_election',
      chapter:false, layRecognition:false, appointmentCost:0, recognitionCost:0,
      reserve:5, revenueRate:1, levyRate:1,
      interim:['revenue','peace','defence'], reserved:['grant','extraordinary_tax','pledge'],
      powers:['ban','peace','revenue'] },
    papal_temporal_1066:{ name:'Papal temporal government (1066)', source:'papal_election',
      chapter:false, layRecognition:false, appointmentCost:0, recognitionCost:0,
      reserve:10, revenueRate:1, levyRate:1,
      interim:['revenue','peace','defence','levy'], reserved:['grant','extraordinary_tax','pledge'],
      powers:['ban','peace','revenue'] }
  };
  Object.assign(FBDATA.ecclesiasticalProfiles, FBDATA.governmentEcclesiasticalProfiles);

  /* This is source composition, not a new engine or mod patch language.
     Load after date-owned geography revisions. Copy all fields of the current
     revision, then replace its complete realm list through the normal contract.
     Baseline and previous revisions retain their independent declarations. */
  var assignments = {
    '711':{
      byzantium_711:{ government:'administrative_monarchy', administrationProfileId:'byzantine_711' },
      umayyad_711:{ government:'administrative_monarchy', administrationProfileId:'umayyad_711' }
    },
    '800':{
      papacy:{ government:'ecclesiastical_principality',
        ecclesiastical:{ profileId:'papal_temporal_800', officeId:'catholic', institutionId:null } }
    },
    '867':{
      byzantium:{ government:'administrative_monarchy', administrationProfileId:'byzantine_867' },
      abbasid:{ government:'administrative_monarchy', administrationProfileId:'abbasid_867' },
      papacy:{ government:'ecclesiastical_principality',
        ecclesiastical:{ profileId:'papal_temporal_867', officeId:'catholic', institutionId:null } }
    },
    '1066':{
      byzantium_1066:{ government:'administrative_monarchy', administrationProfileId:'byzantine_1066' },
      papacy_1066:{ government:'ecclesiastical_principality',
        ecclesiastical:{ profileId:'papal_temporal_1066', officeId:'catholic', institutionId:null } }
    }
  };
  Object.keys(assignments).forEach(function (id) {
    var base = FBDATA.bookmarks[id], revisions = base.revisions || {baseline:{}},
      previous = base.revision || 'baseline', changes = assignments[id];
    var inherited = Object.assign({}, revisions.baseline, revisions[previous]);
    function assigned(realms) {
      var found = {};
      var revised = realms.map(function (realm) {
        if (!Object.prototype.hasOwnProperty.call(changes, realm.id)) return realm;
        found[realm.id] = true;
        return Object.assign({}, realm, JSON.parse(JSON.stringify(changes[realm.id])));
      });
      Object.keys(changes).forEach(function (rid) {
        if (!found[rid]) throw new Error('Missing government rollout realm: ' + id + '/' + rid);
      });
      return revised;
    }
    /* Keep the already established original-geography government revision
       when a date now composes an expanded fresh world before this file. */
    base.revisions = Object.assign({}, revisions);
    if (previous !== 'baseline' && !Object.prototype.hasOwnProperty.call(revisions, 'governments_v2')) {
      base.revisions.governments_v2 = Object.assign({}, revisions.baseline,
        {realms:assigned(revisions.baseline.realms || base.realms)});
    }
    var revised = assigned(inherited.realms || base.realms);
    var revisionId = previous === 'baseline' ? 'governments_v2' : previous + '_governments_v2';
    if (Object.prototype.hasOwnProperty.call(revisions, revisionId))
      throw new Error('Duplicate government rollout revision: ' + id + '/' + revisionId);
    base.revisions[revisionId] = Object.assign({}, inherited, {realms:revised});
    base.revision = revisionId;
  });
})();
