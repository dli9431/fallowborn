'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame
} = require('../support/game');

function primaryFileOnly(testInfo) {
  test.skip(testInfo.project.name !== 'chromium-file',
    'The faith-graph probes run against the primary file target.');
}

test('legacy religion heads and title tables compile through compatibility aliases',
  async function ({ page }, testInfo) {
    primaryFileOnly(testInfo);
    await openGame(page, testInfo);

    const result = await page.evaluate(function () {
      FB.mods.apply({
        religions:{
          western_custom:{
            name:'Western Custom', group:'christian', icon:'+',
            head:{ realm:'papacy', title:'Archpope' }
          }
        },
        titles:{
          christian:['Bondman','Yeoman','Notable','Lord','Earl','Prince','Rex','Caesar']
        }
      });
      var errors = FB.configureReligions();
      var faith = FB.religionOf('western_custom', null);
      return {
        errors:errors,
        office:faith.head.officeId,
        wives:FB.marriageDoctrine('western_custom', null).wives,
        king:faith.rankTitles.m[6],
        female:faith.rankTitles.f[6]
      };
    });

    expect(result).toEqual({
      errors:[],
      office:'western_custom',
      wives:1,
      king:'Rex',
      female:'Queen'
    });
  });

test('sex-gated central offices vacate without blocking secular succession',
  async function ({ page }, testInfo) {
    primaryFileOnly(testInfo);
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      var s = FB.state;
      var rid = s.religiousHeads.sunni;
      var realm = rid && s.realms[rid];
      var succession = realm && realm.succession;
      var heirId = succession && succession.order[0];
      var heir = heirId && FB.materializeRoyalChild(s, rid, heirId);
      var member = heirId && succession.members[heirId];
      if (!realm || !heir || !member) return { skipped:true };

      /* Make the first heir a woman without changing the realm's ordinary
         dynastic order. The temporal crown should still pass to her. */
      member.sex = 'f';
      heir.sex = 'f';
      succession.order = [heirId];
      succession.heirId = heirId;
      var advanced = FB.advanceRealmSuccession(s, rid);
      var ruler = FB.realmRulerCharacterSnapshot(s, rid);

      var me = s.chars[s.player.charId];
      var oldPlayerRealm = s.realms.player;
      var oldTier = s.player.tier;
      var oldReligion = me.religion;
      var oldSex = me.sex;
      s.realms.player = {
        id:'player', alive:true, liege:null, ruler:{ sex:'f' }
      };
      s.player.tier = 6;
      me.religion = 'sunni';
      me.sex = 'f';
      var femaleClaim = FB.caliphateWarClaimantEligible(s);
      s.realms.player.ruler.sex = 'm';
      me.sex = 'm';
      var maleClaim = FB.caliphateWarClaimantEligible(s);
      s.realms.player = oldPlayerRealm;
      s.player.tier = oldTier;
      me.religion = oldReligion;
      me.sex = oldSex;

      return {
        skipped:false,
        catholicPolicy:FB.religionOf('catholic', s).head.holderSex,
        sunniPolicy:FB.religionOf('sunni', s).head.holderSex,
        advanced:!!advanced,
        temporalSuccessor:ruler && ruler.id === heir.id && ruler.sex,
        officeVacant:s.religiousHeads.sunni === null,
        noOfficeSnapshot:FB.religiousHeadSnapshot(s, 'sunni') === null,
        noCaliphStyle:FB.realmRankTitle(s, realm) !== 'Caliph',
        cannotReassign:!FB.assignReligiousHead(s, 'sunni', rid),
        femaleClaim:femaleClaim,
        maleClaim:maleClaim
      };
    });

    expect(result.skipped).toBe(false);
    expect(result.catholicPolicy).toBe('m');
    expect(result.sunniPolicy).toBe('m');
    expect(result.advanced).toBe(true);
    expect(result.temporalSuccessor).toBe('f');
    expect(result.officeVacant).toBe(true);
    expect(result.noOfficeSnapshot).toBe(true);
    expect(result.noCaliphStyle).toBe(true);
    expect(result.cannotReassign).toBe(true);
    expect(result.femaleClaim).toBe(false);
    expect(result.maleClaim).toBe(true);
  });

