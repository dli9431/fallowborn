'use strict';

const { test, expect } = require('../support/fixture');
const { openGame, startDeterministicGame } = require('../support/game');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('sibling courtship trait tooltips show direction without exact modifiers',
  async function ({ page }) {
    const effects = await page.evaluate(function () {
      const chip = document.createElement('button');
      chip.id = 'sibling-courtship-trait-test';
      chip.className = 'traitchip';
      chip.setAttribute('data-trait', 'lustful');
      chip.textContent = 'Lustful';
      chip.style.cssText = 'position:fixed;left:4px;top:4px;z-index:99999';
      document.body.appendChild(chip);
      const authored = [];
      for (const traitId in FBDATA.traits) {
        const courtship = FBDATA.traits[traitId].courtship;
        if (!courtship) continue;
        for (const key in courtship) {
          if (key.indexOf('sibling') !== 0) continue;
          const source = { courtship:{} };
          source.courtship[key] = courtship[key];
          const effect = FB.ui._shared.traitGroupedEffects(source)[0];
          authored.push({ traitId:traitId, key:key, effect:effect });
        }
      }
      return {
        lustful:FB.ui._shared.traitGroupedEffects(FBDATA.traits.lustful),
        chaste:FB.ui._shared.traitGroupedEffects(FBDATA.traits.chaste),
        authored:authored
      };
    });

    expect(effects.lustful).toEqual(expect.arrayContaining([
      { label:'Exceptional sibling approach', value:'Encourages' },
      { label:'Response to a sibling approach', value:'More likely' },
      { label:'Sibling marriage proposal', value:'More likely' }
    ]));
    expect(effects.chaste).toEqual(expect.arrayContaining([
      { label:'Exceptional sibling approach', value:'Discourages' },
      { label:'Response to a sibling approach', value:'Less likely' },
      { label:'Sibling marriage proposal', value:'Less likely' }
    ]));
    expect(effects.authored.length).toBeGreaterThan(0);
    for (const item of effects.authored) {
      expect(item.effect.label).not.toContain('courtship.sibling');
      expect(item.effect.value).toMatch(
        /^(Encourages|Discourages|More likely|Less likely|No effect)$/);
      expect(item.effect.value).not.toMatch(/[0-9%+-]/);
    }

    await page.locator('#sibling-courtship-trait-test').hover();
    const tooltip = page.locator('#tooltip');
    await expect(tooltip).toContainText('Exceptional sibling approach: Encourages');
    await expect(tooltip).toContainText('Response to a sibling approach: More likely');
    await expect(tooltip).toContainText('Sibling marriage proposal: More likely');
    await expect(tooltip).not.toContainText('courtship.sibling');
    await expect(tooltip).not.toContainText('+0.25');
  });

