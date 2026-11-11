/* Religious accusations are campaign grounds, never population-faith changes. */
window.FBDATA = window.FBDATA || {};
FBDATA.holyWarCauses = {
  albigensian_protection: {
    schema:1, kind:'protector_heresy', bookmarkId:'1204', religion:'catholic',
    authorityOfficeId:'catholic', kingdomId:'aquitaine',
    name:'Campaign against protectors of heresy',
    desc:'The religious head demands funded religious oversight and public submission. Resistance permits a campaign; only occupied objectives can enter its settlement.',
    firstDate:{year:1209,season:0,day:1}, lastDate:{year:1229,season:3,day:90},
    protectorRealmIds:['toulouse_1204'],
    provinceIds:['toulouse','albi','cahors','rodez','beziers','carcassonne'],
    submission:{gold:80,supportLoss:10},
    ai:{submitChance:0.25,callChance:1}
  }
};