test('faith definitions inherit doctrines and support directional relations',
  async function ({ page }, testInfo) {
    primaryFileOnly(testInfo);
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      var s = FB.state;
      var me = s.chars[s.player.charId];
      var originalFaith = me.religion;
      var id = FB.createFaith(s, {
        id:'rouen_concord',
        name:'Concord of Rouen',
        group:'catholic',
        relationToParent:{ childView:'in_fold', parentView:'schismatic' },
        properties:{
          marriage:{ spouseLimit:{ m:3 } },
          words:{ cleric:'rector' },
          roles:{ monasticF:'Anchorite' },
          systems:{ papacy:false },
          head:null
        }
      });
      me.religion = id;
      var originalProfession = s.player.profession;
      s.player.profession = 'monk';
      var religiousTitle = FB.titleFor(s);
      s.player.profession = originalProfession;
      var answer = {
        errors:FB.validateReligionData(s),
        id:id,
        christianAssignable:FB.faithAssignable('christian', s),
        muslimAssignable:FB.faithAssignable('muslim', s),
        ashariAssignable:FB.faithAssignable('ashari', s),
        ashariLineage:FB.faithLineage('ashari', s),
        ashariSunni:FB.faithRelation(s, 'ashari', 'sunni'),
        sunniAshari:FB.faithRelation(s, 'sunni', 'ashari'),
        schools:FB.faithRelation(s, 'ashari', 'maturidi'),
        office:FB.faithOfficeId('ashari', s),
        lineage:FB.faithLineage(id, s),
        group:FB.faithGroup(id, s),
        doctrine:FB.marriageDoctrine(id, s),
        cleric:FB.faithValue(s, id, 'words.cleric'),
        head:FB.religionOf(id, s).head,
        papacy:FB.faithHasSystem(id, 'papacy', s),
        childView:FB.faithRelation(s, id, 'catholic'),
        parentView:FB.faithRelation(s, 'catholic', id),
        childMarriage:FB.faithAllowsMarriage(s, id, 'catholic'),
        parentMarriage:FB.faithAllowsMarriage(s, 'catholic', id),
        baselines:{
          same:FB.faithRelationBaseline(s, 'catholic', 'catholic'),
          inFold:FB.faithRelationBaseline(s, 'ashari', 'sunni'),
          schismatic:FB.faithRelationBaseline(s, 'catholic', 'orthodox'),
          foreign:FB.faithRelationBaseline(s, 'catholic', 'sunni'),
          childView:FB.faithRelationBaseline(s, id, 'catholic'),
          parentView:FB.faithRelationBaseline(s, 'catholic', id)
        },
        ancestorBranch:FB.faithBranch(s, id, {
          catholic:'parent', christian:'family', default:'default'
        }),
        christianTrigger:FB.checkTrigger(s, { religionGroup:'christian' }),
        catholicTrigger:FB.checkTrigger(s, { religionGroup:'catholic' }),
        muslimTrigger:FB.checkTrigger(s, { religionGroup:'muslim' }),
        religiousTitle:religiousTitle,
        title:FB.titleWordFor(s, 6),
        missingParent:FB.createFaith(s, {
          id:'broken_concord', name:'Broken Concord', group:'missing_faith'
        }),
        nonJson:FB.createFaith(s, {
          id:'function_concord', name:'Function Concord', group:'catholic',
          properties:{ calculate:function () { return 3; } }
        })
      };
      me.religion = originalFaith;
      return answer;
    });

    expect(result.errors).toEqual([]);
    expect(result.id).toBe('rouen_concord');
    expect(result.christianAssignable).toBe(false);
    expect(result.muslimAssignable).toBe(false);
    expect(result.ashariAssignable).toBe(true);
    expect(result.ashariLineage).toEqual(['ashari', 'sunni', 'muslim']);
    expect(result.ashariSunni).toBe('in_fold');
    expect(result.sunniAshari).toBe('in_fold');
    expect(result.schools).toBe('in_fold');
    expect(result.office).toBe('sunni');
    expect(result.lineage).toEqual([
      'rouen_concord', 'catholic', 'christian'
    ]);
    expect(result.group).toBe('christian');
    expect(result.doctrine.spouseLimit).toEqual({ m:3, f:1 });
    expect(result.doctrine.end.kind).toBe('annulment');
    expect(result.cleric).toEqual({ value:'rector', sourceId:'rouen_concord' });
    expect(result.head).toBe(null);
    expect(result.papacy).toBe(false);
    expect(result.childView).toBe('in_fold');
    expect(result.parentView).toBe('schismatic');
    expect(result.childMarriage).toBe(true);
    expect(result.parentMarriage).toBe(false);
    expect(result.baselines).toEqual({
      same:15,
      inFold:10,
      schismatic:5,
      foreign:-10,
      childView:10,
      parentView:5
    });
    expect(result.ancestorBranch).toEqual({ branch:'catholic', value:'parent' });
    expect(result.christianTrigger).toBe(true);
    expect(result.catholicTrigger).toBe(true);
    expect(result.muslimTrigger).toBe(false);
    expect(result.religiousTitle).toBe('Anchorite');
    expect(result.title).toBe('Queen');
    expect(result.missingParent).toBe(null);
    expect(result.nonJson).toBe(null);
  });