test('traits gate the one sibling approach and target traits cap consent',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const sibling = FB.makeCharacter(s, {
        name:'Alda',
        sex:me.sex === 'm' ? 'f' : 'm',
        culture:me.culture,
        religion:me.religion,
        born:s.date.year - 24,
        dyn:me.dyn,
        role:'sibling',
        fatherId:me.fatherId,
        motherId:me.motherId,
        traits:['lustful'],
        opinion:100
      });
      sibling.homeProvinceId = s.player.provinceId;
      s.player.courtingId = null;
      delete s.player.flags.courting;
      me.betrothedId = null;
      me.traits = ['lustful'];
      const ready = FB.siblingCourtshipStatus(s, sibling);
      const card = FB.ui.characterInteractionCard(s, sibling.id);
      const action = card.actions.filter(function (candidate) {
        return candidate.id === 'relationship.sibling-courtship.approach';
      })[0];

      me.traits = ['chaste'];
      const restrained = FB.siblingCourtshipStatus(s, sibling);
      me.traits = ['lustful'];
      sibling.traits = [];
      const unreceptive = FB.siblingCourtshipStatus(s, sibling);
      sibling.traits = ['cynical'];
      const receptive = FB.siblingCourtshipStatus(s, sibling);
      const ordinary = FB.courtshipStatus(s, sibling, false);
      const oldRng = FB.rng;
      FB.rng = function () { return 0.03; };
      FB.fns.sibling_courtship_approach(s, {
        siblingTargetId:sibling.id,
        siblingRoute:'illicit',
        siblingResponseChance:0.02
      });
      FB.rng = oldRng;
      return {
        degree:ready.degree,
        ready:ready.ready,
        playerScore:ready.traitScore,
        actionEnabled:action && action.enabled,
        actionDetail:action && action.detail,
        restrainedCode:restrained.code,
        restrainedScore:restrained.traitScore,
        unreceptiveChance:unreceptive.acceptance.chance,
        receptiveChance:receptive.acceptance.chance,
        ordinaryCode:ordinary.code,
        closeGate:FB.closeMarriageKinSnapshot(s, me, sibling),
        refusedCode:FB.siblingCourtshipStatus(s, sibling).code
      };
    });

    expect(result.degree).toBe('full_sibling');
    expect(result.ready).toBe(true);
    expect(result.playerScore).toBe(2);
    expect(result.actionEnabled).toBe(true);
    expect(result.actionDetail).toContain('60%');
    expect(result.restrainedCode).toBe('traits');
    expect(result.restrainedScore).toBe(-2);
    expect(result.unreceptiveChance).toBeCloseTo(0.1, 8);
    expect(result.receptiveChance).toBeCloseTo(0.5, 8);
    expect(result.ordinaryCode).toBe('sibling_consent');
    expect(result.closeGate).toBe(true);
    expect(result.refusedCode).toBe('refused');
  });

test('every authored player and target trait modifier follows its conditional route',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const sibling = FB.makeCharacter(s, {
        name:'Trait Ledger',
        sex:me.sex === 'm' ? 'f' : 'm',
        culture:me.culture,
        religion:'catholic',
        born:s.date.year - 24,
        dyn:me.dyn,
        role:'sibling',
        fatherId:me.fatherId,
        motherId:me.motherId,
        traits:[],
        opinion:40
      });
      sibling.homeProvinceId = s.player.provinceId;
      me.religion = 'catholic';
      s.player.courtingId = null;
      delete s.player.flags.courting;
      function playerScore(traits) {
        me.traits = traits;
        return FB.siblingCourtshipStatus(s, sibling).traitScore;
      }
      function targetChance(traits) {
        me.traits = ['lustful'];
        sibling.traits = traits;
        return FB.siblingCourtshipStatus(s, sibling).acceptance.chance;
      }
      const player = {
        lustful:playerScore(['lustful']),
        cynical:playerScore(['cynical']),
        deceitful:playerScore(['deceitful']),
        chaste:playerScore(['chaste']),
        honest:playerScore(['honest']),
        zealousTaboo:playerScore(['zealous']),
        ambitiousWithoutStake:playerScore(['ambitious'])
      };
      sibling.royalLine = { realmId:'trait-ledger', memberId:'sibling' };
      player.ambitiousWithStake = playerScore(['ambitious']);
      delete sibling.royalLine;
      const illicit = {
        lustful:targetChance(['lustful']),
        cynical:targetChance(['cynical']),
        deceitful:targetChance(['deceitful']),
        zealous:targetChance(['zealous']),
        chaste:targetChance(['chaste']),
        honest:targetChance(['honest'])
      };
      sibling.royalLine = { realmId:'trait-ledger', memberId:'sibling' };
      illicit.ambitious = targetChance(['ambitious']);
      illicit.content = targetChance(['content']);
      delete sibling.royalLine;
      me.religion = 'zoroastrian';
      sibling.religion = 'zoroastrian';
      player.zealousRite = playerScore(['zealous']);
      player.letteredRite = playerScore(['literate']);
      const riteZealous = targetChance(['zealous']);
      return { player:player, illicit:illicit, riteZealous:riteZealous };
    });

    expect(result.player).toEqual({
      lustful:2,
      cynical:1,
      deceitful:1,
      chaste:-2,
      honest:-1,
      zealousTaboo:-2,
      ambitiousWithoutStake:0,
      ambitiousWithStake:1,
      zealousRite:1,
      letteredRite:1
    });
    expect(result.illicit.lustful).toBeCloseTo(0.3, 8);
    expect(result.illicit.cynical).toBeCloseTo(0.2, 8);
    expect(result.illicit.deceitful).toBeCloseTo(0.15, 8);
    expect(result.illicit.ambitious).toBeCloseTo(0.2, 8);
    expect(result.illicit.zealous).toBeCloseTo(0.02, 8);
    expect(result.illicit.chaste).toBeCloseTo(0.02, 8);
    expect(result.illicit.content).toBeCloseTo(0.02, 8);
    expect(result.illicit.honest).toBeCloseTo(0.02, 8);
    expect(result.riteZealous).toBeCloseTo(0.3, 8);
  });

