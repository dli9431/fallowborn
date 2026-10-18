/* Regional transmission windows are simulation schedules, not invention dates. */
window.FBDATA = window.FBDATA || {};

FBDATA.techCorrections_transmission = {
  paper_making:{
    name:'Papermaking', icon:'📄', domain:'crafts', cost:50, req:[],
    history:{ attested:[650,950], adoption:{
      default:[760,1010], latin:[780,1030], byzantine:[760,1010], islamic:[750,950],
      persianate:[650,800], slavic:[795,1045], nordic:[800,1050], steppe:[790,1040],
      baltic_finnic:[815,1065], caucasian:[785,1035], northeast_african:[795,1045]
    } },
    desc:'Pulped fibers formed in molds provide a cheaper writing surface.',
    confidence:'high', sources:['BLOOM','SINGER'],
    unlocks:['rule:paper_supply'], capabilities:[], fx:{ research:0.1 }
  }
};

(function () {
  'use strict';
  Object.keys(FBDATA.techCorrections_transmission).forEach(function (id) {
    if (!Object.prototype.hasOwnProperty.call(FBDATA.tech,id))
      throw new Error('Missing transmission technology correction target: ' + id);
    FBDATA.tech[id] = JSON.parse(JSON.stringify(FBDATA.techCorrections_transmission[id]));
  });
})();
