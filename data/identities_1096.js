/* Faith declarations for the spring 1096 opening. The complete bookmark
   composer publishes detached copies into the ordinary religions catalogue.
   Loading this source alone changes no effective faith or existing world.
   Settings preserve the earlier local abstractions, not a reconstructed legal
   code, community census, priesthood or historical royal observance.
   See docs/research/1096-bookmark.md for the declaration boundary. */
FBDATA.bookmarkReligions1096 = {
  ghana_local_practice_1096:{
    availability:{bookmarkIds:['1096']},
    name:'Ghana local practice', icon:'☀',
    properties:{legalTradition:'customary',head:null,holyWarTradition:null,
      raidingTradition:false,clergyMarriage:true,religiousPaths:null,
      music:{lineage:['pagan'],fallback:'pagan'},intro:{path:'intro_other'},
      conversionCategory:{name:'Local Traditions',icon:'☀',order:6},
      marriage:{spouseLimit:{m:1,f:1},
        divorce:{kind:'sunder',direct:true,gold:0,piety:0,prestige:5,cooldownDays:0},
        acceptedRelations:['same','in_fold'],kinship:{siblingRite:null}},
      words:{deity:'the sacred powers',cleric:'Ritual keeper',temple:'shrine',
        landed:'Ruler',partnership:'Trade partnership'},
      roles:{monasticM:'Devotee',monasticF:'Devotee',
        priestM:'Ritual keeper',priestF:'Ritual keeper'}}
  },
  niger_traditional_1096:{
    availability:{bookmarkIds:['1096']},
    name:'Middle Niger traditional worship', group:'pagan', relationToParent:'schismatic', icon:'☀',
    properties:{head:null,words:{deity:'the spirits',cleric:'Ritual keeper',temple:'shrine',
      landed:'Ruler',partnership:'Trade partnership'},
      roles:{priestM:'Ritual keeper',priestF:'Ritual keeper'}}
  }
};

/* Extend potential institution authoring only. Existing Jewish households keep
   their primary identity; no congregation, affiliation or office is seeded.
   The composer preserves the profile's doctrine and every other selector. */
FBDATA.bookmarkFaithAvailability1096 = {
  rabbanite:{ bookmarkIds:['1096'] }
};