test('half siblings remain barred from arranged paths and use the lower child risk',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const otherMother = FB.makeCharacter(s, {
        name:'Other Mother', sex:'f', culture:me.culture,
        religion:me.religion, born:s.date.year - 48, traits:[]
      });
      const half = FB.makeCharacter(s, {
        name:'Half Sibling',
        sex:me.sex === 'm' ? 'f' : 'm',
        culture:me.culture,
        religion:me.religion,
        born:s.date.year - 22,
        dyn:me.dyn,
        role:'sibling',
        fatherId:me.fatherId,
        motherId:otherMother.id,
        traits:['lustful'],
        opinion:100
      });
      half.homeProvinceId = s.player.provinceId;
      me.traits = ['lustful'];
      const degree = FB.kinshipDegreeSnapshot(s, me, half);
      const approach = FB.siblingCourtshipStatus(s, half);

      const spouseParent = FB.makeCharacter(s, {
        name:'Match Parent', sex:me.sex === 'm' ? 'f' : 'm',
        culture:me.culture, religion:me.religion,
        born:s.date.year - 42, traits:[]
      });
      const child = FB.makeCharacter(s, {
        name:'Managed Child', sex:'m', culture:me.culture,
        religion:me.religion, born:s.date.year - 18, dyn:me.dyn,
        fatherId:me.sex === 'm' ? me.id : spouseParent.id,
        motherId:me.sex === 'f' ? me.id : spouseParent.id,
        traits:[]
      });
      me.childrenIds.push(child.id);
      spouseParent.childrenIds.push(child.id);
      const candidate = FB.makeCharacter(s, {
        name:'Forbidden Candidate', sex:'f', culture:me.culture,
        religion:me.religion, born:s.date.year - 18, dyn:me.dyn,
        role:'match',
        fatherId:child.fatherId, motherId:child.motherId,
        traits:[]
      });
      const arranged = FB.kinMatchTerms(s, child, candidate);

      const baby = FB.makeCharacter(s, {
        name:'Half Child', sex:'f', culture:me.culture,
        religion:me.religion, born:s.date.year,
        fatherId:me.sex === 'm' ? me.id : half.id,
        motherId:me.sex === 'f' ? me.id : half.id,
        traits:[]
      });
      baby.health = 7;
      const oldRng = FB.rng;
      FB.rng = function () { return 0.99; };
      const risk = FB.applyCloseKinBirthRisk(s, baby,
        me.sex === 'm' ? me : half,
        me.sex === 'f' ? me : half);
      FB.rng = oldRng;

      const unrelated = FB.makeCharacter(s, {
        name:'Ordinary Match', sex:half.sex, culture:me.culture,
        religion:me.religion, born:s.date.year - 22,
        traits:[], opinion:100
      });
      unrelated.homeProvinceId = s.player.provinceId;
      return {
        degree:degree,
        approach:approach.ready,
        arrangedReason:arranged.reason,
        closeGate:FB.closeMarriageKinSnapshot(s, child, candidate),
        risk:risk.risk,
        ordinary:FB.courtshipStatus(s, unrelated, false).ready
      };
    });

    expect(result.degree).toBe('half_sibling');
    expect(result.approach).toBe(true);
    expect(result.arrangedReason).toBe('kinship');
    expect(result.closeGate).toBe(true);
    expect(result.risk).toBeCloseTo(0.1, 8);
    expect(result.ordinary).toBe(true);
  });

