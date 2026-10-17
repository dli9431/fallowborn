/* Local-practice presentation for the spring 1241 opening. The complete dated
   bookmark publishes detached copies into the ordinary religions catalogue.
   Loading this file alone changes no effective faith or existing world.
   These inherited settings are simulation assumptions, not a reconstructed
   local legal code, priesthood, population census or royal observance.
   See docs/research/1241-bookmark.md for the declaration boundary. */
FBDATA.bookmarkReligions1241 = {
  sahel_local_practice_1241:{
    availability:{bookmarkIds:['1241']},
    name:'Sahelian local practices',
    properties:{head:null,legalTradition:'customary',holyWarTradition:null,
      clergyMarriage:true,
      marriage:{spouseLimit:{m:1,f:1},kinship:{siblingRite:null},
        acceptedRelations:['same','in_fold'],
        divorce:{kind:'sunder',direct:true,gold:0,piety:0,prestige:5,cooldownDays:0}},
      words:{deity:'the sacred powers',cleric:'ritual keeper',temple:'shrine',
        landed:'Elder',partnership:'Trade partnership'},
      roles:{monasticM:'Devotee',monasticF:'Devotee',
        priestM:'Ritual keeper',priestF:'Ritual keeper'},
      conversionCategory:{name:'Local Traditions',icon:'☀',order:3},
      intro:{path:'intro_other'},religiousPaths:null}
  }
};