test('runtime faiths and relations round-trip while old v3 saves self-heal',
  async function ({ page }, testInfo) {
    primaryFileOnly(testInfo);
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      var baseline = JSON.parse(FB.save.serialize());
      var originalFaith = FB.state.chars[FB.state.player.charId].religion;
      var ctx = {};
      FB.applyEffects(FB.state, {
        foundFaith:{
          definition:{
            id:'living_way',
            name:'The Living Way',
            group:'$current',
            relationToParent:'in_fold',
            properties:{ marriage:{ spouseLimit:{ m:2 } } }
          },
          convertHousehold:true,
          convertRealm:true
        }
      }, ctx);
      var createdId = ctx.faithId;
      var obedientId = FB.foundFaith(FB.state, {
        id:'roman_fellowship',
        name:'Roman Fellowship',
        group:originalFaith,
        relationToParent:'in_fold',
        properties:{ head:{} }
      }, { convertFounder:false });
      FB.applyEffects(FB.state, {
        faithRelation:{
          observer:'$current', target:'orthodox', status:'hostile'
        }
      }, ctx);
      var saved = JSON.parse(FB.save.serialize());
      var savedTitle = FB.renderTitleSnapshot(saved.meta.titleData);
      FB.save.restore(JSON.parse(JSON.stringify(saved)));
      var restoredMe = FB.state.chars[FB.state.player.charId];
      FB.addTrait(restoredMe, 'excommunicated');
      var absolution = FB.papalAbsolutionStatus(FB.state, restoredMe.id);
      var restored = {
        version:saved.v,
        stored:!!saved.state.faiths.living_way,
        playerFaith:FB.state.chars[FB.state.player.charId].religion,
        lineage:FB.faithLineage(createdId, FB.state),
        name:FB.religionOf(createdId, FB.state).name,
        wives:FB.marriageDoctrine(createdId, FB.state).wives,
        relation:FB.faithRelation(FB.state, createdId, 'orthodox'),
        office:FB.faithOfficeId(createdId, FB.state),
        papacy:FB.faithHasSystem(createdId, 'papacy', FB.state),
        headSource:FB.faithValue(FB.state, createdId, 'head').sourceId,
        obedience:FB.papalObedienceForCharacter(FB.state, restoredMe),
        recognizedPope:FB.popeRecognizedBy(FB.state, restoredMe),
        absolutionReason:absolution.reason,
        absolutionShown:FB.instantStatus(FB.state, 'seek_absolution').shown,
        obedientOffice:FB.faithOfficeId(obedientId, FB.state),
        obedientPapacy:FB.faithHasSystem(obedientId, 'papacy', FB.state),
        title:savedTitle
      };

      delete baseline.state.faiths;
      delete baseline.state.faithRelations;
      delete baseline.state.faithNextId;
      FB.save.restore(JSON.parse(JSON.stringify(baseline)));
      var old = {
        faiths:FB.state.faiths,
        relations:FB.state.faithRelations,
        next:FB.state.faithNextId,
        playerFaith:FB.state.chars[FB.state.player.charId].religion,
        heads:FB.state.religiousHeads,
        oldTitle:FB.renderTitleSnapshot({ group:'muslim_f', tier:6 })
      };
      return {
        originalFaith:originalFaith,
        createdId:createdId,
        restored:restored,
        old:old,
        baselineHeads:baseline.state.religiousHeads
      };
    });

    expect(result.createdId).toBe('living_way');
    expect(result.restored.version).toBe(3);
    expect(result.restored.stored).toBe(true);
    expect(result.restored.playerFaith).toBe('living_way');
    expect(result.restored.lineage).toEqual([
      'living_way', result.originalFaith, 'christian'
    ]);
    expect(result.restored.name).toBe('The Living Way');
    expect(result.restored.wives).toBe(2);
    expect(result.restored.relation).toBe('hostile');
    expect(result.restored.office).toBe(null);
    expect(result.restored.papacy).toBe(false);
    expect(result.restored.headSource).toBe('living_way');
    expect(result.restored.obedience).toBe(null);
    expect(result.restored.recognizedPope).toBe(null);
    expect(result.restored.absolutionReason).toBe(
      'This faith does not recognize Papal authority.');
    expect(result.restored.absolutionShown).toBe(false);
    expect(result.restored.obedientOffice).toBe('catholic');
    expect(result.restored.obedientPapacy).toBe(true);
    expect(result.restored.title).toBe('Freeholder');
    expect(result.old.faiths).toEqual({});
    expect(result.old.relations).toEqual({});
    expect(result.old.next).toBe(1);
    expect(result.old.playerFaith).toBe(result.originalFaith);
    expect(result.old.heads).toEqual(result.baselineHeads);
    expect(result.old.oldTitle).toBe('Sultana');
  });