test('lineal and avuncular relations stay blocked while cousins stay ordinary',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const parent = s.chars[me.fatherId];
      const grandparent = FB.makeCharacter(s, {
        name:'Grandparent', sex:'m', culture:me.culture,
        religion:me.religion, born:s.date.year - 68, traits:[]
      });
      const otherGrandparent = FB.makeCharacter(s, {
        name:'Other Grandparent', sex:'f', culture:me.culture,
        religion:me.religion, born:s.date.year - 66, traits:[]
      });
      parent.fatherId = grandparent.id;
      parent.motherId = otherGrandparent.id;
      const avuncular = FB.makeCharacter(s, {
        name:'Uncle', sex:'m', culture:me.culture,
        religion:me.religion, born:s.date.year - 39,
        fatherId:grandparent.id, motherId:otherGrandparent.id,
        traits:[], opinion:100
      });
      const cousinOtherParent = FB.makeCharacter(s, {
        name:'Cousin Parent', sex:'f', culture:me.culture,
        religion:me.religion, born:s.date.year - 38, traits:[]
      });
      const cousin = FB.makeCharacter(s, {
        name:'Cousin', sex:me.sex === 'm' ? 'f' : 'm',
        culture:me.culture, religion:me.religion,
        born:s.date.year - 22, fatherId:avuncular.id,
        motherId:cousinOtherParent.id, traits:[], opinion:100
      });
      cousin.homeProvinceId = s.player.provinceId;
      return {
        parentDegree:FB.kinshipDegreeSnapshot(s, me, parent),
        grandDegree:FB.kinshipDegreeSnapshot(s, me, grandparent),
        avuncularDegree:FB.kinshipDegreeSnapshot(s, me, avuncular),
        cousinDegree:FB.kinshipDegreeSnapshot(s, me, cousin),
        parentCode:FB.courtshipStatus(s, parent, false).code,
        grandCode:FB.courtshipStatus(s, grandparent, false).code,
        avuncularCode:FB.courtshipStatus(s, avuncular, false).code,
        cousinReady:FB.courtshipStatus(s, cousin, false).ready
      };
    });

    expect(result.parentDegree).toBe('parent_child');
    expect(result.grandDegree).toBe('grandparent');
    expect(result.avuncularDegree).toBe('avuncular');
    expect(result.cousinDegree).toBe('cousin');
    expect(result.parentCode).toBe('close_kin');
    expect(result.grandCode).toBe('close_kin');
    expect(result.avuncularCode).toBe('close_kin');
    expect(result.cousinReady).toBe(true);
  });

