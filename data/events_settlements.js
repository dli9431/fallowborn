/* =========================================================================
   Fallowborn - deliberate daily-life meetings with persistent local folk.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(

{ id:'local_folk_commons', title:'A Turn on the Commons',
  trigger:{ never:true }, contextValidator:'local_folk_activity_valid',
  participants:[
    { slot:'resident', source:'context', required:true }
  ],
  participantCards:['resident'],
  text:'You find {resident} among the ordinary traffic of {settlement}. There is time enough to learn what kind of neighbor they may become.',
  options:[
    { label:'Listen, and ask after their household.',
      desc:'A patient conversation gives +3 Standing.',
      effects:{ standingCharacter:{participant:'resident', amt:3},
        custom:'local_folk_activity_resolve' } },
    { label:'Tell a story worth repeating.',
      desc:'Diplomacy may earn +7 Standing and +2 prestige; a poor telling loses 3 Standing.',
      chance:'skill_dip', effects:{ custom:'local_folk_activity_resolve' },
      success:{ text:'The tale lands well. {resident} laughs, then carries the best part onward.',
        effects:{ standingCharacter:{participant:'resident', amt:7}, prestige:2 } },
      failure:{ text:'The story wanders. {resident} finds a reason to turn back to other company.',
        effects:{ standingCharacter:{participant:'resident', amt:-3} } } },
    { label:'Challenge an opinion.',
      desc:'Learning may earn +5 Standing and +2 prestige; failure loses 5 Standing and plants a grievance.',
      chance:'skill_lea', effects:{ custom:'local_folk_activity_resolve' },
      success:{ text:'The disagreement sharpens both arguments without souring the company.',
        effects:{ standingCharacter:{participant:'resident', amt:5}, prestige:2 } },
      failure:{ text:'The point becomes a quarrel. {resident} will remember the slight.',
        effects:{ standingCharacter:{participant:'resident', amt:-5},
          rivalContact:{participant:'resident', score:1, cause:'commons_quarrel'} } } }
  ] },

{ id:'local_folk_work', title:'Shoulder to Shoulder',
  trigger:{ never:true }, contextValidator:'local_folk_activity_valid',
  participants:[
    { slot:'resident', source:'context', required:true }
  ],
  participantCards:['resident'],
  text:'At the shared work of {settlement}, {resident} makes room beside them. Labor reveals a person differently than talk alone.',
  options:[
    { label:'Take a full turn beside them.',
      desc:'Lose 1 health and gain +6 Standing.',
      effects:{ health:-1, standingCharacter:{participant:'resident', amt:6},
        custom:'local_folk_activity_resolve' } },
    { label:'Show a better way to do the work.',
      desc:'Stewardship may earn +7 Standing and 2 gold; failure loses 3 Standing.',
      chance:'skill_ste', effects:{ custom:'local_folk_activity_resolve' },
      success:{ text:'The change saves effort and material. {resident} gives you due credit.',
        effects:{ standingCharacter:{participant:'resident', amt:7}, gold:2 } },
      failure:{ text:'The clever method makes a muddle, and {resident} must put it right.',
        effects:{ standingCharacter:{participant:'resident', amt:-3} } } },
    { label:'Pay for another pair of hands.',
      require:{ goldMin:3 }, desc:'Spend 3 gold and gain +8 Standing.',
      effects:{ gold:-3, standingCharacter:{participant:'resident', amt:8},
        custom:'local_folk_activity_resolve' } }
  ] },

{ id:'local_folk_worship', title:'An Observance Shared',
  trigger:{ never:true }, contextValidator:'local_folk_activity_valid',
  participants:[
    { slot:'resident', source:'context', required:true }
  ],
  participantCards:['resident'],
  text:'You and {resident} meet in observance near {settlement}. Reverence, custom, and conscience all have their place here.',
  options:[
    { label:'Keep the observance together.',
      desc:'Gain 2 piety and +4 Standing.',
      effects:{ piety:2, standingCharacter:{participant:'resident', amt:4},
        custom:'local_folk_activity_resolve' } },
    { label:'Give alms in their name.',
      require:{ goldMin:3 }, desc:'Spend 3 gold; gain 4 piety and +7 Standing.',
      effects:{ gold:-3, piety:4,
        standingCharacter:{participant:'resident', amt:7},
        custom:'local_folk_activity_resolve' } },
    { label:'Discuss law and belief.',
      desc:'Learning may earn +6 Standing and 2 piety; failure loses 4 Standing.',
      chance:'skill_lea', effects:{ custom:'local_folk_activity_resolve' },
      success:{ text:'The exchange leaves both of you with more to consider and no need for anger.',
        effects:{ standingCharacter:{participant:'resident', amt:6}, piety:2 } },
      failure:{ text:'The discussion hardens into correction. {resident} leaves unconvinced and displeased.',
        effects:{ standingCharacter:{participant:'resident', amt:-4} } } }
  ] },

{ id:'local_folk_hospitality', title:'Food, Trade, and Rumor',
  trigger:{ never:true }, contextValidator:'local_folk_activity_valid',
  participants:[
    { slot:'resident', source:'context', required:true }
  ],
  participantCards:['resident'],
  text:'Near {settlement}, a little food and talk bring you into {resident}’s company.',
  options:[
    { label:'Share food and drink.',
      require:{ goldMin:2 }, desc:'Spend 2 gold and gain +7 Standing.',
      effects:{ gold:-2, standingCharacter:{participant:'resident', amt:7},
        custom:'local_folk_activity_resolve' } },
    { label:'Bargain together.',
      require:{ goldMin:1 },
      desc:'Stewardship may earn 3 gold and +4 Standing; failure costs 1 gold and loses 2 Standing.',
      chance:'skill_ste', effects:{ custom:'local_folk_activity_resolve' },
      success:{ text:'The bargain closes cleanly, and {resident} admires your eye for value.',
        effects:{ gold:3, standingCharacter:{participant:'resident', amt:4} } },
      failure:{ text:'The price turns against you. {resident} notices the error before you do.',
        effects:{ gold:-1, standingCharacter:{participant:'resident', amt:-2} } } },
    { label:'Trade rumors.',
      desc:'Intrigue may earn +5 Standing and +2 prestige; failure loses 4 Standing and plants a grievance.',
      chance:'skill_int', effects:{ custom:'local_folk_activity_resolve' },
      success:{ text:'You offer exactly enough truth to receive better news in return.',
        effects:{ standingCharacter:{participant:'resident', amt:5}, prestige:2 } },
      failure:{ text:'One rumor points too plainly back to you. {resident} takes the warning personally.',
        effects:{ standingCharacter:{participant:'resident', amt:-4},
          rivalContact:{participant:'resident', score:1, cause:'rumor_offense'} } } }
  ] }
);
