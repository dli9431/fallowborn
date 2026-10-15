'use strict';

// Historical policy reuse at an isolated see; this does not publish a new
// Durham opening or claim county-scale borders are episcopal estates.
async function seedLocalInstitution(page, fictional) {
  return page.evaluate(function (fictional) {
    const s = FB.state, E = FB.ecclesiasticalGovernment, bm = FBDATA.bookmarks[s.start.id];
    const rid = fictional ? 'fixture_sanctuary' : 'fixture_durham', pid = 'durham';
    const officeId = rid + '_office', institutionId = rid + '_see', chapterId = rid + '_chapter';
    const faith = fictional ? FB.createFaith(s,{ id:'fixture_sanctuary_faith',name:'Sanctuary Fellowship',group:'catholic',
      properties:{ head:null },systems:{ papacy:false } }) : 'catholic';
    if (!faith) throw new Error('Fixture faith was not accepted');
    bm.systems.enable.push('episcopal_sees');
    // Revisioned worlds resolve these fields from the campaign's revision layer.
    function layer(field) {
      const revisions = bm.revisions || {}, selected = revisions[s.start.revision || 'baseline'];
      if (selected && selected[field] !== undefined) return selected;
      return revisions.baseline && revisions.baseline[field] !== undefined ? revisions.baseline : bm;
    }
    const institutions = layer('localInstitutions'), realms = layer('realms');
    institutions.localInstitutions = Object.assign({},FB.localInstitutionDefinitions(s));
    const sites = FB.world.sitesByProv[pid].list, site = sites[0].site;
    const see = { kind:'see',city:'Durham',site:site,provinceId:pid,culture:'english',religion:faith,
      officeId:officeId,chapterId:chapterId,officeProfile:{ holderSex:fictional ? null : 'm',holderRole:'priest',minAge:30 } };
    institutions.localInstitutions[institutionId] = see;
    institutions.localInstitutions[chapterId] = { kind:'congregation',city:'Chapter',site:site,provinceId:pid,culture:'english',religion:faith };
    const d = { id:rid,name:fictional ? 'Sanctuary institution' : 'Episcopal lordship fixture',capital:pid,rank:1,
      government:'ecclesiastical_principality',religion:faith,
      ecclesiastical:{ profileId:fictional ? 'sanctuary_temporal' : 'durham_temporal',officeId:officeId,institutionId:institutionId },
      ruler:{ name:'Opening prelate',sex:fictional ? 'f' : 'm',born:s.date.year - 45 },liege:fictional ? null : 'england_1204' };
    realms.realms = realms.realms.concat([d]);
    s.realms[rid] = { id:rid,name:d.name,capital:pid,color:'#6b8796',rank:1,alive:true,liege:d.liege,
      religion:faith,aggression:0,op:0,war:null,ruler:{ name:d.ruler.name,sex:d.ruler.sex,born:d.ruler.born,culture:'english',mar:3,generation:1 } };
    s.holder[pid] = rid; s.owner[pid] = d.liege || rid;
    s.authority.governments[rid] = { formId:d.government,sinceTurn:s.turn };
    function cleric(name,sex) {
      const c = FB.makeCharacter(s,{ name:name,sex:sex,culture:'english',religion:faith,born:s.date.year - 40,role:'priest',station:2,quality:1,traitsN:0 });
      c.homeProvinceId = pid; return c;
    }
    const incumbent = cleric(d.ruler.name,d.ruler.sex), replacement = cleric('Next prelate',d.ruler.sex), representative = cleric('Chapter representative','m');
    s.religiousHeads[officeId] = incumbent.id;
    s.localInstitutions = s.localInstitutions || {};
    [institutionId,chapterId].forEach(function (id) {
      s.localInstitutions[id] = { id:id,site:site,representativeId:id === institutionId ? incumbent.id : representative.id,
        standing:{},demands:['provision','protection','courts','tolerance','taxRelief'],consentRights:['mediation'],petitions:{},history:[],rightIds:[] };
      s.localInstitutions[id].standing['realm:' + rid] = 100;
    });
    FB.governments.invalidate(); FB.invalidateRealmCache();
    E.initialize(s,[d]); FB.treasuryInitialize(s); s.realms[rid].treasury.gold = 200;
    s.player.provinceId = pid; s.player.liege = rid;
    FB.localInstitutionSettle(s,chapterId,{ kind:'realm',id:rid },{ provision:true,protection:true,courts:true,tolerance:true,taxRelief:true });
    // Enabling sees exposes other canonical offices; complete their vacancy
    // ledger and refresh fiscal estimates after the staged chapter bargain.
    FB.ensureReligiousHeads(s); FB.treasuryInitialize(s);
    return { rid:rid,pid:pid,officeId:officeId,institutionId:institutionId,chapterId:chapterId,
      incumbent:incumbent.id,replacement:replacement.id,faith:faith };
  },!!fictional);
}

module.exports = { seedLocalInstitution };