test('proposal refusal is permanent, breakoff cools down, and probability bounds hold',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      me.religion = 'catholic';
      me.traits = ['lustful'];
      function makeSibling(name) {
        const sibling = FB.makeCharacter(s, {
          name:name,
          sex:me.sex === 'm' ? 'f' : 'm',
          culture:me.culture,
          religion:'catholic',
          born:s.date.year - 24,
          dyn:me.dyn,
          role:'sibling',
          fatherId:me.fatherId,
          motherId:me.motherId,
          traits:['lustful'],
          opinion:100
        });
        sibling.homeProvinceId = s.player.provinceId;
        return sibling;
      }
      function accept(sibling) {
        const key = [String(me.id), String(sibling.id)].sort().join('|');
        s.siblingCourtships[key] = {
          initiatorId:me.id, targetId:sibling.id,
          status:'accepted', route:'illicit',
          approachedTurn:s.turn, acceptedTurn:s.turn, exposed:false
        };
        return key;
      }

      const refusedSibling = makeSibling('Refused Proposal');
      const refusedKey = accept(refusedSibling);
      FB.beginCourtship(s, refusedSibling);
      s.player.prestige = 10000;
      const proposalCap = FB.siblingProposalChance(s, refusedSibling);
      FB.fns.sibling_proposal_refused(s, {});
      const refusedStatus = FB.siblingCourtshipStatus(s, refusedSibling);

      const cooledSibling = makeSibling('Broken Courtship');
      const cooledKey = accept(cooledSibling);
      FB.beginCourtship(s, cooledSibling);
      const turn = s.turn;
      FB.clearCourtship(s, { penalty:true });

      me.skills.int = 100;
      cooledSibling.skills.int = 100;
      me.traits = ['deceitful'];
      cooledSibling.traits = ['deceitful'];
      const exposureFloor = FB.siblingExposureChance(s, cooledSibling);
      FBDATA.traits.exposure_test = {
        name:'Exposure Test', noRandom:true,
        courtship:{ siblingExposure:0.10 }
      };
      me.skills.int = 0;
      cooledSibling.skills.int = 0;
      me.traits = ['exposure_test'];
      cooledSibling.traits = ['exposure_test'];
      const exposureCeiling = FB.siblingExposureChance(s, cooledSibling);
      delete FBDATA.traits.exposure_test;
      const staleSibling = makeSibling('Restored Inactive Courtship');
      const staleKey = accept(staleSibling);
      FB.ensureSiblingCourtships(s);
      return {
        proposalCap:proposalCap,
        refusedRecord:s.siblingCourtships[refusedKey].status,
        refusedCode:refusedStatus.code,
        activeAfterRefusal:s.player.courtingId,
        cooledRecord:s.siblingCourtships[cooledKey],
        reconciledRecord:s.siblingCourtships[staleKey],
        cooldownExpected:turn + 1800,
        exposureFloor:exposureFloor,
        exposureCeiling:exposureCeiling
      };
    });

    expect(result.proposalCap).toBeCloseTo(0.6, 8);
    expect(result.refusedRecord).toBe('refused');
    expect(result.refusedCode).toBe('refused');
    expect(result.activeAfterRefusal).toBeNull();
    expect(result.cooledRecord.status).toBe('cooldown');
    expect(result.cooledRecord.cooldownUntil).toBe(result.cooldownExpected);
    expect(result.reconciledRecord.status).toBe('cooldown');
    expect(result.reconciledRecord.cooldownUntil).toBe(result.cooldownExpected);
    expect(result.exposureFloor).toBeCloseTo(0.04, 8);
    expect(result.exposureCeiling).toBeCloseTo(0.18, 8);
  });

