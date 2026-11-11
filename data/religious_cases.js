/* A discipline cause, not a declaration of religious guilt. */
(function () {
  'use strict';
  FBDATA.religiousCases = {
    roman_clerical_violence:{
      name:'Violence against clergy',
      desc:'Examine a recorded attack on a cleric. An accusation permits a hearing, not a presumption of guilt. Only the temporal court can enforce a secular sentence or recover the named delegated {term:fief}.',
      cause:'clerical_violence', bookmarkId:'1204', provinceId:'roma', realmId:'papacy_1204',
      faiths:['catholic'], yearMin:1198, yearMax:1216,
      fee:2, settlementShare:0.15, settlementMax:100, settlementRecipient:'victim',
      offerDays:30, penanceSentence:'penance', prisonSentence:'imprisonment',
      secularSentence:'imprisonment', allowFief:true,
      defendantPolicy:'challenge', bishopPolicy:'penance', enforcementPolicy:'accept'
    }
  };
})();
