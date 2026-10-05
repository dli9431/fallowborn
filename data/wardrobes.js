/* =========================================================================
   Fallowborn: WARDROBES
   =========================================================================
   A wardrobe dresses a period: which garment, cloth color, trim, headwear
   and regalia a character wears by station band and career role. Eras name
   one through their costume slot (data/eras.js) and a government form may
   override it with its own costume (data/political_institutions.js); the
   portrait resolves the subject's government form first, then its era,
   then the first wardrobe here. Faces are not dressed here: skin and hair
   come from culture appearance profiles (data/cultures.js) and faith attire
   (religion properties.attire).

   Each wardrobe:
     garments: ordered rules, the first match chooses
       { garment, color:[r,g,b] }. garment names a shape registered in
       js/portrait.js: tunic, robe, cote, court, royal, habit, cassock,
       gambeson, doublet, lateTunic, lateCivil, lateMilitary, lateMantle, lateVestment.
     trim, fur: ordered rules, the first match chooses { color:[r,g,b] }.
     headwear: ordered rules, the first match chooses { headwear } (a kind
       painted by js/portrait.js) or { faithCover:true }, the headwear the
       character's faith expects of that sex (attire.covers). No match is
       bareheaded.
     chain: rules; when any matches, a full figure wears a neck chain with
       its faith's pendant (attire.pendant) or a stone.

   Rule conditions (all must hold; a rule without conditions always does):
     child, female: true or false
     minAge: years
     government: the subject's resolved government form id
     station / notStation: a FB.station query name (isSerf ... isEmperor,
       isGentle, isLanded, rulesRealm, isRoyal, isImperial)
     role: the career's primary role equals this
     roles / notRoles: the career has any of these roles
     faith: the faith attire has this flag set (attire.clergyPendant)
     tends: the culture appearance or the faith attire lists this kind in
       its tends list
     roll: { salt, index, above } or { salt, index, below }; a deterministic
       0 to 255 byte of the character's identity under that salt
     any: a list of condition sets, at least one of which holds
   ========================================================================= */
window.FBDATA = window.FBDATA || {};

