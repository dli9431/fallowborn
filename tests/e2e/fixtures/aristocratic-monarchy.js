/* Fictional consumer installed before creation, using the shipped generic
   profile and existing map cells. No strategy override or historical claim. */
window.FB_ARISTOCRATIC_FIXTURE = {
  realmId:'dumnonia_476',
  install:function () {
    var b = FBDATA.bookmarks['476'];
    // Revision layers may copy realms, provinces and the opening; edit every layer.
    var layers = [b].concat(Object.keys(b.revisions || {}).map(function (id) { return b.revisions[id]; }));
    var court = {name:'Ash royal court',government:'aristocratic_monarchy',
      aristocraticProfileId:'chartered_court',administrationProfileId:'chartered_provinces',
      ruler:{name:'Aldric',sex:'m',born:440,culture:'brittonic',mar:7,trait:'patient'},
      royalCourt:{dynasty:'Ash',founderId:'ancestor',rulerFatherId:'ancestor',members:[
        {id:'ancestor',name:'Rowan',sex:'m',born:402,alive:false,died:470,culture:'brittonic',religion:'nicene'},
        {id:'royal_sister',name:'Aster',sex:'f',born:442,fatherId:'ancestor',culture:'brittonic',religion:'nicene',homeProvinceId:'exeter'},
        {id:'young_royal',name:'Briar',sex:'m',born:464,fatherId:'ruler',culture:'brittonic',religion:'nicene',homeProvinceId:'exeter'}
      ]}};
    layers.forEach(function (layer) {
      (layer.realms || []).forEach(function (r) { if (r.id === 'dumnonia_476') Object.assign(r,JSON.parse(JSON.stringify(court))); });
      (layer.provinces || []).forEach(function (p) { if (['london','winchester'].indexOf(p.id) >= 0) p.realm = 'dumnonia_476'; });
    });
    var selected = b.revisions && b.revisions[b.revision || 'baseline'];
    var owner = selected && selected.opening !== undefined ? selected : b;
    var opening = JSON.parse(JSON.stringify(FB.bookmark('476').opening));
    Object.assign(opening.actors,{
      alder_elder:{sex:'m',culture:'brittonic',religion:'nicene',born:435,station:3,role:'notable',dyn:'Alder',home:'london',skills:{ste:8,mar:7}},
      alder_heir:{sex:'m',culture:'brittonic',religion:'nicene',born:454,station:2,role:'notable',dyn:'Alder',home:'london',father:'alder_elder',skills:{ste:7,mar:7}},
      reed_elder:{sex:'f',culture:'brittonic',religion:'nicene',born:433,station:3,role:'notable',dyn:'Reed',home:'winchester',skills:{ste:8,mar:6}},
      reed_heir:{sex:'f',culture:'brittonic',religion:'nicene',born:453,station:2,role:'notable',dyn:'Reed',home:'winchester',mother:'reed_elder',skills:{ste:7,mar:6}}
    });
    opening.estates.push({id:'alder_estate',actorId:'alder_elder',provinceId:'london',share0:1000,basis:'tenure',evidence:'fictional_alder_estate'},
      {id:'reed_estate',actorId:'reed_elder',provinceId:'winchester',share0:1000,basis:'tenure',evidence:'fictional_reed_estate'});
    owner.openingRevision = 'fictional_aristocratic_v1';
    owner.openingRevisions = Object.assign({},owner.openingRevisions,{fictional_aristocratic_v1:opening});
    owner.opening = opening;
    FB.governments.invalidate();
  }
};