test('xwedodah completes a costed sibling marriage without dynastic benefits',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      me.religion = 'zoroastrian';
      me.traits = ['lustful'];
      const sibling = FB.makeCharacter(s, {
        name:'Denag',
        sex:me.sex === 'm' ? 'f' : 'm',
        culture:me.culture,
        religion:'zoroastrian',
        born:s.date.year - 25,
        dyn:me.dyn,
        role:'sibling',
        fatherId:me.fatherId,
        motherId:me.motherId,
        traits:['zealous'],
        opinion:100
      });
      sibling.royalLine = { realmId:'unused', memberId:'unused' };
      sibling.homeProvinceId = s.player.provinceId;
      const key = [String(me.id), String(sibling.id)].sort().join('|');
      s.siblingCourtships[key] = {
        initiatorId:me.id,
        targetId:sibling.id,
        status:'accepted',
        route:'xwedodah',
        approachedTurn:s.turn,
        acceptedTurn:s.turn,
        exposed:false
      };
      FB.beginCourtship(s, sibling);
      s.player.piety = 100;
      s.player.gold = 100;
      s.player.prestige = 100;
      const status = FB.siblingProposalStatus(s, sibling);
      const proposalAction = FB.ui.characterInteractionCard(s, sibling.id)
        .actions.filter(function (action) {
          return action.id === 'relationship.proposal';
        })[0];
      const married = FB.fns.sibling_marriage_success(s, {});
      return {
        faithErrors:FB.validateReligionData(s),
        istakhr:FB.world.byId.istakhr.religion,
        doctrine:FB.marriageDoctrine('zoroastrian', s).kinship.siblingRite,
        statusReady:status.ready,
        threshold:status.threshold,
        route:status.route,
        proposalDetail:proposalAction.detail,
        proposalConsequence:proposalAction.consequence,
        married:married,
        spouse:sibling.spouseId === me.id,
        gold:s.player.gold,
        piety:s.player.piety,
        prestige:s.player.prestige,
        compact:s.player.royalCompact,
        record:s.siblingCourtships[key],
        scandal:me.traits.indexOf('scandalous_union') >= 0
      };
    });

    expect(result.faithErrors).toEqual([]);
    expect(result.istakhr).toBe('zoroastrian');
    expect(result.doctrine).toBe('xwedodah');
    expect(result.statusReady).toBe(true);
    expect(result.threshold).toBe(80);
    expect(result.route).toBe('xwedodah');
    expect(result.proposalDetail).toContain('+80 Standing');
    expect(result.proposalConsequence).toContain('no dowry');
    expect(result.married).toBe(true);
    expect(result.spouse).toBe(true);
    expect(result.gold).toBe(75);
    expect(result.piety).toBe(25);
    expect(result.prestige).toBe(100);
    expect(result.compact).toBeNull();
    expect(result.record.status).toBe('married');
    expect(result.scandal).toBe(false);
  });

test('an irregular sibling union applies public costs and no dowry or compact',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      me.religion = 'catholic';
      me.traits = ['lustful'];
      const sibling = FB.makeCharacter(s, {
        name:'Matilda',
        sex:me.sex === 'm' ? 'f' : 'm',
        culture:me.culture,
        religion:'catholic',
        born:s.date.year - 25,
        dyn:me.dyn,
        role:'sibling',
        fatherId:me.fatherId,
        motherId:me.motherId,
        traits:['deceitful'],
        opinion:100
      });
      sibling.homeProvinceId = s.player.provinceId;
      const key = [String(me.id), String(sibling.id)].sort().join('|');
      s.siblingCourtships[key] = {
        initiatorId:me.id,
        targetId:sibling.id,
        status:'accepted',
        route:'illicit',
        approachedTurn:s.turn,
        acceptedTurn:s.turn,
        exposed:false
      };
      FB.beginCourtship(s, sibling);
      s.player.piety = 100;
      s.player.gold = 100;
      s.player.prestige = 100;
      s.player.pop = 50;
      const beforeTerms = FB.courtshipTerms(s, sibling, false);
      const married = FB.fns.sibling_marriage_success(s, {});
      return {
        married:married,
        terms:beforeTerms,
        gold:s.player.gold,
        piety:s.player.piety,
        prestige:s.player.prestige,
        voice:s.player.pop,
        playerScandal:me.traits.indexOf('scandalous_union') >= 0,
        targetScandal:sibling.traits.indexOf('scandalous_union') >= 0,
        compact:s.player.royalCompact,
        papalGrounds:s.papacy && s.papacy.grounds[me.id] || []
      };
    });

    expect(result.married).toBe(true);
    expect(result.terms.amount).toBe(0);
    expect(result.gold).toBe(100);
    expect(result.piety).toBe(25);
    expect(result.prestige).toBe(75);
    expect(result.voice).toBe(35);
    expect(result.playerScandal).toBe(true);
    expect(result.targetScandal).toBe(true);
    expect(result.compact).toBeNull();
    expect(result.papalGrounds.some(function (ground) {
      return ground.cause === 'scandalous_union';
    })).toBe(true);
  });