FBDATA.wardrobes = {
  medieval:{
    garments:[
      { role:'cloister', garment:'habit', color:[96,80,58] },
      { role:'clergy', garment:'cassock', color:[60,56,62] },
      { role:'arms', garment:'gambeson', color:[128,110,80] },
      { role:'trading', garment:'doublet', color:[70,108,96] },
      { role:'labor', garment:'tunic', color:[112,92,61] },
      { role:'craft', garment:'tunic', color:[91,89,72] },
      { role:'noble', garment:'cote', color:[76,91,119] },
      { station:'isSerf', garment:'tunic', color:[122,102,72] },
      { station:'isFreeholder', garment:'tunic', color:[104,100,66] },
      { station:'isGentry', garment:'tunic', color:[88,104,66] },
      { station:'isBaron', garment:'cote', color:[72,96,130] },
      { station:'isCount', garment:'court', color:[140,64,58] },
      { station:'isDuke', garment:'court', color:[126,48,56] },
      { station:'isKing', garment:'royal', color:[106,58,126] },
      { garment:'royal', color:[88,44,116] }
    ],
    trim:[
      { station:'isLanded', color:[190,160,78] },
      { color:[146,126,92] }
    ],
    fur:[
      { station:'isRoyal', color:[232,226,214] },
      { color:[122,104,84] }
    ],
    headwear:[
      { child:true, station:'isRoyal', headwear:'circlet' },
      { female:false, child:false, notRoles:['cloister'], faithCover:true },
      { female:true, child:false, faithCover:true },
      { station:'isImperial', headwear:'imperial' },
      { station:'isRoyal', headwear:'crown' },
      { station:'rulesRealm', headwear:'circlet' },
      { female:true, minAge:46, roll:{ salt:'wardrobe-head', index:1, above:84 },
        headwear:'wimple' },
      { female:true, child:false, roll:{ salt:'wardrobe-head', index:1, above:168 },
        headwear:'veil' },
      { roles:['arms'], roll:{ salt:'wardrobe-head', index:2, above:96 },
        headwear:'helm' },
      { any:[{ roles:['trading'] }, { tends:'cap' }], child:false,
        roll:{ salt:'wardrobe-head', index:2, above:96 }, headwear:'cap' },
      { notStation:'isGentle', female:false, child:false,
        roll:{ salt:'wardrobe-head', index:2, above:208 }, headwear:'coif' },
      { roles:['clergy'], station:'isGentle', headwear:'mitre' },
      { female:true, child:false, station:'isGentle',
        roll:{ salt:'wardrobe-extra', index:0, above:150 }, headwear:'crespine' },
      { female:true, child:false, station:'isGentle',
        roll:{ salt:'wardrobe-extra', index:0, above:96 }, headwear:'fillet' },
      { female:true, child:true, roll:{ salt:'wardrobe-extra', index:0, above:176 },
        headwear:'garland' },
      { tends:'furHat', child:false, roll:{ salt:'wardrobe-extra', index:0, above:168 },
        headwear:'furHat' },
      { female:true, notStation:'isLanded', child:false,
        roll:{ salt:'wardrobe-extra', index:0, above:88 }, headwear:'kerchief' },
      { notStation:'isGentle', child:false,
        roll:{ salt:'wardrobe-extra', index:0, above:200 }, headwear:'strawHat' },
      { notStation:'rulesRealm', female:false, child:false,
        roll:{ salt:'wardrobe-extra', index:0, below:40 }, headwear:'chaperon' }
    ],
    chain:[
      { station:'rulesRealm' },
      { roles:['clergy','cloister'], faith:'clergyPendant' }
    ]
  },
  /* Clavi tunics, fastened mantles and vestments mark late antique rank. */
  late_antique:{
    garments:[
      { role:'cloister', garment:'lateVestment', color:[105,99,79] },
      { role:'clergy', garment:'lateVestment', color:[218,209,180] },
      { station:'isImperial', garment:'lateMantle', color:[92,43,103] },
      { government:'roman_civic', station:'isRoyal', garment:'lateMantle', color:[125,65,103] },
      { station:'isRoyal', garment:'lateMantle', color:[104,65,118] },
      { government:'federate_polity', station:'rulesRealm', garment:'lateMantle', color:[84,106,91] },
      { station:'isLanded', garment:'lateMantle', color:[124,81,69] },
      { roles:['arms'], garment:'lateMilitary', color:[142,111,80] },
      { roles:['civic'], garment:'lateCivil', color:[216,206,177] },
      { station:'isGentle', garment:'lateCivil', color:[190,173,144] },
      { roles:['trading'], garment:'lateTunic', color:[84,111,100] },
      { roles:['craft'], garment:'lateTunic', color:[113,109,87] },
      { station:'isSerf', garment:'lateTunic', color:[125,107,80] },
      { garment:'lateTunic', color:[129,117,91] }
    ],
    trim:[
      { station:'isImperial', color:[211,180,99] },
      { station:'isLanded', color:[190,160,78] },
      { roles:['clergy'], color:[165,96,79] },
      { station:'isGentle', color:[134,72,91] },
      { color:[146,126,92] }
    ],
    fur:[
      { station:'isRoyal', color:[232,226,214] },
      { color:[122,104,84] }
    ],
    headwear:[
      { station:'isImperial', headwear:'diadem' },
      { government:'roman_civic', station:'isRoyal', headwear:'none' },
      { station:'isRoyal', headwear:'circlet' },
      { roles:['arms'], child:false, roll:{ salt:'wardrobe-head', index:2, above:128 },
        headwear:'ridgeHelm' },
      { female:true, child:false, roll:{ salt:'wardrobe-head', index:1, above:150 },
        headwear:'veil' }
    ],
    chain:[
      { station:'rulesRealm' },
      { roles:['clergy','cloister'], faith:'clergyPendant' }
    ]
  }
};