test('faith details explain a campaign branch, lineage, doctrine, and authority',
  async function ({ page }, testInfo) {
    primaryFileOnly(testInfo);
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    await page.evaluate(function () {
      var s = FB.state;
      FB.foundFaith(s, {
        id:'living_way',
        name:'The Living Way',
        icon:'◇',
        group:'$current',
        relationToParent:'in_fold',
        properties:{ marriage:{ spouseLimit:{ m:2 } } }
      }, { convertHousehold:true, convertRealm:true });
      FB.ui.showTab('char');
      FB.ui.refresh();
    });

    const faithButton = page.locator('#self-faith-details');
    await expect(faithButton).toContainText('◇ The Living Way');
    await expect(page.locator('#tb-piety')).toContainText('◇');
    const headRow = page.locator(
      '#tab-char .kv:has(span:text-is("Religious head")) b');
    await expect(headRow).toContainText('None');
    await expect(headRow).toContainText('Pope');

    await faithButton.click();
    await expect(page.locator('#gm-title')).toContainText('The Living Way');
    const body = page.locator('#gm-body');
    await expect(body).toContainText('a new community gathered around');
    await expect(body).toContainText('from Latin Christianity');
    await expect(body).toContainText('The Living Way took shape');
    await expect(body).not.toContainText('event or mod');
    await expect(body).not.toContainText('during this campaign');
    await expect(body).toContainText('Founded branch');
    await expect(body).toContainText(
      'The Living Way › Latin Christianity › Christianity');
    await expect(body).toContainText('In communion');
    await expect(body).toContainText('does not recognize the Pope');
    await expect(body).toContainText('Spouse limits (men / women)');
    await expect(body).toContainText('2 / 1');
    await expect(body).toContainText('Marriage rules from');
    await expect(body).toContainText('The Living Way');
    const close = body.locator(
      ':scope > .gm-footer > #faith-details-close');
    await expect(close).toBeVisible();
    const closeBox = await close.boundingBox();
    expect(closeBox.width).toBeGreaterThanOrEqual(199);
    expect(closeBox.height).toBeGreaterThanOrEqual(52);
  });