test('exposure, pair records, and close-kin birth provenance are deterministic',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      me.religion = 'catholic';
      me.traits = ['lustful'];
      const sibling = FB.makeCharacter(s, {
        name:'Edith',
        sex:me.sex === 'm' ? 'f' : 'm',
        culture:me.culture,
        religion:'catholic',
        born:s.date.year - 23,
        dyn:me.dyn,
        role:'sibling',
        fatherId:me.fatherId,
        motherId:me.motherId,
        traits:['deceitful'],
        opinion:100
      });
      sibling.homeProvinceId = s.player.provinceId;
      const key = [String(me.id), String(sibling.id)].sort().join('|');
      s.siblingCourtships[key] = {
        initiatorId:me.id,
        targetId:sibling.id,
        status:'accepted',
        route:'illicit',
        approachedTurn:s.turn,
        acceptedTurn:s.turn,
        exposed:false
      };
      FB.beginCourtship(s, sibling);
      const oldRng = FB.rng;
      FB.rng = function () { return 0; };
      const exposed = FB.tickSiblingCourtshipExposure(s);
      const repeated = FB.tickSiblingCourtshipExposure(s);
      const father = me.sex === 'm' ? me : sibling;
      const mother = me.sex === 'f' ? me : sibling;
      const baseBaby = FB.makeCharacter(s, {
        name:'Baseline Child', sex:'m', culture:me.culture,
        religion:me.religion, born:s.date.year, dyn:me.dyn,
        fatherId:father.id, motherId:mother.id, traits:[]
      });
      baseBaby.health = 7;
      FB.rng = function () { return 0.99; };
      const baseRisk = FB.applyCloseKinBirthRisk(
        s, baseBaby, father, mother
      );
      const baby = FB.makeCharacter(s, {
        name:'Child', sex:'f', culture:me.culture, religion:me.religion,
        born:s.date.year, dyn:me.dyn, fatherId:me.sex === 'm' ? me.id : sibling.id,
        motherId:me.sex === 'f' ? me.id : sibling.id, traits:[]
      });
      baby.health = 7;
      father.closeKinParentage = { degree:'full_sibling' };
      mother.closeKinParentage = { degree:'half_sibling' };
      FB.rng = function () { return 0; };
      const provenance = FB.applyCloseKinBirthRisk(s, baby, father, mother);
      FB.rng = oldRng;
      const queued = s.eventQueue.filter(function (entry) {
        return entry.id === 'sibling_courtship_exposed';
      }).length;
      const wire = JSON.parse(FB.save.serialize());
      FB.save.restore(wire);
      const restored = FB.state.siblingCourtships[key];
      return {
        exposed:exposed,
        repeated:repeated,
        queued:queued,
        baseRisk:baseRisk,
        provenance:provenance,
        frail:baby.traits.indexOf('frail') >= 0,
        restored:restored,
        restoredBaby:FB.state.chars[baby.id].closeKinParentage
      };
    });

    expect(result.exposed).toBe(true);
    expect(result.repeated).toBe(false);
    expect(result.queued).toBe(1);
    expect(result.baseRisk.risk).toBeCloseTo(0.2, 8);
    expect(result.baseRisk.outcome).toBe('none');
    expect(result.provenance.risk).toBeCloseTo(0.3, 8);
    expect(result.provenance.outcome).toBe('frail');
    expect(result.frail).toBe(true);
    expect(result.restored.status).toBe('accepted');
    expect(result.restored.exposed).toBe(true);
    expect(result.restoredBaby.risk).toBeCloseTo(0.3, 8);
  });
